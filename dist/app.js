const photos={mug:'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=85',tote:'https://images.unsplash.com/photo-1632942480766-9cee148c4ee8?auto=format&fit=crop&w=1000&q=85',book:'https://images.unsplash.com/photo-1554757387-fa0367573d09?auto=format&fit=crop&w=1000&q=85'};
let products=[
{id:'mug',name:'日常陶瓷馬克杯',category:'居家生活',price:480,image:photos.mug,tag:'日常推薦',variants:['霧白 / 350ml','墨綠 / 350ml'],description:'留一點時間給自己，從一杯喜歡的飲品開始。簡潔杯身與好握把手，適合辦公桌與居家日常。',spec:'示範規格：陶瓷材質 · 容量 350ml · 單入',stock:20},
{id:'tote',name:'輕日常帆布提袋',category:'隨身配件',price:590,image:photos.tote,tag:'人氣選物',variants:['原色 / 標準款','黑色 / 標準款'],description:'把今天需要的物品輕鬆帶著走。適合通勤、買菜與週末散步的簡單提袋。',spec:'示範規格：棉帆布 · 35 × 38cm · 單入',stock:15},
{id:'book',name:'靈感隨行筆記本',category:'文具小物',price:280,image:photos.book,tag:'靈感日常',variants:['米白 / 橫線','米白 / 空白'],description:'記下稍縱即逝的念頭，也寫下值得記住的小事。為每日筆記保留一個安靜的空間。',spec:'示範規格：A5 · 80 頁 · 單本',stock:30},
{id:'mug-pair',name:'雙人日常杯組',category:'居家生活',price:880,image:photos.mug,tag:'組合選物',variants:['霧白雙杯組'],description:'讓日常多一份陪伴。雙杯組合適合一起享用早晨的咖啡或午後的茶。',spec:'示範規格：350ml × 2 入 · 圖片為單杯示意',stock:10},
{id:'tote-large',name:'週末大容量提袋',category:'隨身配件',price:690,image:photos.tote,tag:'週末出走',variants:['原色 / 加大款'],description:'為週末留多一點空間，裝進隨行衣物、書本與一天的好心情。',spec:'示範規格：棉帆布 · 42 × 45cm · 圖片為同系列示意',stock:12},
{id:'book-set',name:'生活紀錄雙本組',category:'文具小物',price:490,image:photos.book,tag:'組合選物',variants:['橫線＋空白'],description:'一本記錄工作，一本收藏生活。把想法分開整理，讓靈感各自找到位置。',spec:'示範規格：A5 · 80 頁 × 2 本 · 圖片為單本示意',stock:18}
];
const $=s=>document.querySelector(s);const money=n=>'NT$ '+n.toLocaleString('zh-TW');let category='全部',cart=[],lastOrder=null;let toastTimer; let cloudReady=false, submitting=false, pendingRequest=null;
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{const saved=JSON.parse(localStorage.getItem('daily-cart-v1')||'[]');if(Array.isArray(saved))cart=saved.filter(x=>products.some(p=>p.id===x.id&&p.variants.includes(x.variant))&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<=10).slice(0,30)}catch{}
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2500)}
function saveCart(){try{localStorage.setItem('daily-cart-v1',JSON.stringify(cart))}catch{notify('瀏覽器無法保存購物袋，本次仍可繼續選購。')}updateCart()}
function add(id,variant){if(!cloudReady){notify("訂購服務尚未連線，請稍後再試");return false;}const p=products.find(p=>p.id===id);if(!p||!p.variants.includes(variant))throw Error('商品或款式不存在');const existing=cart.find(x=>x.id===id&&x.variant===variant);if(existing&&existing.qty>=10){notify('每款商品最多選購 10 件');return false}if(cart.filter(x=>x.id===id).reduce((n,x)=>n+x.qty,0)>=p.stock){notify('已達此商品的庫存上限');return false}if(existing)existing.qty++;else cart.push({id,variant,qty:1});saveCart();notify('已加入購物袋');return true}
function renderProducts(){const query=$('#search').value.trim().toLowerCase();const list=products.filter(p=>p.available!==false&&(category==='全部'||p.category===category)&&(p.name+p.description+p.category).toLowerCase().includes(query));$('#results-count').textContent=list.length+' 件精選商品';$('#no-results').hidden=!!list.length;$('#products').innerHTML=list.map(p=>`<article><div class="product-photo"><button data-detail="${p.id}" aria-label="查看${escapeHTML(p.name)}"><img src="${p.image}" alt="${escapeHTML(p.name)}示意照片" loading="lazy"></button><span class="tag">${p.tag}</span></div><div class="product-meta"><div><small>${p.category}</small><button class="product-title" data-detail="${p.id}">${escapeHTML(p.name)}</button><p>${money(p.price)}</p></div><button class="add" data-detail="${p.id}" aria-label="選擇${escapeHTML(p.name)}款式並加入購物袋">＋</button></div></article>`).join('')}
function openDetail(id){const p=products.find(p=>p.id===id);if(!p)return;$('#detail-content').innerHTML=`<img class="detail-image" src="${p.image}" alt="${escapeHTML(p.name)}示意照片"><p class="detail-category">${p.category} · 示範商品</p><h2>${escapeHTML(p.name)}</h2><p class="detail-price">${money(p.price)}</p><p class="detail-description">${p.description}</p><p class="muted">${p.spec}</p><p class="muted">圖片為示意照片，各款式以實際商品為準。</p><label class="variant-label">選擇款式<select id="variant">${p.variants.map(v=>`<option>${escapeHTML(v)}</option>`).join('')}</select></label><button class="primary full" id="detail-add">加入購物袋</button>`;$('#detail-add').onclick=()=>{if(add(id,$('#variant').value))$('#detail').close()};$('#detail').showModal()}
const subtotal=()=>cart.reduce((n,x)=>n+products.find(p=>p.id===x.id).price*x.qty,0);
function updateCart(){$('#cart-count').textContent=cart.reduce((n,x)=>n+x.qty,0);$('#cart-bottom').hidden=!cart.length;$('#subtotal').textContent=money(subtotal());$('#cart-items').innerHTML=cart.length?cart.map((x,i)=>{const p=products.find(p=>p.id===x.id);return `<div class="cart-row"><img src="${p.image}" alt="${escapeHTML(p.name)}"><div class="cart-info"><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(x.variant)}</small><div class="quantity"><button data-qty="${i}" data-delta="-1" aria-label="減少${escapeHTML(p.name)}數量">−</button><span>${x.qty}</span><button data-qty="${i}" data-delta="1" aria-label="增加${escapeHTML(p.name)}數量">＋</button><button class="remove" data-remove="${i}">移除</button></div></div><strong>${money(p.price*x.qty)}</strong></div>`}).join(''):'<p class="empty">購物袋還是空的。<br>去挑選一件喜歡的日常好物吧。</p>'}
function shipping(){return $('#order-form').elements.delivery.value==='home'?100:60}
function deliveryChanged(){const f=$('#order-form'),home=f.elements.delivery.value==='home';$('#home-fields').hidden=!home;$('#store-fields').hidden=home;f.elements.address.required=home;f.elements.address.disabled=!home;for(const n of ['store','storeCode']){f.elements[n].required=!home;f.elements[n].disabled=home}$('#order-summary').innerHTML=`<div><span>商品小計</span><span>${money(subtotal())}</span></div><div><span>配送運費（示範）</span><span>${money(shipping())}</span></div><div class="total"><strong>訂單總額</strong><strong>${money(subtotal()+shipping())}</strong></div><p class="muted">此步驟不需付款。</p>`}
document.addEventListener('click',e=>{const close=e.target.closest('[data-close]');if(close&&!submitting)$('#'+close.dataset.close).close();const detail=e.target.closest('[data-detail]');if(detail)openDetail(detail.dataset.detail);const filter=e.target.closest('[data-category]');if(filter){category=filter.dataset.category;document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('selected',b===filter));renderProducts()}const q=e.target.closest('[data-qty]');if(q){const i=+q.dataset.qty,x=cart[i];if(+q.dataset.delta>0){add(x.id,x.variant)}else{if(x.qty>1)x.qty--;else cart.splice(i,1);saveCart()}}const remove=e.target.closest('[data-remove]');if(remove){cart.splice(+remove.dataset.remove,1);saveCart()}});
$('#search').addEventListener('input',renderProducts);$('#open-cart').onclick=()=>{$('#cart-dialog').showModal()};$('#checkout-button').onclick=()=>{if(!cart.length||!cloudReady){notify('請先確認商品連線狀態');return;}$('#cart-dialog').close();deliveryChanged();$('#checkout').showModal()};document.querySelectorAll('[name=delivery]').forEach(r=>r.onchange=deliveryChanged);
// Only an opaque retry UUID and payload hash are saved. Contact details stay in memory.
async function requestIdFor(customer, items, total) {
  const bytes = new TextEncoder().encode(JSON.stringify({customer,items,total}));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
  try { pendingRequest = JSON.parse(sessionStorage.getItem('daily-pending-request')) || pendingRequest; } catch {}
  if (!pendingRequest || pendingRequest.fingerprint !== fingerprint) {
    pendingRequest = {id:crypto.randomUUID(),fingerprint};
    try { sessionStorage.setItem('daily-pending-request',JSON.stringify(pendingRequest)); } catch {}
  }
  return pendingRequest.id;
}
$('#checkout').addEventListener('cancel', e => { if(submitting)e.preventDefault(); });
$('#order-form').onsubmit=async e=>{
  e.preventDefault();
  if(submitting || !cart.length || !cloudReady)return;
  const f=e.target;
  const customer=Object.fromEntries(new FormData(f));
  for(const key of Object.keys(customer))customer[key]=customer[key].trim();
  if(!customer.name || !(customer.delivery==='home'?customer.address:customer.store)) {
    $('#submit-error').textContent='請填寫完整的姓名及收件資料。'; return;
  }
  const customerItems=cart.map(x=>({id:x.id,variant:x.variant,qty:x.qty}));
  const expectedTotal=subtotal()+shipping();
  submitting=true;
  const controls=Array.from(f.elements).map(el=>({el,disabled:el.disabled}));
  controls.forEach(({el})=>el.disabled=true);
  const button=f.querySelector('[type=submit]');
  button.textContent='正在送出，請稍候…';
  $('#submit-error').textContent='';
  try {
    const requestId=await requestIdFor(customer,customerItems,expectedTotal);
    const receipt=await window.storefrontApi.placeOrder({
      p_request_id:requestId,p_customer:customer,p_items:customerItems,p_expected_total:expectedTotal
    });
    if(!receipt?.id || !Array.isArray(receipt.items) || !Number.isInteger(receipt.total)) {
      throw new Error('尚無法確認訂單結果，請保持內容不變並重試。');
    }
    lastOrder={...receipt,customer};
    $('#receipt').textContent=receiptText(lastOrder);
    cart=[];saveCart();
    pendingRequest=null;
    try {sessionStorage.removeItem('daily-pending-request');localStorage.removeItem('daily-last-order-v1');}catch{}
    f.reset();$('#checkout').close();$('#success').showModal();
    await refreshCatalog();
  } catch(error) {
    $('#submit-error').textContent=error.message || '暫時無法送出訂單，請稍後重試。';
    if(['PRICE_CHANGED','OUT_OF_STOCK','PRODUCT_UNAVAILABLE','INVALID_VARIANT'].includes(error.code)) {
      await refreshCatalog();deliveryChanged();
    }
  } finally {
    submitting=false;
    controls.forEach(({el,disabled})=>el.disabled=disabled);
    button.textContent='送出示範訂單 · 不需付款';
    deliveryChanged();
  }
};

