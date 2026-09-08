const LS21 = (() => {
  const LOCAL_KEY = 'lorongsatu21_device_v2';
  const TOKEN_KEY = 'lorongsatu21_token';
  const API = '';

  let db = {
    settings: { storeName: 'LORONGSATU21', tagline: '', catalog: { showPrice: true, showFavorite: true, showWhatsApp: true }, payments: [], pickupMethods: [], banners: [{}], productionDays: 7, whatsapp: '' },
    categories: [], products: [], orders: [], customers: [],
    favorites: [], cart: [], compare: [],
    analytics: { productViews: {}, waClicks: 0, visits: 0 },
    counters: { product: 8, order: 3 },
    session: { role: 'customer', adminAuthed: false }
  };

  function loadDevice() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      db.cart = d.cart || [];
      db.favorites = d.favorites || [];
      db.compare = d.compare || [];
    } catch (e) {}
    db.session.adminAuthed = !!localStorage.getItem(TOKEN_KEY);
  }

  function saveDevice() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ cart: db.cart, favorites: db.favorites, compare: db.compare }));
  }

  function token() { return localStorage.getItem(TOKEN_KEY) || ''; }

  async function pull() {
    const r = await fetch(API + '/api/db');
    if (!r.ok) throw new Error('Gagal memuat data server');
    const remote = await r.json();
    db.products = remote.products || [];
    db.categories = remote.categories || [];
    db.orders = remote.orders || [];
    db.customers = remote.customers || [];
    db.settings = remote.settings;
    db.analytics = remote.analytics || db.analytics;
    db.counters = remote.counters || db.counters;
  }

  let pushTimer;
  function pushSoon() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushAdmin, 400);
  }

  async function pushAdmin() {
    if (!token()) return;
    await fetch(API + '/api/db', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      body: JSON.stringify({
        products: db.products, categories: db.categories, orders: db.orders,
        customers: db.customers, settings: db.settings, analytics: db.analytics, counters: db.counters
      })
    });
  }

  loadDevice();

  const api = {
    ready: pull,
    get: () => db,
    persist() { saveDevice(); pushSoon(); },
    async reset() {
      if (!token()) return;
      await fetch(API + '/api/reset', { method: 'POST', headers: { Authorization: 'Bearer ' + token() } });
      await pull();
    },
    async login(user, pass) {
      const r = await fetch(API + '/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass })
      });
      if (!r.ok) return false;
      const j = await r.json();
      localStorage.setItem(TOKEN_KEY, j.token);
      db.session.adminAuthed = true;
      return true;
    },
    logout() {
      localStorage.removeItem(TOKEN_KEY);
      db.session.adminAuthed = false;
    },
    products: {
      all: (onlyActive = false) => onlyActive ? db.products.filter(p => p.active) : db.products,
      get: (id) => db.products.find(p => p.id === id),
      nextCode() {
        db.counters.product += 1;
        pushSoon();
        return 'LS-U-' + String(db.counters.product).padStart(4, '0');
      },
      save(p) {
        const i = db.products.findIndex(x => x.id === p.id);
        if (i >= 0) db.products[i] = p; else db.products.unshift(p);
        pushSoon();
      },
      remove(id) { db.products = db.products.filter(p => p.id !== id); pushSoon(); }
    },
    categories: {
      all: (onlyActive = false) => {
        const list = [...db.categories].sort((a, b) => a.order - b.order);
        return onlyActive ? list.filter(c => c.active) : list;
      },
      get: (id) => db.categories.find(c => c.id === id),
      save(c) {
        const i = db.categories.findIndex(x => x.id === c.id);
        if (i >= 0) db.categories[i] = c; else db.categories.push(c);
        pushSoon();
      },
      remove(id) { db.categories = db.categories.filter(c => c.id !== id); pushSoon(); }
    },
    cart: {
      items: () => db.cart,
      add(item) {
        const ex = db.cart.find(i => i.productId === item.productId && i.qty === item.qty);
        if (ex) ex.qty = item.qty; else db.cart.push(item);
        saveDevice();
      },
      update(idx, item) { db.cart[idx] = item; saveDevice(); },
      remove(idx) { db.cart.splice(idx, 1); saveDevice(); },
      clear() { db.cart = []; saveDevice(); }
    },
    favorites: {
      ids: () => db.favorites,
      toggle(id) {
        const i = db.favorites.indexOf(id);
        if (i >= 0) db.favorites.splice(i, 1); else db.favorites.push(id);
        saveDevice();
        return db.favorites.includes(id);
      },
      has: (id) => db.favorites.includes(id)
    },
    compare: {
      ids: () => db.compare,
      toggle(id) {
        const i = db.compare.indexOf(id);
        if (i >= 0) db.compare.splice(i, 1);
        else if (db.compare.length < 3) db.compare.push(id);
        saveDevice();
      },
      clear() { db.compare = []; saveDevice(); }
    },
    orders: {
      all: () => [...db.orders].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
      get: (id) => db.orders.find(o => o.id === id || o.number === id),
      nextNumber() {
        db.counters.order += 1;
        return 'LS-INV-2026-' + String(db.counters.order).padStart(4, '0');
      },
      save(o) {
        const i = db.orders.findIndex(x => x.id === o.id);
        const isNew = i < 0;
        if (isNew) db.orders.unshift(o); else db.orders[i] = o;
        if (isNew) {
          fetch(API + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) })
            .then(() => pull());
        } else {
          fetch(API + '/api/orders/' + encodeURIComponent(o.id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: token() ? 'Bearer ' + token() : '' },
            body: JSON.stringify(o)
          }).then(() => pull());
        }
      }
    },
    customers: {
      all: () => db.customers,
      upsert(c) {
        const i = db.customers.findIndex(x => x.wa === c.wa);
        if (i >= 0) {
          db.customers[i].orders += 1;
          db.customers[i].total += c.addTotal || 0;
          db.customers[i].lastOrder = c.lastOrder;
          db.customers[i].name = c.name;
          db.customers[i].address = c.address || db.customers[i].address;
        } else {
          db.customers.push({
            id: 'c' + Date.now(), name: c.name, wa: c.wa, address: c.address || '',
            orders: 1, total: c.addTotal || 0, lastOrder: c.lastOrder
          });
        }
      }
    },
    settings: {
      get: () => db.settings,
      save(s) { db.settings = s; pushSoon(); }
    },
    analytics: {
      visit() { fetch(API + '/api/analytics/visit', { method: 'POST' }); },
      viewProduct(id) {
        const p = db.products.find(x => x.id === id);
        if (p) p.views = (p.views || 0) + 1;
        fetch(API + '/api/analytics/view/' + encodeURIComponent(id), { method: 'POST' });
      },
      waClick() { fetch(API + '/api/analytics/wa', { method: 'POST' }); },
      get: () => db.analytics
    },
    session: db.session
  };
  return api;
})();
