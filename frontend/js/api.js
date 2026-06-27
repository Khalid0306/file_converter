/* ============================================================
   Couche API — wrapper Fetch
   - injecte le JWT (Authorization: Bearer <token>)
   - redirige vers /login sur 401
   - bascule sur des données fictives en DEMO_MODE si l'API
     est injoignable
   ============================================================ */

/* ---------- Helpers session ---------- */
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch (_) { return null; }
}
function setSession(user, token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/* ---------- Garde de route ---------- */
function requireAuth() {
  if (!getToken()) { window.location.href = 'login.html'; return false; }
  return true;
}
function redirectToLogin() {
  clearSession();
  if (!location.pathname.endsWith('login.html')) {
    window.location.href = 'login.html';
  }
}

/* ---------- Requête principale ---------- */
/**
 * @param {string} path  ex: '/api/conversions'
 * @param {object} opts  { method, body, isForm, raw }
 *   - body: objet JSON ou FormData
 *   - isForm: true => multipart (ne pas sérialiser, pas de content-type)
 *   - raw: true => renvoie la Response brute (pour les téléchargements blob)
 */
async function api(path, opts = {}) {
  const { method = 'GET', body = null, isForm = false, raw = false } = opts;
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const init = { method, headers };
  if (body != null) {
    if (isForm) {
      init.body = body; // FormData — le navigateur pose le boundary
    } else {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
  }

  try {
    const res = await fetch(API_BASE + path, init);

    if (res.status === 401) {
      redirectToLogin();
      throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);
    }
    if (raw) {
      if (!res.ok) throw new ApiError(await safeMsg(res), res.status);
      return res;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(data.message || data.error || 'Une erreur est survenue.', res.status);
    }
    return data;
  } catch (err) {
    // Erreur réseau (API down) -> fallback démo
    if (DEMO_MODE && (err instanceof TypeError)) {
      return mockApi(path, method, body, isForm, raw);
    }
    throw err;
  }
}

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; this.name = 'ApiError'; }
}

async function safeMsg(res) {
  try { const d = await res.json(); return d.message || d.error || ('Erreur ' + res.status); }
  catch (_) { return 'Erreur ' + res.status; }
}

/* ============================================================
   DONNÉES FICTIVES (DEMO_MODE)
   Persistées dans localStorage pour que add/delete fonctionnent.
   ============================================================ */
const DEMO_STORE_KEY = 'demo_conversions';
const DEMO_USERS_KEY = 'demo_users';

