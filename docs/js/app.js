const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const fmt = n => 'Rp ' + Number(n||0).toLocaleString('id-ID');
const STATUSES = ['baru','pembayaran','desain','acc','cetak','finishing','siap','selesai'];
const STATUS_LABEL = {
  baru:'Pesanan Baru', pembayaran:'Menunggu Pembayaran', desain:'Desain',
  acc:'Menunggu ACC', cetak:'Cetak', finishing:'Finishing',
  siap:'Siap Diambil/Dikirim', selesai:'Selesai'
};
const QTYS = [100,300,500,1000];

let view = { page:'home', productId:null, orderId:null, adminPage:'dashboard', qty:100, photo:0, filters:{} };

function catName(id){ return (LS21.categories.get(id)||{}).name || '-'; }
function priceOf(p, qty){ return (p.prices && p.prices[qty]) || p.prices?.[100] || 0; }
function extrasTotal(p, qty, extras){
  let t=0;
  if(extras?.designFee) t += p.extras.designFee||0;
  if(extras?.envelope) t += (p.extras.envelope||0)*qty;
  if(extras?.finishing) t += (p.extras.finishing||0)*qty;
  return t;
}

function photoStyle(ph){
  ph = ph || {color:'#1e3a5f'};
  if (ph.url) return `background:#f3f0ea url('${ph.url}') center/cover no-repeat`;
  return `background:linear-gradient(160deg,${ph.color||'#1e3a5f'},#1e3a5f)`;
}
function photoBlock(p, type, extra=''){
  const ph = (p.photos||[]).find(x=>x.type===type) || (p.photos||[])[0] || {color:'#1e3a5f'};
  return `<div class="${extra}" style="${photoStyle(ph)}">${ph.url?'': (type.toUpperCase()+' · '+p.code)}</div>`;
}
function shade(hex){
  return hex;
}

function productCard(p){
  const ph = (p.photos||[])[0] || {color:'#1e3a5f'};
  const badges = (p.badges||[]).map(b=>`<span class="badge ${b.toLowerCase()}">${b}</span>`).join('');
  const showPrice = LS21.settings.get().catalog.showPrice;
  return `<article class="pcard" onclick="openProduct('${p.id}')">
    <div class="pphoto" style="${photoStyle(ph)}">
      <span class="code">${p.code}</span>
      <div class="badges">${badges}</div>
    </div>
    <div class="pbody">
      <h3>${p.name}</h3>
      <div class="meta">${catName(p.categoryId)} · ${p.motif}</div>
      <div class="price">${showPrice? 'Mulai '+fmt(priceOf(p,100))+'/pcs' : 'Hubungi kami'}</div>
    </div>
  </article>`;
}

function renderCustomer(){
  const s = LS21.settings.get();
  $('#store-name').textContent = s.storeName;
  const page = view.page;
  $$('.page').forEach(p=>p.classList.toggle('on', p.id==='page-'+page));
  $$('.navb a').forEach(a=>a.classList.toggle('on', a.dataset.page===page));
  if(page==='home') renderHome();
  if(page==='katalog') renderKatalog();
  if(page==='favorit') renderFavorit();
  if(page==='pesanan') renderPesananCust();
  if(page==='detail') renderDetail();
  if(page==='cart') renderCart();
  if(page==='checkout') renderCheckout();
  if(page==='track') renderTrack();
  if(page==='compare') renderCompare();
  $('#cart-count').textContent = LS21.cart.items().length || '';
  renderCompareBar();
}

function renderHome(){
  const products = LS21.products.all(true);
  const cats = LS21.categories.all(true);
  const s = LS21.settings.get();
  const b = s.banners[0];
  $('#hero').innerHTML = `<h1>${b.title}</h1><p>${b.subtitle}</p><p class="muted" style="color:#e8d48b;margin-top:10px">${s.tagline}</p>`;
  $('#pop-cats').innerHTML = cats.slice(0,8).map(c=>`<button class="chip" onclick="goKatalog('${c.id}')">${c.name}</button>`).join('');
  const newest = [...products].sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,4);
  const popular = [...products].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,4);
  const premium = products.filter(p=>(p.badges||[]).includes('PREMIUM')).slice(0,4);
  $('#grid-new').innerHTML = newest.map(productCard).join('');
  $('#grid-pop').innerHTML = popular.map(productCard).join('');
  $('#grid-pre').innerHTML = premium.map(productCard).join('');
}

function goKatalog(cat){
  view.filters.categoryId = cat||'';
  view.page='katalog';
  renderCustomer();
}

function renderKatalog(){
  const cats = LS21.categories.all(true);
  const products = LS21.products.all(true);
  const f = view.filters;
  $('#filter-cat').innerHTML = `<option value="">Semua kategori</option>` + cats.map(c=>`<option value="${c.id}" ${f.categoryId===c.id?'selected':''}>${c.name}</option>`).join('');
  const motifs = [...new Set(products.map(p=>p.motif))];
  const colors = [...new Set(products.map(p=>p.specs.color))];
  const sizes = [...new Set(products.map(p=>p.specs.size))];
  const folds = [...new Set(products.map(p=>p.specs.fold))];
  const mats = [...new Set(products.map(p=>p.specs.material))];
  $('#filter-motif').innerHTML = `<option value="">Motif</option>`+motifs.map(m=>`<option ${f.motif===m?'selected':''}>${m}</option>`).join('');
  $('#filter-color').innerHTML = `<option value="">Warna</option>`+colors.map(m=>`<option ${f.color===m?'selected':''}>${m}</option>`).join('');
  $('#filter-size').innerHTML = `<option value="">Ukuran</option>`+sizes.map(m=>`<option ${f.size===m?'selected':''}>${m}</option>`).join('');
  $('#filter-fold').innerHTML = `<option value="">Bentuk</option>`+folds.map(m=>`<option ${f.fold===m?'selected':''}>${m}</option>`).join('');
  $('#filter-mat').innerHTML = `<option value="">Bahan</option>`+mats.map(m=>`<option ${f.mat===m?'selected':''}>${m}</option>`).join('');
  let list = products.filter(p=>{
    if(f.q && !(p.name+p.code+p.motif).toLowerCase().includes(f.q.toLowerCase())) return false;
    if(f.categoryId && p.categoryId!==f.categoryId) return false;
    if(f.motif && p.motif!==f.motif) return false;
    if(f.color && p.specs.color!==f.color) return false;
    if(f.size && p.specs.size!==f.size) return false;
    if(f.fold && p.specs.fold!==f.fold) return false;
    if(f.mat && p.specs.material!==f.mat) return false;
    const pr = priceOf(p,100);
    if(f.minp && pr < Number(f.minp)) return false;
    if(f.maxp && pr > Number(f.maxp)) return false;
    return true;
  });
  $('#grid-kat').innerHTML = list.map(productCard).join('') || '<p class="muted">Tidak ada produk.</p>';
}

