const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp=n=>'Rp '+Number(n).toLocaleString('id-ID');
const LBL={pending:'Waiting for payment',claimed:'Buyer says paid',done:'Delivered',cancelled:'Cancelled'};
const lnk=s=>esc(s).replace(/https?:\/\/\S+/g,u=>'<a href="'+u+'" target="_blank" rel="noopener">'+u+'</a>');
let tab='orders',orders=[],products=[],tmp={},es=null;
const api=async(u,m,b)=>{const r=await fetch(u,{method:m||'GET',headers:{'content-type':'application/json'},body:b?JSON.stringify(b):undefined});const d=await r.json().catch(()=>({}));
 if(r.status===401&&u!=='/api/admin/login'){login();throw new Error('Signed out. Sign in again.')}
 if(!r.ok)throw new Error(d.error||'Something went wrong.');return d};
function toast(m){const t=$('#ts');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),3800)}
function ping(m){toast(m);
 try{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.setValueAtTime(.15,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.6);o.start();o.stop(c.currentTime+.6)}catch(e){}
 try{if(Notification.permission==='granted')new Notification('JOY STORE',{body:m})}catch(e){}
 if(document.hidden)document.title='(!) '+document.title.replace(/^\(!\) /,'')}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)document.title=document.title.replace(/^\(!\) /,'')});

function login(){if(es){es.close();es=null}document.title='Admin sign in | JOY STORE';
 $('#app').innerHTML=`<div class="lg"><form class="lc" id="lf"><div class="mk big">J</div><h1>Admin sign in</h1><p class="mut">JOY STORE dashboard. Only the store owner can manage orders and products.</p><label>Username<input id="u" autocomplete="username" required></label><label>Password<input id="p" type="password" autocomplete="current-password" required></label><p class="er" id="le" role="alert"></p><button class="btn w">Sign in</button><a href="/">Back to store</a></form></div>`;
 $('#lf').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/login','POST',{username:$('#u').value,password:$('#p').value});start()}catch(x){$('#le').textContent=x.message}}}
function start(){document.title='Admin | JOY STORE';
 $('#app').innerHTML=`<header class="hd"><a class="logo" href="/admin"><span class="mk">J</span>JOY STORE <small>Admin</small></a><button class="btn hb" id="nt">Turn on alerts</button><button class="btn hb" id="so">Sign out</button></header><main class="wrap"><div class="tabs"><button class="chip on" data-t="orders">Orders (<span id="oc">0</span> open)</button><button class="chip" data-t="products">Products</button></div><div id="ad"></div></main>`;
 $('#so').onclick=async()=>{await api('/api/admin/logout','POST',{}).catch(()=>{});login()};
 $('#nt').onclick=async()=>{try{const r=await Notification.requestPermission();toast(r==='granted'?'Browser alerts are on.':'Browser alerts are blocked. In-page alerts still work.')}catch(e){toast('This browser can’t show alerts. In-page alerts still work.')}};
 es=new EventSource('/api/admin/stream');es.onopen=()=>load();es.onmessage=e=>{ping(JSON.parse(e.data).text);load()}}
async function load(){try{[orders,products]=await Promise.all([api('/api/admin/orders'),api('/api/admin/products')]);render()}catch(e){}}
function render(){const el=$('#ad');if(!el)return;
 $('#oc').textContent=orders.filter(o=>o.status==='pending'||o.status==='claimed').length;
 if(tab==='orders'){document.querySelectorAll('[data-d]').forEach(i=>tmp[i.dataset.d]=i.value);
  el.innerHTML=orders.length?orders.map(o=>{const op=o.status==='pending'||o.status==='claimed',pre=tmp[o.id]??o.items.map(i=>i.link).filter(Boolean).join(' ');
   return `<article class="od"><div class="row"><b>${esc(o.id)}</b><span class="pill ${o.status}">${LBL[o.status]}</span></div><p class="mut">${new Date(o.at).toLocaleString('id-ID')}. ${esc(o.name)}, ${esc(o.contact)}</p><ul>${o.items.map(i=>`<li><span>${esc(i.name)}</span><span>${rp(i.price)}</span></li>`).join('')}</ul><p>Expect <b>${rp(o.total)}</b> (unique code ${o.code})</p>${op?`<input data-d="${o.id}" placeholder="Download link or note for the buyer" value="${esc(pre)}" aria-label="Delivery for ${esc(o.id)}"><div class="row"><button class="btn sm" data-ok="${o.id}">Confirm payment and deliver</button><button class="btn sm ghost" data-no="${o.id}">Cancel order</button></div>`:o.delivery?`<p class="mut">Sent to buyer: ${lnk(o.delivery)}</p>`:''}</article>`}).join(''):'<p class="mut">No orders yet. New orders appear here and trigger an alert.</p>'}
 else{if(document.activeElement&&document.activeElement.closest('#pf'))return;
  el.innerHTML=`<form class="pf" id="pf"><input id="pn" placeholder="Product name" required><input id="pk" placeholder="Category, for example Templates" required><input id="pp" type="number" min="1000" step="500" placeholder="Price in Rp" required><textarea id="pd" rows="2" placeholder="Short description"></textarea><input id="pl" placeholder="Download link (optional, prefilled when delivering)"><button class="btn">Add product</button></form>`+(products.length?products.map(p=>`<div class="row pl"><span><b>${esc(p.name)}</b><br><span class="mut">${esc(p.category)}, ${rp(p.price)}</span></span><button class="btn sm ghost" data-del="${p.id}">Delete</button></div>`).join(''):'<p class="mut">No products yet. Add your first one above.</p>');
  $('#pf').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/products','POST',{name:$('#pn').value,category:$('#pk').value,price:$('#pp').value,desc:$('#pd').value,link:$('#pl').value});toast('Product added.');load()}catch(x){toast(x.message)}}}}
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
 try{if(d.t){tab=d.t;document.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));render()}
 else if(d.ok){const v=document.querySelector('[data-d="'+d.ok+'"]').value.trim();if(!v)return toast('Add a download link or note first.');await api('/api/admin/orders/'+d.ok,'POST',{status:'done',delivery:v});delete tmp[d.ok];toast('Order delivered.');load()}
 else if(d.no){if(!confirm('Cancel this order?'))return;await api('/api/admin/orders/'+d.no,'POST',{status:'cancelled'});toast('Order cancelled.');load()}
 else if(d.del){if(!confirm('Delete this product?'))return;await api('/api/admin/products/'+d.del,'DELETE');load()}}catch(x){toast(x.message)}});
api('/api/admin/me').then(start).catch(login);