function seedDemo() {
  if (!localStorage.getItem(DEMO_STORE_KEY)) {
    const now = Date.now();
    const sample = [
      { id: 7, file_name: 'rapport_q2.xlsx', from_format: 'xlsx', to_format: 'json', file_size: 248320, status: 'completed', created_at: fmtTs(now - 1000*60*12) },
      { id: 6, file_name: 'contacts.csv',    from_format: 'csv',  to_format: 'json', file_size: 18204,  status: 'completed', created_at: fmtTs(now - 1000*60*60*3) },
      { id: 5, file_name: 'export.xml',      from_format: 'xml',  to_format: 'csv',  file_size: 1048576,status: 'completed', created_at: fmtTs(now - 1000*60*60*26) },
      { id: 4, file_name: 'produits.json',   from_format: 'json', to_format: 'xml',  file_size: 92160,  status: 'failed',    created_at: fmtTs(now - 1000*60*60*52) },
      { id: 3, file_name: 'commandes.csv',   from_format: 'csv',  to_format: 'xml',  file_size: 5320,   status: 'completed', created_at: fmtTs(now - 1000*60*60*120) },
    ];
    localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(sample));
  }
  if (!localStorage.getItem(DEMO_USERS_KEY)) {
    const users = [
      { id: 1, name: 'Admin Root', email: 'admin@test.com', role: 'admin', created_at: '2026-01-04 09:21:00' },
      { id: 2, name: 'Alice Martin', email: 'alice@test.com', role: 'user', created_at: '2026-02-18 14:02:00' },
      { id: 3, name: 'Bruno Lefevre', email: 'bruno@test.com', role: 'user', created_at: '2026-03-30 11:47:00' },
      { id: 4, name: 'Chloé Dubois', email: 'chloe@test.com', role: 'user', created_at: '2026-05-12 16:30:00' },
    ];
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  }
}
function fmtTs(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.000000`;
}
function readDemo() { seedDemo(); return JSON.parse(localStorage.getItem(DEMO_STORE_KEY)); }
function writeDemo(arr) { localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(arr)); }
function readDemoUsers() { seedDemo(); return JSON.parse(localStorage.getItem(DEMO_USERS_KEY)); }
function writeDemoUsers(arr) { localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(arr)); }

async function mockApi(path, method, body, isForm, raw) {
  await sleep(420 + Math.random() * 420); // latence réaliste
  const url = new URL(API_BASE + path);
  const p = url.pathname;
  const q = url.searchParams;

  // ---- AUTH ----
  if (p === '/api/auth/login' && method === 'POST') {
    const email = (body && body.email || '').toLowerCase();
    const isAdmin = email.startsWith('admin');
    return {
      user: {
        id: isAdmin ? 1 : 2,
        name: isAdmin ? 'Admin Root' : 'Alice Martin',
        email: email || 'alice@test.com',
        role: isAdmin ? 'admin' : 'user',
      },
      token: 'demo.jwt.' + Math.random().toString(36).slice(2),
    };
  }
  if (p === '/api/auth/logout') return { ok: true };

  // ---- CONVERSIONS (user) ----
  if (p === '/api/conversions' && method === 'POST') {
    // body = FormData
    const file = body.get('file');
    const to = body.get('to_format');
    const name = file ? file.name : 'fichier';
    const from = (name.split('.').pop() || 'txt').toLowerCase();
    const item = {
      id: Date.now() % 100000,
      file_name: name.replace(/\.[^.]+$/, '') + '.' + to,
      from_format: from,
      to_format: to,
      file_size: file ? file.size : 1024,
      status: 'completed',
      created_at: fmtTs(Date.now()),
    };
    const all = readDemo(); all.unshift(item); writeDemo(all);
    return { conversion: item };
  }
  if (p === '/api/conversions' && method === 'GET') {
    let list = readDemo().slice();
    const from = q.get('from_format'), to = q.get('to_format');
    if (from) list = list.filter(c => c.from_format === from);
    if (to)   list = list.filter(c => c.to_format === to);
    const sort = q.get('sort'), order = q.get('order') || 'desc';
    if (sort) {
      list.sort((a, b) => {
        let av = a[sort], bv = b[sort];
        if (sort === 'file_size') { av = +av; bv = +bv; }
        if (av < bv) return order === 'asc' ? -1 : 1;
        if (av > bv) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return { conversions: list };
  }
  let m;
  if ((m = p.match(/^\/api\/conversions\/(\d+)\/download$/)) && method === 'GET') {
    const id = +m[1];
    const item = readDemo().find(c => c.id === id) || { file_name: 'fichier.txt', to_format: 'txt' };
    return raw ? mockBlobResponse(item) : { ok: true };
  }
  if ((m = p.match(/^\/api\/conversions\/(\d+)$/)) && method === 'DELETE') {
    const id = +m[1];
    writeDemo(readDemo().filter(c => c.id !== id));
    return { ok: true };
  }

  // ---- ADMIN ----
  if (p === '/api/admin/stats') {
    const all = readDemo();
    return {
      total_users: readDemoUsers().length,
      total_conversions: all.length,
      storage_used: all.reduce((s, c) => s + c.file_size, 0),
      success_rate: Math.round(all.filter(c => c.status === 'completed').length / Math.max(all.length,1) * 100),
    };
  }
  if (p === '/api/admin/users' && method === 'GET') return { users: readDemoUsers() };
  if ((m = p.match(/^\/api\/admin\/users\/(\d+)$/))) {
    const id = +m[1];
    if (method === 'PUT') {
      const users = readDemoUsers().map(u => u.id === id ? { ...u, ...body } : u);
      writeDemoUsers(users);
      return { user: users.find(u => u.id === id) };
    }
    if (method === 'DELETE') {
      writeDemoUsers(readDemoUsers().filter(u => u.id !== id));
      return { ok: true };
    }
  }
  if (p === '/api/admin/conversions') return { conversions: readDemo() };

  // défaut
  return raw ? mockBlobResponse({ file_name: 'fichier.txt', to_format: 'txt' }) : {};
}

function mockBlobResponse(item) {
  const content = sampleContent(item.to_format || 'txt');
  const blob = new Blob([content], { type: 'application/octet-stream' });
  return {
    ok: true,
    headers: { get: () => `attachment; filename="${item.file_name}"` },
    blob: async () => blob,
    _filename: item.file_name,
  };
}
function sampleContent(fmt) {
  if (fmt === 'json') return JSON.stringify([{ id: 1, name: 'Alice', active: true }, { id: 2, name: 'Bruno', active: false }], null, 2);
  if (fmt === 'csv')  return 'id,name,active\n1,Alice,true\n2,Bruno,false\n';
  if (fmt === 'xml')  return '<?xml version="1.0"?>\n<rows>\n  <row><id>1</id><name>Alice</name></row>\n  <row><id>2</id><name>Bruno</name></row>\n</rows>\n';
  return 'Fichier de démonstration — File Converter\n';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