function openProduct(id){
  view.productId=id; view.page='detail'; view.photo=0; view.qty=100;
  LS21.analytics.viewProduct(id);
  renderCustomer();
}

function renderDetail(){
  const p = LS21.products.get(view.productId);
  if(!p) return;
  const photos = p.photos||[];
  const cur = photos[view.photo]||photos[0];
  $('#d-gallery').innerHTML = `
    <div class="gmain" style="${photoStyle(cur)}">${cur&&cur.url?'':((cur.type||'depan').toUpperCase()+'<br>'+p.name)}</div>
    <div class="gth">${photos.map((ph,i)=>`<div onclick="view.photo=${i};renderDetail()" style="${photoStyle(ph)}">${ph.url?'':ph.type}</div>`).join('')}</div>
    ${LS21.session.adminAuthed?`<label class="btn btn-primary" style="margin-top:8px;display:inline-block">Ganti gambar
      <input type="file" accept="image/*" hidden onchange="changeDetailPhoto(this)">
    </label>`:''}`;
  $('#d-info').innerHTML = `
    <div class="meta">${p.code} · ${catName(p.categoryId)}</div>
    <h2 style="margin:6px 0">${p.name}</h2>
    <p>${p.description}</p>
    <table>
      <tr><td>Motif</td><td>${p.motif}</td></tr>
      <tr><td>Bahan</td><td>${p.specs.material}</td></tr>
      <tr><td>Ukuran</td><td>${p.specs.size}</td></tr>
      <tr><td>Model</td><td>${p.specs.fold}</td></tr>
      <tr><td>Warna</td><td>${p.specs.color}</td></tr>
      <tr><td>Finishing</td><td>${p.specs.finishing}</td></tr>
      <tr><td>Amplop</td><td>${p.specs.envelope}</td></tr>
      <tr><td>Jenis cetak</td><td>${p.specs.printType}</td></tr>
    </table>
    <div class="qtyrow">${QTYS.map(q=>`<button class="qtybtn ${view.qty===q?'on':''}" onclick="view.qty=${q};renderDetail()">${q} pcs</button>`).join('')}</div>
    <div class="card" id="calc"></div>
    <label class="muted"><input type="checkbox" id="ex-des" checked onchange="renderCalc()"> Biaya desain custom (${fmt(p.extras.designFee)})</label>
    <label class="muted"><input type="checkbox" id="ex-amp" checked onchange="renderCalc()"> Amplop (${fmt(p.extras.envelope)}/pcs)</label>
    <label class="muted"><input type="checkbox" id="ex-fin" onchange="renderCalc()"> Finishing extra (${fmt(p.extras.finishing)}/pcs)</label>
    <div class="row-actions">
      <button class="btn btn-primary" onclick="addCart()">+ Keranjang</button>
      <button class="btn btn-navy" onclick="fav('${p.id}')">${LS21.favorites.has(p.id)?'♥ Favorit':'♡ Favorit'}</button>
      <button class="btn btn-ghost" onclick="cmp('${p.id}')">Bandingkan</button>
      <button class="btn btn-gold" onclick="waProduct('${p.id}')">WhatsApp</button>
    </div>
    <div class="card">
      <h3>Coba Nama Saya</h3>
      <div class="form">
        <label>Mempelai pria</label><input id="pv-g" value="Andi">
        <label>Mempelai wanita</label><input id="pv-b" value="Sinta">
        <label>Tanggal acara</label><input id="pv-d" type="date" value="2026-11-21">
        <button class="btn btn-ghost" style="margin-top:8px" onclick="previewName()">Tampilkan Preview</button>
      </div>
      <div id="name-preview" class="preview-box" style="margin-top:10px;background:linear-gradient(160deg,${cur.color},#fff8ee)">
        <div class="muted">The Wedding of</div>
        <strong>Andi & Sinta</strong>
        <div>21 November 2026</div>
      </div>
    </div>`;
  renderCalc();
}

