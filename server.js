const express=require('express'),crypto=require('crypto'),fs=require('fs'),path=require('path');
const E=process.env,PORT=E.PORT||3000,SECRET=E.SESSION_SECRET,PASS=E.ADMIN_PASSWORD,USER=E.ADMIN_USER||'admin';
if(!SECRET||!PASS){console.error('Set ADMIN_PASSWORD and SESSION_SECRET (see .env.example).');process.exit(1)}
const FILE=path.join(E.DATA_DIR||path.join(__dirname,'data'),'db.json');
fs.mkdirSync(path.dirname(FILE),{recursive:true});
const SEED=[['Notion Finance Planner','Templates',49000,'Budget, savings goals and monthly review in one Notion workspace.'],['Lightroom Preset Bundle','Presets',59000,'20 mobile and desktop presets for warm, rich portraits.'],['Freelance Contract Kit','Ebooks',39000,'Editable contracts, invoices and a pricing guide for freelancers.'],['Reels Cover Pack','Templates',35000,'50 editable cover designs for Instagram Reels and TikTok.']].map(([name,category,price,desc],i)=>({id:'p'+(i+1),name,category,price,desc,link:''}));
let db=fs.existsSync(FILE)?JSON.parse(fs.readFileSync(FILE,'utf8')):{products:SEED,orders:[]};
const save=()=>{fs.writeFileSync(FILE+'.tmp',JSON.stringify(db));fs.renameSync(FILE+'.tmp',FILE)};save();

const rp=n=>'Rp '+Number(n).toLocaleString('id-ID');
const h=s=>crypto.createHash('sha256').update(String(s)).digest();
const same=(a,b)=>crypto.timingSafeEqual(h(a),h(b));
const sign=v=>crypto.createHmac('sha256',SECRET).update(v).digest('base64url');
const mint=()=>{const b=Buffer.from(JSON.stringify({exp:Date.now()+7*864e5})).toString('base64url');return b+'.'+sign(b)};
const valid=t=>{if(!t)return false;const[b,s]=t.split('.');if(!b||!s||!same(s,sign(b)))return false;try{return JSON.parse(Buffer.from(b,'base64url')).exp>Date.now()}catch{return false}};
const cookie=(req,k)=>(req.headers.cookie||'').split(/;\s*/).map(c=>c.split('=')).find(c=>c[0]===k)?.[1];
const auth=(q,r,n)=>valid(cookie(q,'sid'))?n():r.status(401).json({error:'Sign in required.'});
const hits=new Map();
const limited=(k,max,ms)=>{const t=(hits.get(k)||[]).filter(x=>Date.now()-x<ms);t.push(Date.now());hits.set(k,t);return t.length>max};

const sse=new Set();
async function notify(text){
  sse.forEach(r=>r.write('data: '+JSON.stringify({text})+'\n\n'));
  const jobs=[];
  if(E.TELEGRAM_BOT_TOKEN&&E.TELEGRAM_CHAT_ID)jobs.push(fetch('https://api.telegram.org/bot'+E.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:E.TELEGRAM_CHAT_ID,text})}));
  if(E.FONNTE_TOKEN&&E.ADMIN_WHATSAPP)jobs.push(fetch('https://api.fonnte.com/send',{method:'POST',headers:{Authorization:E.FONNTE_TOKEN},body:new URLSearchParams({target:E.ADMIN_WHATSAPP,message:text})}));
  (await Promise.allSettled(jobs)).forEach(x=>x.status==='rejected'&&console.error('Notify failed:',x.reason?.message));
}

const app=express();app.set('trust proxy',1);app.use(express.json({limit:'20kb'}));
app.use((q,r,n)=>{r.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});n()});