function receiptText(o){const delivery={home:'宅配',seven:'7-ELEVEN',family:'全家'}[o.customer.delivery];return `訂單編號：${o.id}\n${o.items.map(x=>`${x.name}（${x.variant}）× ${x.qty}　${money(x.qty*x.price)}`).join('\n')}\n配送方式：${delivery}\n收件人：${o.customer.name}\n收件地點：${o.customer.address||o.customer.store+' / '+o.customer.storeCode}\n商品小計：${money(o.subtotal)}\n運費：${money(o.shipping)}\n訂單總額：${money(o.total)}\n\n${o.status}`}
$('#download-order').onclick=()=>{if(!lastOrder)return;const url=URL.createObjectURL(new Blob(['日常選物 — 示範訂單\n\n'+receiptText(lastOrder)],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=lastOrder.id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
async function refreshCatalog() {
  const status=$('#connection-status');
  try {
    const rows=await window.storefrontApi.products();
    const previous=JSON.stringify(cart);
    products=products.map(p=>{
      const live=rows.find(r=>r.id===p.id);
      return live?{...p,...live,available:true}:{...p,available:false,stock:0};
    });
    cart=cart.filter(x=>products.some(p=>p.available && p.id===x.id && p.variants.includes(x.variant)));
    cloudReady=true;
    status.textContent='已連接雲端訂購服務 · 送出後可由商家確認 · 不需付款';
    $('#retry-connection').hidden=true;
    if(previous!==JSON.stringify(cart))notify('部分商品或款式已下架，已更新購物袋。');
    saveCart();renderProducts();
    return true;
  } catch(error) {
    cloudReady=false;
    status.textContent=error.message || '暫時無法連接訂購服務，請稍後再試。';
    $('#retry-connection').hidden=false;
    return false;
  }
}
$('#retry-connection').onclick=refreshCatalog;
$('#hero-image').src=photos.mug;$('#hero-image').hidden=false;renderProducts();updateCart();refreshCatalog();
try {localStorage.removeItem('daily-last-order-v1');}catch{}

if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_product_catalog',description:'Read the demo shop catalog and currently selected shopping bag. Does not place an order.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({products:products.map(({image,...p})=>p),cart})})).catch(()=>{})}catch{}}