function extrasFromUI(){
  return { designFee: $('#ex-des')?.checked, envelope: $('#ex-amp')?.checked, finishing: $('#ex-fin')?.checked };
}
function renderCalc(){
  const p = LS21.products.get(view.productId); if(!p) return;
  const q = view.qty, unit = priceOf(p,q), extras = extrasFromUI();
  const ex = extrasTotal(p,q,extras);
  const sub = unit*q;
  $('#calc').innerHTML = `<b>Kalkulator</b><div class="meta">${q} pcs × ${fmt(unit)} = ${fmt(sub)}</div>
    <div class="meta">Layanan tambahan: ${fmt(ex)}</div>
    <div style="margin-top:6px;font-size:18px;font-weight:800;color:var(--navy)">Total ${fmt(sub+ex)}</div>`;
}
function previewName(){
  const g=$('#pv-g').value||'...', b=$('#pv-b').value||'...', d=$('#pv-d').value;
  const dt = d? new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '';
  $('#name-preview').innerHTML = `<div class="muted">The Wedding of</div><strong>${g} & ${b}</strong><div>${dt}</div>`;
}
function addCart(){
  const p = LS21.products.get(view.productId);
  const extras = extrasFromUI();
  LS21.cart.add({ productId:p.id, code:p.code, name:p.name, qty:view.qty, unitPrice:priceOf(p,view.qty), extras });
  toast('Ditambahkan ke keranjang');
  renderCustomer();
}
function fav(id){ LS21.favorites.toggle(id); renderCustomer(); }
function cmp(id){ LS21.compare.toggle(id); renderCustomer(); }
function waProduct(id){
  LS21.analytics.waClick();
  const p = LS21.products.get(id);
  const s = LS21.settings.get();
  const text = encodeURIComponent(`Halo ${s.storeName}, saya tertarik ${p.code} ${p.name}`);
  window.open(`https://wa.me/${s.whatsapp}?text=${text}`,'_blank');
}

function renderFavorit(){
  const list = LS21.favorites.ids().map(id=>LS21.products.get(id)).filter(Boolean);
  $('#grid-fav').innerHTML = list.map(productCard).join('') || '<p class="muted">Belum ada favorit.</p>';
}

function renderCart(){
  const items = LS21.cart.items();
  if(!items.length){ $('#cart-box').innerHTML = '<p class="muted">Keranjang kosong.</p>'; return; }
  let total=0;
  const rows = items.map((it,i)=>{
    const p = LS21.products.get(it.productId);
    const unit = p? priceOf(p,it.qty): it.unitPrice;
    const ex = p? extrasTotal(p,it.qty,it.extras):0;
    const sub = unit*it.qty + ex;
    total+=sub;
    return `<div class="card"><b>${it.name}</b> <span class="meta">${it.code}</span>
      <div class="meta">${it.qty} pcs × ${fmt(unit)}</div>
      <div class="meta">Tambahan: ${fmt(ex)}</div>
      <div><b>${fmt(sub)}</b></div>
      <button class="btn btn-ghost" onclick="LS21.cart.remove(${i});renderCustomer()">Hapus</button></div>`;
  }).join('');
  $('#cart-box').innerHTML = rows + `<div class="card"><b>Total ${fmt(total)}</b><br>
    <button class="btn btn-primary" onclick="view.page='checkout';renderCustomer()">Checkout</button></div>`;
}

function renderCheckout(){
  const s = LS21.settings.get();
  const pays = s.payments.filter(p=>p.active);
  const picks = s.pickupMethods.filter(p=>p.active);
  $('#co-form').innerHTML = `
    <label>Nama pelanggan</label><input id="co-name" required>
    <label>WhatsApp</label><input id="co-wa" required>
    <label>Mempelai pria</label><input id="co-g">
    <label>Mempelai wanita</label><input id="co-b">
    <label>Tanggal acara</label><input id="co-date" type="date">
    <label>Lokasi acara</label><input id="co-loc">
    <label>Alamat</label><textarea id="co-addr"></textarea>
    <label>Metode pengambilan</label><select id="co-pick">${picks.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select>
    <label>Metode pembayaran</label><select id="co-pay">${pays.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select>
    <label>Catatan</label><textarea id="co-note"></textarea>
    <button class="btn btn-primary" type="button" onclick="submitOrder()">Kirim Pesanan</button>`;
}

function submitOrder(){
  const items = LS21.cart.items();
  if(!items.length){ toast('Keranjang kosong'); return; }
  const name = $('#co-name').value.trim();
  const wa = $('#co-wa').value.trim();
  if(!name||!wa){ toast('Nama dan WhatsApp wajib'); return; }
  let total=0, mapped=[];
  items.forEach(it=>{
    const p = LS21.products.get(it.productId);
    const unit = p? priceOf(p,it.qty):it.unitPrice;
    const ex = p? extrasTotal(p,it.qty,it.extras):0;
    mapped.push({...it, unitPrice:unit});
    total += unit*it.qty + ex;
  });
  const first = items[0];
  const o = {
    id:'o'+Date.now(), number: LS21.orders.nextNumber(), createdAt: new Date().toISOString(),
    customer:{ name, wa, address: $('#co-addr').value },
    couple:{ groom:$('#co-g').value, bride:$('#co-b').value, date:$('#co-date').value, location:$('#co-loc').value },
    items: mapped, pickup:$('#co-pick').value, payment:$('#co-pay').value, note:$('#co-note').value,
    totals:{ subtotal: mapped.reduce((a,i)=>a+i.unitPrice*i.qty,0), extras: total - mapped.reduce((a,i)=>a+i.unitPrice*i.qty,0), total, paid:0 },
    paymentStatus:'unpaid', designStatus:'baru', productionStatus:'baru',
    deadline: addDays(LS21.settings.get().productionDays),
    design:{ previews:[], revisions:[], accDate:null, accStatus:'none' }
  };
  LS21.orders.save(o);
  LS21.customers.upsert({ name, wa, address:o.customer.address, addTotal:total, lastOrder:o.number });
  LS21.cart.clear();
  view.orderId=o.id; view.page='track';
  toast('Pesanan '+o.number+' dibuat');
  renderCustomer();
}
function addDays(n){
  const d=new Date(); d.setDate(d.getDate()+Number(n||7));
  return d.toISOString().slice(0,10);
}

function renderPesananCust(){
  const list = LS21.orders.all();
  $('#order-list').innerHTML = list.map(o=>`<div class="card" onclick="view.orderId='${o.id}';view.page='track';renderCustomer()">
    <b>${o.number}</b><div class="meta">${o.customer.name} · ${STATUS_LABEL[o.productionStatus]||o.productionStatus}</div>
    <div>${fmt(o.totals.total)}</div></div>`).join('') || '<p class="muted">Belum ada pesanan di perangkat ini.</p>';
}