/* Public API */
const view=o=>({id:o.id,items:o.items,total:o.total,code:o.code,status:o.status,at:o.at,delivery:o.status==='done'?o.delivery:''});
const own=q=>{const o=db.orders.find(x=>x.id===q.params.id);return o&&typeof q.query.token==='string'&&same(o.token,q.query.token)?o:null};
app.get('/api/products',(q,r)=>r.json(db.products.map(({link,...p})=>p)));
app.post('/api/orders',(q,r)=>{
  if(limited('o'+q.ip,10,36e5))return r.status(429).json({error:'Too many orders. Try again later.'});
  const b=q.body||{},name=String(b.name||'').trim().slice(0,80),contact=String(b.contact||'').trim().slice(0,80);
  const ids=[...new Set(Array.isArray(b.items)?b.items:[])].slice(0,20);
  const items=ids.map(id=>db.products.find(p=>p.id===id)).filter(Boolean).map(p=>({id:p.id,name:p.name,price:p.price}));
  if(!name||!contact||!items.length)return r.status(400).json({error:'Enter your name, contact and at least one product.'});
  const sub=items.reduce((s,i)=>s+i.price,0),open=new Set(db.orders.filter(o=>o.status==='pending'||o.status==='claimed').map(o=>o.total));
  let code,total;for(let i=0;i<30;i++){code=1+crypto.randomInt(99);total=sub+code;if(!open.has(total))break}
  const o={id:'JS-'+crypto.randomBytes(3).toString('hex').toUpperCase(),token:crypto.randomBytes(16).toString('hex'),items,sub,code,total,name,contact,status:'pending',at:Date.now(),delivery:''};
  db.orders.unshift(o);save();
  notify('New order '+o.id+'\n'+name+' ('+contact+')\n'+items.map(i=>i.name).join(', ')+'\nExpect '+rp(total));
  r.json({...view(o),token:o.token});
});
app.get('/api/orders/:id',(q,r)=>{const o=own(q);o?r.json(view(o)):r.status(404).json({error:'Order not found.'})});
app.post('/api/orders/:id/paid',(q,r)=>{const o=own(q);if(!o)return r.status(404).json({error:'Order not found.'});
  if(o.status==='pending'){o.status='claimed';save();notify(o.name+' says order '+o.id+' is paid ('+rp(o.total)+'). Check your balance, then confirm in the dashboard.')}
  r.json(view(o))});

/* Admin API */
app.post('/api/admin/login',(q,r)=>{
  if(limited('l'+q.ip,8,6e5))return r.status(429).json({error:'Too many attempts. Try again in 10 minutes.'});
  const{username,password}=q.body||{},u=same(String(username||'').toLowerCase(),USER.toLowerCase()),p=same(password||'',PASS);
  if(!(u&&p))return r.status(401).json({error:'Username or password is incorrect.'});
  r.set('Set-Cookie','sid='+mint()+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800'+(E.NODE_ENV==='production'?'; Secure':''));r.json({ok:true})});
app.post('/api/admin/logout',(q,r)=>{r.set('Set-Cookie','sid=; HttpOnly; Path=/; Max-Age=0');r.json({ok:true})});
app.get('/api/admin/me',auth,(q,r)=>r.json({ok:true}));
app.get('/api/admin/orders',auth,(q,r)=>r.json(db.orders.map(({token,...o})=>({...o,items:o.items.map(i=>({...i,link:db.products.find(p=>p.id===i.id)?.link||''}))}))));
app.get('/api/admin/products',auth,(q,r)=>r.json(db.products));
app.post('/api/admin/orders/:id',auth,(q,r)=>{const o=db.orders.find(x=>x.id===q.params.id),{status,delivery}=q.body||{};
  if(!o||!['done','cancelled'].includes(status))return r.status(400).json({error:'Invalid request.'});
  if(status==='done'&&!String(delivery||'').trim())return r.status(400).json({error:'Add a download link or note first.'});
  o.status=status;if(delivery)o.delivery=String(delivery).slice(0,1000);save();r.json({ok:true})});
app.post('/api/admin/products',auth,(q,r)=>{const b=q.body||{},price=Math.round(+b.price);
  if(!b.name||!b.category||!(price>0))return r.status(400).json({error:'Name, category and price are required.'});
  db.products.push({id:'p'+Date.now().toString(36),name:String(b.name).slice(0,80),category:String(b.category).slice(0,40),price,desc:String(b.desc||'').slice(0,300),link:String(b.link||'').slice(0,500)});save();r.json({ok:true})});
app.delete('/api/admin/products/:id',auth,(q,r)=>{db.products=db.products.filter(p=>p.id!==q.params.id);save();r.json({ok:true})});
app.get('/api/admin/stream',auth,(q,r)=>{r.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});r.flushHeaders();r.write(': ok\n\n');sse.add(r);q.on('close',()=>sse.delete(r))});
setInterval(()=>sse.forEach(r=>r.write(': ping\n\n')),25000);

app.use(express.static(path.join(__dirname,'public'),{extensions:['html']}));
app.listen(PORT,()=>console.log('JOY STORE running on port '+PORT));
