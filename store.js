const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp=n=>'Rp '+Number(n).toLocaleString('id-ID');
const LBL={pending:'Waiting for payment',claimed:'Waiting for the store to confirm',done:'Delivered',cancelled:'Cancelled'};
const lnk=s=>esc(s).replace(/https?:\/\/\S+/g,u=>'<a href="'+u+'" target="_blank" rel="noopener">'+u+'</a>');
const ls=(k,v)=>{try{return v===undefined?localStorage.getItem(k):localStorage.setItem(k,v)}catch(e){}};
const saved=()=>{try{return JSON.parse(ls('js_orders')||'[]')}catch(e){return[]}};
let products=[],cart=[],cat='All',q='',pv='cart',pay=null,cache={};
const api=async(u,b)=>{const r=await fetch(u,b?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}:undefined);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Something went wrong. Try again.');return d};
function toast(m){const t=$('#ts');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),3500)}

function renderGrid(){
 const cats=['All',...new Set(products.map(p=>p.category).filter(Boolean))];
 $('#chips').innerHTML=cats.map(c=>`<button class="chip${c===cat?' on':''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
 const L=products.filter(p=>(cat==='All'||p.category===cat)&&((p.name||'')+' '+(p.desc||'')).toLowerCase().includes(q));
 $('#grid').innerHTML=L.length?L.map(p=>{const i=cart.includes(p.id);return `<article class="card"><div class="ic">${esc((p.name||'?')[0])}</div><h3>${esc(p.name)}</h3><span class="mut">${esc(p.category)}</span><p>${esc(p.desc)}</p><div class="row"><b class="pr">${rp(p.price)}</b><button class="btn sm" data-a="${p.id}"${i?' disabled':''}>${i?'In cart':'Add to cart'}</button></div></article>`}).join(''):'<p class="mut">No products to show yet.</p>';
 $('#cn').textContent=cart.length}
async function sync(id){const s=saved().find(x=>x.id===id);if(!s)return;try{cache[id]={...await api('/api/orders/'+id+'?token='+s.token),token:s.token}}catch(e){}}
async function openPanel(v,id){pv=v;if(id)pay=id;$('#ov').style.display='block';
 if(v==='orders'){$('#pb').innerHTML='<p class="mut">Loading…</p>';await Promise.all(saved().map(s=>sync(s.id)))}
 if(v==='pay')await sync(pay);renderPanel()}
function renderPanel(){if($('#ov').style.display!=='block')return;const b=$('#pb');
 if(pv==='cart'){const L=cart.map(id=>products.find(p=>p.id===id)).filter(Boolean),t=L.reduce((s,p)=>s+p.price,0);
  b.innerHTML='<h2>Your cart</h2>'+(L.length?L.map(p=>`<div class="row pl"><span>${esc(p.name)}<br><b>${rp(p.price)}</b></span><button class="btn sm ghost" data-rm="${p.id}">Remove</button></div>`).join('')+`<p class="row"><span>Subtotal</span><b>${rp(t)}</b></p><label>Your name<input id="nm" autocomplete="name"></label><label>WhatsApp number or email for delivery<input id="ct"></label><p class="er" id="pe" role="alert"></p><button class="btn w" data-go="1">Place order and pay with QRIS</button>`:'<p class="mut">Your cart is empty. Add a product to get started.</p>')}
 else if(pv==='pay'){const o=cache[pay];if(!o){b.innerHTML='<p>Order not found.</p>';return}
  b.innerHTML=`<h2>Pay with QRIS</h2><p class="mut">Order ${esc(o.id)}</p>`+(o.status==='done'?`<p><span class="pill done">Payment confirmed</span></p><p>${lnk(o.delivery)}</p>`:o.status==='cancelled'?'<p>This order was cancelled.</p>':`<p>Scan the code with any QRIS app and pay exactly:</p><div class="amt"><b>${rp(o.total)}</b><button class="btn sm ghost" data-cp="${o.total}">Copy</button></div><p class="mut">The total includes unique code ${o.code}, which lets the store match your payment.</p><img class="qr" src="/qris.png" alt="QRIS code for paying JOY STORE">${o.status==='pending'?'<button class="btn w" data-paid="1">I’ve paid</button>':'<p><span class="pill claimed">Waiting for the store to confirm</span></p>'}`)}
 else{const L=saved().map(s=>cache[s.id]).filter(Boolean);
  b.innerHTML='<h2>My orders</h2>'+(L.length?L.map(o=>`<div class="pl"><div class="row"><b>${esc(o.id)}</b><span class="pill ${o.status}">${LBL[o.status]}</span></div><p class="mut" style="margin:4px 0">${o.items.map(i=>esc(i.name)).join(', ')}<br>${rp(o.total)}</p>${o.status==='done'?'<p>'+lnk(o.delivery)+'</p>':o.status==='cancelled'?'':`<button class="btn sm" data-op="${o.id}">Open payment</button>`}</div>`).join(''):'<p class="mut">No orders yet. Orders placed on this device show up here.</p>')}}
async function place(){const n=$('#nm').value.trim(),c=$('#ct').value.trim(),e=m=>$('#pe').textContent=m;
 if(!n||!c)return e('Enter your name and a WhatsApp number or email.');
 try{const o=await api('/api/orders',{name:n,contact:c,items:cart});ls('js_orders',JSON.stringify([{id:o.id,token:o.token},...saved()]));cache[o.id]=o;cart=[];renderGrid();openPanel('pay',o.id)}catch(x){e(x.message)}}
async function claim(){try{await api('/api/orders/'+pay+'/paid?token='+cache[pay].token,{});await sync(pay);renderPanel()}catch(e){toast(e.message)}}

document.addEventListener('click',e=>{
 if(e.target.id==='ov'||e.target.id==='px'){$('#ov').style.display='none';return}
 const t=e.target.closest('button');if(!t)return;const d=t.dataset;
 if(d.c!==undefined){cat=d.c;renderGrid()}
 else if(d.a){cart.push(d.a);renderGrid();toast('Added to cart.')}
 else if(d.rm){cart=cart.filter(x=>x!==d.rm);renderGrid();renderPanel()}
 else if(d.go)place();else if(d.paid)claim();
 else if(d.op)openPanel('pay',d.op);
 else if(d.cp){try{navigator.clipboard.writeText(d.cp);toast('Amount copied.')}catch(x){}}});
$('#q').oninput=e=>{q=e.target.value.toLowerCase();renderGrid()};
$('#bc').onclick=()=>openPanel('cart');$('#bo').onclick=()=>openPanel('orders');
setInterval(async()=>{if($('#ov').style.display==='block'&&pv==='pay'&&pay){await sync(pay);renderPanel()}},6000);
api('/api/products').then(p=>{products=p;renderGrid()}).catch(()=>{renderGrid();toast('Could not load products.')});