function renderTrack(){
  const o = LS21.orders.get(view.orderId);
  if(!o){ $('#track-box').innerHTML='<p class="muted">Pilih pesanan.</p>'; return; }
  const idx = STATUSES.indexOf(o.productionStatus);
  const tl = STATUSES.map((st,i)=>{
    const cls = i<idx?'done': i===idx?'now':'';
    return `<div class="titem ${cls}"><div class="st">${STATUS_LABEL[st]}</div></div>`;
  }).join('');
  const canAcc = o.design.previews.length && o.design.accStatus!=='acc';
  const previews = o.design.previews.map(p=>`<div class="card muted">Preview ${p.date}: ${p.note||'-'}</div>`).join('');
  const revs = o.design.revisions.map(r=>`<div class="card">Revisi ${r.date}: ${r.note}</div>`).join('');
  $('#track-box').innerHTML = `<div class="card">
    <h2>${o.number}</h2>
    <div class="meta">${o.customer.name} · ${o.couple.groom||'-'} & ${o.couple.bride||'-'}</div>
    <div>Total ${fmt(o.totals.total)} · Pembayaran: ${o.paymentStatus}</div>
    <div class="meta">Deadline: ${o.deadline}</div>
    <h3>Status produksi</h3>${tl}
    <h3>Desain & ACC</h3>
    <div>Status ACC: <b>${o.design.accStatus}</b> ${o.design.accDate? '· '+o.design.accDate:''}</div>
    ${previews||'<p class="muted">Belum ada preview desain.</p>'}
    ${revs}
    ${canAcc? `<div class="row-actions">
      <button class="btn btn-ok" onclick="accOrder('${o.id}',true)">SETUJUI / ACC</button>
      <button class="btn btn-bad" onclick="askRev('${o.id}')">MINTA REVISI</button>
    </div><textarea id="rev-note" placeholder="Catatan revisi"></textarea>`:''}
    ${o.design.accStatus!=='acc' && o.productionStatus==='cetak' ? '<p class="muted">Cetak terkunci sampai ACC.</p>':''}
  </div>`;
}

function accOrder(id, ok){
  const o = LS21.orders.get(id);
  if(ok){
    o.design.accStatus='acc'; o.design.accDate=new Date().toISOString().slice(0,10);
    o.designStatus='acc';
    if(o.productionStatus==='desain'||o.productionStatus==='acc') o.productionStatus='cetak';
  }
  LS21.orders.save(o); renderCustomer(); if($('#admin-app').style.display!=='none') renderAdmin();
}
function askRev(id){
  const o = LS21.orders.get(id);
  const note = $('#rev-note')?.value || 'Mohon revisi';
  o.design.revisions.push({ date:new Date().toISOString().slice(0,10), note });
  o.design.accStatus='revisi'; o.designStatus='revisi'; o.productionStatus='desain';
  LS21.orders.save(o); renderCustomer();
}

function renderCompareBar(){
  const ids = LS21.compare.ids();
  const bar = $('#compare-bar');
  if(!ids.length){ bar.classList.add('hide'); return; }
  bar.classList.remove('hide');
  bar.innerHTML = `Bandingkan (${ids.length}/3) 
    <button class="btn btn-primary" onclick="view.page='compare';renderCustomer()">Lihat</button>
    <button class="btn btn-ghost" onclick="LS21.compare.clear();renderCustomer()">Reset</button>`;
}
function renderCompare(){
  const ps = LS21.compare.ids().map(id=>LS21.products.get(id)).filter(Boolean);
  if(!ps.length){ $('#compare-box').innerHTML='<p class="muted">Pilih max 3 produk.</p>'; return; }
  $('#compare-box').innerHTML = `<div style="overflow:auto"><table><tr><th></th>${ps.map(p=>`<th>${p.name}<br><span class="meta">${p.code}</span></th>`).join('')}</tr>
    <tr><td>Kategori</td>${ps.map(p=>`<td>${catName(p.categoryId)}</td>`).join('')}</tr>
    <tr><td>Motif</td>${ps.map(p=>`<td>${p.motif}</td>`).join('')}</tr>
    <tr><td>Bahan</td>${ps.map(p=>`<td>${p.specs.material}</td>`).join('')}</tr>
    <tr><td>Ukuran</td>${ps.map(p=>`<td>${p.specs.size}</td>`).join('')}</tr>
    <tr><td>Harga 100</td>${ps.map(p=>`<td>${fmt(priceOf(p,100))}</td>`).join('')}</tr>
    <tr><td>Harga 500</td>${ps.map(p=>`<td>${fmt(priceOf(p,500))}</td>`).join('')}</tr>
  </table></div>`;
}

/* ===== ADMIN ===== */
function showAdmin(on){
  $('#customer-app').style.display = on?'none':'block';
  $('#admin-app').style.display = on?'flex':'none';
  if(on){
    if(!LS21.get().session.adminAuthed){ $('#admin-login').classList.remove('hide'); $('#admin-main').classList.add('hide'); }
    else { $('#admin-login').classList.add('hide'); $('#admin-main').classList.remove('hide'); renderAdmin(); }
  }
}
async function loginAdmin(){
  const u=$('#adm-user').value, p=$('#adm-pass').value;
  const ok = await LS21.login(u,p);
  if(ok) showAdmin(true);
  else toast('Login gagal. Gunakan admin / lorongsatu21');
}
function logoutAdmin(){ LS21.logout(); showAdmin(false); }

function renderAdmin(){
  $$('.sidebar a[data-ap]').forEach(a=>a.classList.toggle('on', a.dataset.ap===view.adminPage));
  const map = {dashboard:rendDash,produk:rendProduk,kategori:rendKat,pesanan:rendPesananAdm,desain:rendDesain,pelanggan:rendCust,laporan:rendLap,pengaturan:rendSet};
  (map[view.adminPage]||rendDash)();
}

