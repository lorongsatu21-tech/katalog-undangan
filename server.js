const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'lorongsatu21';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'ls21-change-this-secret';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function seed() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));
}

function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    const db0 = seed();
    fs.writeFileSync(DB_FILE, JSON.stringify(db0, null, 2));
    return db0;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDb(db) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

let db = loadDb();

function signToken() {
  const exp = Date.now() + 1000 * 60 * 60 * 12;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function checkToken(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return false;
  const [payload, sig] = token.split('.');
  const expect = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (sig !== expect) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.role === 'admin' && data.exp > Date.now();
  } catch {
    return false;
  }
}

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  })[ext] || 'application/octet-stream';
}

function send(res, code, body, headers) {
  headers = headers || {};
  const isObj = body && typeof body === 'object' && !Buffer.isBuffer(body);
  const data = isObj ? JSON.stringify(body) : body;
  res.writeHead(code, Object.assign({
    'Content-Type': isObj ? 'application/json; charset=utf-8' : (headers['Content-Type'] || 'text/plain; charset=utf-8'),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS'
  }, headers));
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'Forbidden');
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    return send(res, 200, fs.readFileSync(file), { 'Content-Type': mime(file) });
  }
  const up = path.normalize(path.join(__dirname, rel));
  if (rel.startsWith('/uploads/') && fs.existsSync(up) && fs.statSync(up).isFile()) {
    return send(res, 200, fs.readFileSync(up), { 'Content-Type': mime(up) });
  }
  send(res, 200, fs.readFileSync(path.join(PUBLIC, 'index.html')), { 'Content-Type': 'text/html; charset=utf-8' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  if (req.method === 'OPTIONS') return send(res, 204, '');
  try {
    if (p === '/api/health') return send(res, 200, { ok: true, store: 'LORONGSATU21' });
    if (p === '/api/db' && req.method === 'GET') {
      const { products, categories, orders, customers, settings, analytics, counters } = db;
      return send(res, 200, { products, categories, orders, customers, settings, analytics, counters, mode: 'server' });
    }
    if (p === '/api/login' && req.method === 'POST') {
      const body = await readBody(req);
      if (body.user === ADMIN_USER && body.pass === ADMIN_PASS) {
        return send(res, 200, { token: signToken(), user: body.user });
      }
      return send(res, 401, { error: 'Login gagal' });
    }
    if (p === '/api/db' && req.method === 'PUT') {
      if (!checkToken(req)) return send(res, 401, { error: 'Admin required' });
      const body = await readBody(req);
      db.products = body.products || db.products;
      db.categories = body.categories || db.categories;
      db.orders = body.orders || db.orders;
      db.customers = body.customers || db.customers;
      db.settings = body.settings || db.settings;
      db.analytics = body.analytics || db.analytics;
      db.counters = body.counters || db.counters;
      saveDb(db);
      return send(res, 200, { ok: true });
    }
    if (p === '/api/orders' && req.method === 'POST') {
      const o = await readBody(req);
      if (!o.customer || !o.items) return send(res, 400, { error: 'Invalid order' });
      if (!o.number) {
        db.counters.order = (db.counters.order || 0) + 1;
        o.number = 'LS-INV-2026-' + String(db.counters.order).padStart(4, '0');
      }
      o.id = o.id || 'o' + Date.now();
      o.createdAt = o.createdAt || new Date().toISOString();
      db.orders.unshift(o);
      const c = o.customer;
      const i = db.customers.findIndex(x => x.wa === c.wa);
      if (i >= 0) {
        db.customers[i].orders += 1;
        db.customers[i].total += (o.totals && o.totals.total) || 0;
        db.customers[i].lastOrder = o.number;
        db.customers[i].name = c.name;
        db.customers[i].address = c.address || db.customers[i].address;
      } else {
        db.customers.push({
          id: 'c' + Date.now(), name: c.name, wa: c.wa, address: c.address || '',
          orders: 1, total: (o.totals && o.totals.total) || 0, lastOrder: o.number
        });
      }
      saveDb(db);
      return send(res, 200, o);
    }
    if (p.startsWith('/api/orders/') && req.method === 'PATCH') {
      const id = decodeURIComponent(p.slice('/api/orders/'.length));
      const o = db.orders.find(x => x.id === id || x.number === id);
      if (!o) return send(res, 404, { error: 'Not found' });
      const patch = await readBody(req);
      if (patch.design) o.design = patch.design;
      if (patch.designStatus) o.designStatus = patch.designStatus;
      if (patch.productionStatus) {
        if (['cetak', 'finishing', 'siap'].includes(patch.productionStatus) && o.design.accStatus !== 'acc') {
          return send(res, 400, { error: 'Belum ACC' });
        }
        o.productionStatus = patch.productionStatus;
      }
      if (patch.paymentStatus) o.paymentStatus = patch.paymentStatus;
      if (patch.deadline) o.deadline = patch.deadline;
      if (patch.totals) o.totals = patch.totals;
      saveDb(db);
      return send(res, 200, o);
    }
    if (p === '/api/analytics/visit' && req.method === 'POST') {
      db.analytics.visits = (db.analytics.visits || 0) + 1;
      saveDb(db);
      return send(res, 200, { visits: db.analytics.visits });
    }
    if (p.startsWith('/api/analytics/view/') && req.method === 'POST') {
      const id = decodeURIComponent(p.slice('/api/analytics/view/'.length));
      db.analytics.productViews = db.analytics.productViews || {};
      db.analytics.productViews[id] = (db.analytics.productViews[id] || 0) + 1;
      const prod = db.products.find(x => x.id === id);
      if (prod) prod.views = (prod.views || 0) + 1;
      saveDb(db);
      return send(res, 200, { ok: true });
    }
    if (p === '/api/analytics/wa' && req.method === 'POST') {
      db.analytics.waClicks = (db.analytics.waClicks || 0) + 1;
      saveDb(db);
      return send(res, 200, { waClicks: db.analytics.waClicks });
    }
    if (p === '/api/reset' && req.method === 'POST') {
      if (!checkToken(req)) return send(res, 401, { error: 'Admin required' });
      db = seed();
      saveDb(db);
      return send(res, 200, { ok: true });
    }
    if (p.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
    serveStatic(req, res, p);
  } catch (err) {
    send(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, () => {
  console.log('LORONGSATU21 running on http://localhost:' + PORT);
});