function rendDash(){
  const orders = LS21.orders.all();
  const count = st => orders.filter(o=>o.productionStatus===st).length;
  const cards = [
    ['Total', orders.length],['Baru',count('baru')],['Bayar',count('pembayaran')],
    ['Desain',count('desain')],['ACC',count('acc')],['Cetak',count('cetak')],
    ['Finishing',count('finishing')],['Siap',count('siap')],['Selesai',count('selesai')]
  ].map(([l,v])=>`<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  const today = new Date().toISOString().slice(0,10);
  const soon = orders.filter(o=>o.deadline && o.deadline<=addDays(3) && o.productionStatus!=='selesai');
  const late = orders.filter(o=>o.deadline && o.deadline<today && o.productionStatus!=='selesai');
  $('#admin-content').innerHTML = `<h2>Dashboard</h2><div class="stats">${cards}</div>
    <div class="card"><h3>Pesanan terbaru</h3>${orderTable(orders.slice(0,5))}</div>
    <div class="card"><h3>Deadline dekat</h3>${soon.map(o=>`<div>${o.number} · ${o.deadline}</div>`).join('')||'-'}</div>
    <div class="card"><h3>Terlambat</h3>${late.map(o=>`<div style="color:var(--bad)">${o.number} · ${o.deadline}</div>`).join('')||'-'}</div>`;
}

function orderTable(list){
  return `<table><tr><th>No</th><th>Pelanggan</th><th>Produk</th><th>Total</th><th>Desain</th><th>Produksi</th><th>Deadline</th><th></th></tr>
    ${list.map(o=>`<tr>
      <td>${o.number}</td><td>${o.customer.name}</td>
      <td>${o.items.map(i=>i.code).join(', ')}</td>
      <td>${fmt(o.totals.total)}</td>
      <td><span class="tag">${o.design.accStatus}</span></td>
      <td>${STATUS_LABEL[o.productionStatus]}</td>
      <td>${o.deadline||'-'}</td>
      <td><button class="btn btn-ghost" onclick="openOrder('${o.id}')">Detail</button></td>
    </tr>`).join('')}</table>`;
}

function rendProduk(){
  const list = LS21.products.all();
  $('#admin-content').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
    <h2>Produk</h2><button class="btn btn-primary" onclick="editProduct()">+ Tambah</button></div>
    <table><tr><th>Kode</th><th>Nama</th><th>Kategori</th><th>100pcs</th><th>Status</th><th></th></tr>
    ${list.map(p=>`<tr>
      <td>${p.code}</td><td>${p.name}</td><td>${catName(p.categoryId)}</td>
      <td>${fmt(priceOf(p,100))}</td>
      <td>${p.active?'Aktif':'Nonaktif'}</td>
      <td>
        <button class="btn btn-ghost" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn btn-ghost" onclick="toggleP('${p.id}')">${p.active?'Nonaktifkan':'Aktifkan'}</button>
        <button class="btn btn-ghost" onclick="delP('${p.id}')">Hapus</button>
      </td></tr>`).join('')}</table>
    <div id="prod-form"></div>`;
}
function toggleP(id){ const p=LS21.products.get(id); p.active=!p.active; LS21.products.save(p); rendProduk(); }
function delP(id){ if(confirm('Hapus produk?')){ LS21.products.remove(id); rendProduk(); } }

function editProduct(id){
  const p = id? structuredClone(LS21.products.get(id)) : {
    id:'p'+Date.now(), code:LS21.products.nextCode(), name:'', categoryId: LS21.categories.all(true)[0]?.id,
    subcategory:'', motif:'', tags:[], description:'',
    specs:{ size:'', material:'', printType:'', finishing:'', color:'', fold:'', envelope:'' },
    prices:{100:0,300:0,500:0,1000:0}, extras:{designFee:0,envelope:0,finishing:0,custom:0},
    minOrder:100, active:true, badges:[], photos:[{type:'depan',color:'#c9a227'}], createdAt:new Date().toISOString().slice(0,10), views:0
  };
  const cats = LS21.categories.all();
  $('#prod-form').innerHTML = `<div class="card two form">
    <div>
      <h3>${id?'Edit':'Tambah'} Produk</h3>
      <label>Kode</label><input id="pf-code" value="${p.code}">
      <label>Nama</label><input id="pf-name" value="${p.name}">
      <label>Kategori</label><select id="pf-cat">${cats.map(c=>`<option value="${c.id}" ${c.id===p.categoryId?'selected':''}>${c.name}</option>`).join('')}</select>
      <label>Subkategori</label><input id="pf-sub" value="${p.subcategory||''}">
      <label>Motif</label><input id="pf-motif" value="${p.motif||''}">
      <label>Deskripsi</label><textarea id="pf-desc">${p.description||''}</textarea>
      <label>Badge (koma: BARU,TERLARIS,PREMIUM,HEMAT)</label><input id="pf-badge" value="${(p.badges||[]).join(',')}">
      <h4>Spesifikasi</h4>
      <label>Ukuran</label><input id="pf-size" value="${p.specs.size||''}">
      <label>Bahan</label><input id="pf-mat" value="${p.specs.material||''}">
      <label>Jenis cetak</label><input id="pf-print" value="${p.specs.printType||''}">
      <label>Finishing</label><input id="pf-fin" value="${p.specs.finishing||''}">
      <label>Warna</label><input id="pf-col" value="${p.specs.color||''}">
      <label>Model</label><input id="pf-fold" value="${p.specs.fold||''}">
      <label>Amplop</label><input id="pf-env" value="${p.specs.envelope||''}">
      <h4>Harga per pcs</h4>
      ${QTYS.map(q=>`<label>${q} pcs</label><input type="number" id="pf-pr-${q}" value="${p.prices[q]||0}">`).join('')}
      <label>Min order</label><input type="number" id="pf-min" value="${p.minOrder||100}">
      <label>Biaya desain</label><input type="number" id="pf-xd" value="${p.extras.designFee||0}">
      <label>Amplop /pcs</label><input type="number" id="pf-xe" value="${p.extras.envelope||0}">
      <label>Finishing /pcs</label><input type="number" id="pf-xf" value="${p.extras.finishing||0}">
      <h4>Gambar desain</h4>
      <div id="pf-photos">${photoEditorHtml(p.photos||[])}</div>
      <button type="button" class="btn btn-ghost" onclick="addPhotoSlot()">+ Tambah sisi</button>
      <p class="muted">Klik <b>Ganti gambar</b> pada pratinjau, pilih file JPG/PNG/SVG dari HP atau komputer. Lalu Simpan.</p>
      <div class="row-actions">
        <button class="btn btn-primary" onclick="saveProduct('${p.id}')">Simpan</button>
        <button class="btn btn-ghost" onclick="$('#prod-form').innerHTML=''">Batal</button>
      </div>
    </div>
    <div>
      <h4>Preview</h4>
      <div class="preview-box" id="pf-prev" style="${photoStyle((p.photos||[])[0])}">
        <b>${p.code}</b><div>${p.name||'Nama produk'}</div>
        <div class="muted">${fmt(p.prices[100]||0)} /pcs</div>
      </div>
    </div>
  </div>`;
  window._editP = p;
}
function saveProduct(id){
  const p = LS21.products.get(id) || {id, createdAt:new Date().toISOString().slice(0,10), views:0, favorites:0, active:true, extras:{}, specs:{}, prices:{}};
  p.code=$('#pf-code').value; p.name=$('#pf-name').value; p.categoryId=$('#pf-cat').value;
  p.subcategory=$('#pf-sub').value; p.motif=$('#pf-motif').value; p.description=$('#pf-desc').value;
  p.badges=$('#pf-badge').value.split(',').map(s=>s.trim()).filter(Boolean);
  p.specs={ size:$('#pf-size').value, material:$('#pf-mat').value, printType:$('#pf-print').value, finishing:$('#pf-fin').value, color:$('#pf-col').value, fold:$('#pf-fold').value, envelope:$('#pf-env').value };
  p.prices={}; QTYS.forEach(q=>p.prices[q]=Number($('#pf-pr-'+q).value||0));
  p.minOrder=Number($('#pf-min').value||100);
  p.extras={ designFee:Number($('#pf-xd').value||0), envelope:Number($('#pf-xe').value||0), finishing:Number($('#pf-xf').value||0), custom:0 };
  p.photos = (window._editP && window._editP.photos) ? window._editP.photos : [];
  LS21.products.save(p); toast('Produk disimpan'); rendProduk();
}

function photoEditorHtml(photos){
  if(!photos.length) photos=[{type:'depan',color:'#c9a227'}];
  return photos.map((ph,i)=>`
    <div class="card" style="padding:10px;margin:8px 0">
      <div class="gmain" style="height:180px;${photoStyle(ph)}"></div>
      <label>Sisi</label>
      <input value="${ph.type||''}" onchange="window._editP.photos[${i}].type=this.value">
      <div class="row-actions">
        <label class="btn btn-primary" style="display:inline-block">Ganti gambar
          <input type="file" accept="image/*" hidden onchange="changePhotoFile(${i},this)">
        </label>
        <button type="button" class="btn btn-ghost" onclick="removePhotoSlot(${i})">Hapus sisi</button>
      </div>
    </div>`).join('');
}
function refreshPhotoEditor(){
  const box=$('#pf-photos'); if(!box||!window._editP) return;
  box.innerHTML=photoEditorHtml(window._editP.photos||[]);
  const prev=$('#pf-prev'); if(prev) prev.style.cssText=photoStyle((window._editP.photos||[])[0]);
}
function addPhotoSlot(){
  if(!window._editP) return;
  window._editP.photos=window._editP.photos||[];
  window._editP.photos.push({type:'sisi',color:'#c9a227'});
  refreshPhotoEditor();
}
function removePhotoSlot(i){
  window._editP.photos.splice(i,1);
  if(!window._editP.photos.length) window._editP.photos=[{type:'depan',color:'#c9a227'}];
  refreshPhotoEditor();
}
function changeDetailPhoto(input){
  const p=LS21.products.get(view.productId); if(!p) return;
  window._editP=structuredClone(p);
  const i=view.photo||0;
  if(!window._editP.photos[i]) window._editP.photos[i]={type:'depan',color:'#c9a227'};
  changePhotoFile(i,input);
  setTimeout(()=>{
    p.photos=window._editP.photos;
    LS21.products.save(p);
    renderDetail();
  },400);
}
function changePhotoFile(i, input){
  const file=input.files&&input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    const apply=(url)=>{
      window._editP.photos[i].url=url;
      window._editP.photos[i].color=window._editP.photos[i].color||'#c9a227';
      refreshPhotoEditor();
      toast('Gambar diganti. Klik Simpan.');
    };
    if(file.type==='image/svg+xml' || file.size<180000){ apply(reader.result); return; }
    const img=new Image();
    img.onload=()=>{
      const max=900, scale=Math.min(1, max/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      apply(c.toDataURL('image/jpeg',0.72));
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}

function rendKat(){
  const list = LS21.categories.all();
  $('#admin-content').innerHTML = `<h2>Kategori</h2>
    <button class="btn btn-primary" onclick="saveKat()">+ Kategori</button>
    <table><tr><th>Nama</th><th>Urutan</th><th>Status</th><th></th></tr>
    ${list.map(c=>`<tr>
      <td><input value="${c.name}" id="kn-${c.id}"></td>
      <td><input type="number" value="${c.order}" id="ko-${c.id}" style="width:70px"></td>
      <td>${c.active?'Aktif':'Nonaktif'}</td>
      <td>
        <button class="btn btn-ghost" onclick="updKat('${c.id}')">Simpan</button>
        <button class="btn btn-ghost" onclick="togKat('${c.id}')">${c.active?'Nonaktif':'Aktif'}</button>
      </td></tr>`).join('')}</table>`;
}
function saveKat(){
  const name = prompt('Nama kategori'); if(!name) return;
  LS21.categories.save({ id:'cat-'+Date.now(), name, slug:name.toLowerCase().replace(/\s+/g,'-'), active:true, order:99 });
  rendKat();
}
function updKat(id){ const c=LS21.categories.get(id); c.name=$('#kn-'+id).value; c.order=Number($('#ko-'+id).value); LS21.categories.save(c); rendKat(); }
function togKat(id){ const c=LS21.categories.get(id); c.active=!c.active; LS21.categories.save(c); rendKat(); }

function rendPesananAdm(){
  $('#admin-content').innerHTML = `<h2>Pesanan</h2>${orderTable(LS21.orders.all())}<div id="ord-detail"></div>`;
}
function openOrder(id){
  view.adminPage='pesanan';
  const o = LS21.orders.get(id);
  const lockCetak = o.design.accStatus!=='acc';
  $('#ord-detail').innerHTML = `<div class="card form">
    <h3>${o.number}</h3>
    <p>${o.customer.name} · ${o.customer.wa}<br>${o.couple.groom} & ${o.couple.bride} · ${o.couple.date}<br>${o.customer.address}</p>
    <p>${o.items.map(i=>`${i.name} × ${i.qty}`).join('<br>')}</p>
    <p>Total ${fmt(o.totals.total)} · Bayar ${o.paymentStatus} (${fmt(o.totals.paid)})</p>
    <label>Status produksi</label>
    <select id="st-prod">${STATUSES.map(s=>`<option value="${s}" ${o.productionStatus===s?'selected':''}>${STATUS_LABEL[s]}</option>`).join('')}</select>
    <label>Status bayar</label>
    <select id="st-pay"><option value="unpaid">Belum</option><option value="dp">DP</option><option value="paid">Lunas</option></select>
    <label>Deadline</label><input type="date" id="st-dl" value="${o.deadline||''}">
    <p class="muted">${lockCetak?'Tidak bisa cetak sebelum ACC desain.':''}</p>
    <button class="btn btn-primary" onclick="saveOrd('${o.id}')">Update</button>
  </div>`;
  $('#st-pay').value = o.paymentStatus;
}
function saveOrd(id){
  const o = LS21.orders.get(id);
  const next = $('#st-prod').value;
  if((next==='cetak'||next==='finishing'||next==='siap') && o.design.accStatus!=='acc'){
    toast('Desain belum ACC. Tidak bisa masuk cetak.'); return;
  }
  o.productionStatus=next; o.paymentStatus=$('#st-pay').value; o.deadline=$('#st-dl').value;
  LS21.orders.save(o); rendPesananAdm(); openOrder(id);
}

function rendDesain(){
  const list = LS21.orders.all();
  $('#admin-content').innerHTML = `<h2>Desain / ACC</h2>
    ${list.map(o=>`<div class="card">
      <b>${o.number}</b> · ${o.customer.name} · ACC: ${o.design.accStatus}
      <div class="form"><label>Catatan preview</label><input id="pv-${o.id}" placeholder="Draft 2">
      <button class="btn btn-primary" onclick="upPrev('${o.id}')">Unggah preview (simulasi)</button></div>
      ${(o.design.previews||[]).map(p=>`<div class="muted">Preview ${p.date}: ${p.note}</div>`).join('')}
      ${(o.design.revisions||[]).map(r=>`<div>Revisi pelanggan ${r.date}: ${r.note}</div>`).join('')}
    </div>`).join('')}`;
}
function upPrev(id){
  const o = LS21.orders.get(id);
  o.design.previews.push({ date:new Date().toISOString().slice(0,10), note: $('#pv-'+id).value||'Preview desain' });
  o.designStatus='preview'; o.productionStatus='acc'; o.design.accStatus='waiting';
  LS21.orders.save(o); toast('Preview diunggah (simulasi file lokal)'); rendDesain();
}

function rendCust(){
  const list = LS21.customers.all();
  $('#admin-content').innerHTML = `<h2>Pelanggan</h2>
    <table><tr><th>Nama</th><th>WA</th><th>Alamat</th><th>Trx</th><th>Total</th><th>Terakhir</th></tr>
    ${list.map(c=>`<tr><td>${c.name}</td><td>${c.wa}</td><td>${c.address||''}</td><td>${c.orders}</td><td>${fmt(c.total)}</td><td>${c.lastOrder||''}</td></tr>`).join('')}</table>`;
}

function rendLap(){
  const orders = LS21.orders.all();
  const omzet = orders.reduce((a,o)=>a+o.totals.total,0);
  const avg = orders.length? omzet/orders.length:0;
  const profit = Math.round(omzet*0.28);
  const a = LS21.analytics.get();
  const products = LS21.products.all();
  const sold = {};
  orders.forEach(o=>o.items.forEach(i=>{ sold[i.productId]=(sold[i.productId]||0)+i.qty; }));
  const bestP = [...products].sort((x,y)=>(sold[y.id]||0)-(sold[x.id]||0))[0];
  const bestC = {};
  orders.forEach(o=>o.items.forEach(i=>{ const p=LS21.products.get(i.productId); if(p) bestC[p.categoryId]=(bestC[p.categoryId]||0)+i.qty; }));
  const topCat = Object.entries(bestC).sort((a,b)=>b[1]-a[1])[0];
  const views = products.map(p=>({p, v:p.views||0, s:sold[p.id]||0}));
  const highViewLowOrder = views.filter(x=>x.v>50 && x.s<200);
  const lowView = views.filter(x=>x.v<50);
  const favs = LS21.favorites.ids().length;
  const conv = a.visits? Math.round((orders.length/a.visits)*1000)/10 : 0;
  $('#admin-content').innerHTML = `<h2>Laporan</h2>
    <div class="stats">
      <div class="stat"><b>${fmt(omzet)}</b><span>Omzet</span></div>
      <div class="stat"><b>${orders.length}</b><span>Pesanan</span></div>
      <div class="stat"><b>${fmt(avg)}</b><span>Rata-rata</span></div>
      <div class="stat"><b>${fmt(profit)}</b><span>Estimasi profit</span></div>
      <div class="stat"><b>${a.visits}</b><span>Kunjungan</span></div>
      <div class="stat"><b>${favs}</b><span>Favorit</span></div>
      <div class="stat"><b>${a.waClicks}</b><span>Klik WA</span></div>
      <div class="stat"><b>${conv}%</b><span>Conversion</span></div>
    </div>
    <div class="card"><h3>Funnel</h3>
      Lihat Produk (${products.reduce((a,p)=>a+(p.views||0),0)}) → Favorit (${favs}) → WA/Keranjang (${a.waClicks + LS21.cart.items().length}) → Pesanan (${orders.length})
    </div>
    <div class="card">Produk terlaris: ${bestP? bestP.name:'-'}<br>Kategori terlaris: ${topCat? catName(topCat[0]):'-'}</div>
    <div class="card"><h3>Rekomendasi</h3>
      ${highViewLowOrder.map(x=>`<div>${x.p.name}: Evaluasi Harga / Desain (banyak dilihat, sedikit dipesan)</div>`).join('')}
      ${lowView.map(x=>`<div>${x.p.name}: Tingkatkan Promosi</div>`).join('')}
      ${views.filter(x=>x.s>300).map(x=>`<div>${x.p.name}: Pertahankan</div>`).join('')}
    </div>
    <div class="row-actions">
      <button class="btn btn-ghost" onclick="exportXLS()">Export Excel (CSV)</button>
      <button class="btn btn-ghost" onclick="window.print()">Print / PDF</button>
    </div>
    <p class="muted">Export PDF native dan traffic source akurat membutuhkan backend. Saat ini simulasi + print browser.</p>`;
}
function exportXLS(){
  const rows = [['No','Tanggal','Pelanggan','Total','Status']].concat(
    LS21.orders.all().map(o=>[o.number,o.createdAt,o.customer.name,o.totals.total,o.productionStatus])
  );
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='laporan-lorongsatu21.csv'; a.click();
}

function rendSet(){
  const s = structuredClone(LS21.settings.get());
  $('#admin-content').innerHTML = `<h2>Pengaturan</h2><div class="card form">
    <label>Nama toko</label><input id="s-name" value="${s.storeName}">
    <label>Tagline</label><input id="s-tag" value="${s.tagline}">
    <label>Alamat</label><input id="s-addr" value="${s.address}">
    <label>WhatsApp</label><input id="s-wa" value="${s.whatsapp}">
    <label>Telepon</label><input id="s-ph" value="${s.phone}">
    <label>Instagram</label><input id="s-ig" value="${s.instagram}">
    <label>Facebook</label><input id="s-fb" value="${s.facebook}">
    <label>Jam</label><input id="s-hr" value="${s.hours}">
    <label>DP %</label><input id="s-dp" type="number" value="${s.dpPercent}">
    <label>Estimasi hari produksi</label><input id="s-days" type="number" value="${s.productionDays}">
    <label><input type="checkbox" id="s-price" ${s.catalog.showPrice?'checked':''}> Tampilkan harga</label>
    <label><input type="checkbox" id="s-fav" ${s.catalog.showFavorite?'checked':''}> Favorit</label>
    <label><input type="checkbox" id="s-wa2" ${s.catalog.showWhatsApp?'checked':''}> Tombol WA</label>
    <button class="btn btn-primary" onclick="saveSet()">Simpan pengaturan</button>
    <button class="btn btn-ghost" onclick="if(confirm('Reset data contoh di server?')){LS21.reset().then(()=>location.reload())}">Reset data contoh</button>
  </div>`;
}
function saveSet(){
  const s = LS21.settings.get();
  s.storeName=$('#s-name').value; s.tagline=$('#s-tag').value; s.address=$('#s-addr').value;
  s.whatsapp=$('#s-wa').value; s.phone=$('#s-ph').value; s.instagram=$('#s-ig').value; s.facebook=$('#s-fb').value;
  s.hours=$('#s-hr').value; s.dpPercent=Number($('#s-dp').value); s.productionDays=Number($('#s-days').value);
  s.catalog.showPrice=$('#s-price').checked; s.catalog.showFavorite=$('#s-fav').checked; s.catalog.showWhatsApp=$('#s-wa2').checked;
  LS21.settings.save(s); toast('Pengaturan disimpan'); renderCustomer();
}

function toast(m){
  let t=$('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1e3a5f;color:#fff;padding:10px 14px;border-radius:10px;z-index:99'; document.body.appendChild(t); }
  t.textContent=m; t.style.display='block'; setTimeout(()=>t.style.display='none',2200);
}

function go(page){ view.page=page; renderCustomer(); }
function adminGo(p){ view.adminPage=p; renderAdmin(); }

window.addEventListener('DOMContentLoaded', async ()=>{
  try { await LS21.ready(); } catch(e){ toast('Tidak terhubung ke server. Jalankan node server.js'); }
  LS21.analytics.visit();
  $('#q-home').addEventListener('input', e=>{ view.filters.q=e.target.value; });
  $('#q-home').addEventListener('keydown', e=>{ if(e.key==='Enter'){ view.page='katalog'; renderCustomer(); }});
  renderCustomer();
});
