/* ============================================================
   Composants & utilitaires partagés
   - navbar (rendue dynamiquement dans #navbar)
   - formatBytes, formatDate, format badges
   - logout
   ============================================================ */

/* ---------- Préférences utilisateur (persistées en localStorage) ----------
   Aucun endpoint : les réglages vivent côté client et sont lus par les
   autres pages (format par défaut, accent, animations, toasts). */
const SETTINGS_KEY = 'settings';
const DEFAULT_SETTINGS = {
  theme:         'dark',   // 'dark' | 'light' | 'auto' (suit le système)
  defaultFormat: 'json',   // format de sortie pré-sélectionné sur Convertir
  autoDownload:  false,    // télécharger automatiquement après conversion
  accent:        'violet', // thème d'accent (voir ACCENTS)
  reduceMotion:  false,    // désactive les animations d'apparition
  successToasts: true,     // affiche les notifications de succès
};
const ACCENTS = {
  violet:  { label: 'Violet',   grad: 'linear-gradient(120deg, #8b5cf6 0%, #5b8def 100%)', v: '#8b5cf6', b: '#5b8def' },
  ocean:   { label: 'Océan',    grad: 'linear-gradient(120deg, #3b82f6 0%, #06b6d4 100%)', v: '#3b82f6', b: '#06b6d4' },
  magenta: { label: 'Magenta',  grad: 'linear-gradient(120deg, #a855f7 0%, #ec4899 100%)', v: '#a855f7', b: '#ec4899' },
  emeraude:{ label: 'Émeraude', grad: 'linear-gradient(120deg, #10b981 0%, #14b8a6 100%)', v: '#10b981', b: '#14b8a6' },
};
function getSettings() {
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) }; }
  catch (_) { return { ...DEFAULT_SETTINGS }; }
}
function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  applyAppearance();
  return next;
}
function resolveTheme(theme) {
  if (theme === 'auto') {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  return theme === 'light' ? 'light' : 'dark';
}
function applyAppearance() {
  const s = getSettings();
  const a = ACCENTS[s.accent] || ACCENTS.violet;
  const root = document.documentElement;
  root.style.setProperty('--grad', a.grad);
  root.style.setProperty('--violet', a.v);
  root.style.setProperty('--blue', a.b);
  root.setAttribute('data-theme', resolveTheme(s.theme));
}
// Applique le thème/accent au plus tôt (avant le rendu de la navbar)
// et réagit aux changements système quand le mode « Système » est actif.
applyAppearance();
if (window.matchMedia) {
  try {
    window.matchMedia('(prefers-color-scheme: light)')
      .addEventListener('change', () => { if (getSettings().theme === 'auto') applyAppearance(); });
  } catch (_) { /* navigateurs anciens */ }
}

/* ---------- Animations d'apparition (Web Animations API) ----------
   Les éléments .animate-* sont visibles par défaut (CSS). On ajoute
   un mouvement subtil via WAAPI. Si l'animation ne peut pas s'exécuter
   (onglet masqué, DOM cloné pour capture), l'élément reste visible. */
function playEntrance(scope) {
  if (getSettings().reduceMotion) return; // l'utilisateur a réduit les animations
  const root = scope || document;
  const els = root.querySelectorAll('.animate-fade-up, .animate-pop, .animate-fade-in, .stagger > *');
  els.forEach((el) => {
    if (el.__entered) return;
    el.__entered = true;
    let from, dur = 520, ease = 'cubic-bezier(.2,.7,.2,1)';
    // NOTE: on n'anime jamais l'opacité en dessous de 1 — uniquement le
    // transform. Ainsi le contenu reste toujours visible, même si la
    // timeline est gelée (onglet masqué) ou le DOM cloné (capture).
    if (el.classList.contains('animate-pop')) {
      from = { transform: 'scale(.975)' }; dur = 340; ease = 'cubic-bezier(.2,.8,.2,1)';
    } else if (el.classList.contains('animate-fade-in')) {
      from = { transform: 'translateY(4px)' }; dur = 420; ease = 'ease';
    } else {
      from = { transform: 'translateY(11px)' };
    }
    let delay = 0;
    if (el.style.animationDelay) delay = parseFloat(el.style.animationDelay) * 1000 || 0;
    if (el.parentElement && el.parentElement.classList.contains('stagger')) {
      delay = Array.prototype.indexOf.call(el.parentElement.children, el) * 45;
    }
    try {
      el.animate([{ ...from, opacity: 1 }, { transform: 'none', opacity: 1 }],
        { duration: dur, delay, easing: ease, fill: 'none' });
    } catch (_) { /* WAAPI indisponible : l'élément reste visible */ }
  });
}

// Au chargement + sur tout contenu ajouté dynamiquement (listes, modales, résultats)
document.addEventListener('DOMContentLoaded', () => playEntrance(document));
const __entranceObserver = new MutationObserver((muts) => {
  for (const m of muts) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches && node.matches('.animate-fade-up, .animate-pop, .animate-fade-in')) playEntrance(node.parentElement || node);
      else playEntrance(node);
    }
  }
});
if (document.body) __entranceObserver.observe(document.body, { childList: true, subtree: true });
else document.addEventListener('DOMContentLoaded', () => __entranceObserver.observe(document.body, { childList: true, subtree: true }));

/* ---------- Formatters ---------- */
function formatBytes(bytes) {
  bytes = +bytes || 0;
  if (bytes < 1024) return bytes + ' o';
  const ko = bytes / 1024;
  if (ko < 1024) return ko.toFixed(ko < 10 ? 1 : 0) + ' Ko';
  const mo = ko / 1024;
  if (mo < 1024) return mo.toFixed(mo < 10 ? 1 : 0) + ' Mo';
  return (mo / 1024).toFixed(1) + ' Go';
}

function formatDate(raw) {
  if (!raw) return '—';
  // "2026-06-24 13:10:26.71558" -> Date
  const iso = String(raw).replace(' ', 'T').replace(/\.\d+$/, '');
  const d = new Date(iso);
  if (isNaN(d)) return raw;
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff/3600)} h`;
  if (diff < 86400*7) return `il y a ${Math.floor(diff/86400)} j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateFull(raw) {
  if (!raw) return '—';
  const iso = String(raw).replace(' ', 'T').replace(/\.\d+$/, '');
  const d = new Date(iso);
  if (isNaN(d)) return raw;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) +
         ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const FORMAT_TONE = {
  csv:  'text-emerald-300 bg-emerald-400/10 ring-emerald-400/20',
  json: 'text-amber-300 bg-amber-400/10 ring-amber-400/20',
  xml:  'text-sky-300 bg-sky-400/10 ring-sky-400/20',
  xlsx: 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/20',
};
function formatBadge(fmt) {
  const tone = FORMAT_TONE[fmt] || 'text-[#9a9aa6] bg-white/5 ring-white/10';
  return `<span class="font-mono text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded-md ring-1 ${tone}">${escapeHtml(fmt || '?')}</span>`;
}

function statusBadge(status) {
  if (status === 'completed') return `<span class="inline-flex items-center gap-1.5 text-xs text-emerald-300"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Terminé</span>`;
  if (status === 'failed')    return `<span class="inline-flex items-center gap-1.5 text-xs text-rose-300"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>Échec</span>`;
  if (status === 'processing')return `<span class="inline-flex items-center gap-1.5 text-xs text-amber-300"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>En cours</span>`;
  return `<span class="inline-flex items-center gap-1.5 text-xs text-[#8a8a96]"><span class="w-1.5 h-1.5 rounded-full bg-[#5c5c66]"></span>${escapeHtml(status||'—')}</span>`;
}

/* ---------- Logo ---------- */
function logoMark(size = 30) {
  return `<span class="relative inline-grid place-items-center rounded-[9px] bg-grad shrink-0" style="width:${size}px;height:${size}px;box-shadow:0 4px 14px -4px rgba(139,92,246,.7)">
    <svg viewBox="0 0 24 24" fill="none" style="width:${Math.round(size*0.58)}px;height:${Math.round(size*0.58)}px">
      <path d="M9 4.5L4.5 9M4.5 9L9 13.5M4.5 9H14.5C16.5 9 18 10.5 18 12.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 19.5L19.5 15M19.5 15L15 10.5M19.5 15H9.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>
    </svg>
  </span>`;
}

/* ---------- Navbar ---------- */
function renderNavbar(active) {
  const mount = document.getElementById('navbar');
  if (!mount) return;
  applyAppearance();
  const user = getUser() || { name: 'Utilisateur', role: 'user' };
  const isAdmin = user.role === 'admin';
  const initial = (user.name || 'U').trim().charAt(0).toUpperCase();

  const link = (id, href, label) =>
    `<a href="${href}" class="nav-link ${active === id ? 'active' : ''} text-sm font-medium px-2.5 py-1.5 rounded-lg">${label}</a>`;

  mount.innerHTML = `
  <header class="fixed top-0 inset-x-0 z-50 glass border-b border-[var(--line)]">
    <div class="max-w-6xl mx-auto px-5 h-16 flex items-center gap-6">
      <a href="index.html" class="flex items-center gap-2.5 shrink-0">
        ${logoMark(30)}
        <span class="font-semibold text-[15px] tracking-tight">File Converter</span>
      </a>
      <nav class="hidden md:flex items-center gap-1 ml-2">
        ${link('convert','index.html','Convertir')}
        ${link('history','history.html','Historique')}
        ${link('settings','settings.html','Réglages')}
        ${isAdmin ? link('admin','admin.html','Admin') : ''}
      </nav>
      <div class="flex-1"></div>
      <div class="flex items-center gap-3">
        <a href="profile.html" class="hidden sm:flex items-center gap-2.5 pl-1 pr-1.5 py-1 -my-1 rounded-xl hover:bg-white/[0.05] transition-colors ${active === 'profile' ? 'bg-white/[0.05]' : ''}" title="Voir mon profil">
          <span class="grid place-items-center w-8 h-8 rounded-full bg-grad text-white text-[13px] font-semibold ring-2 ${active === 'profile' ? 'ring-violet-400/50' : 'ring-white/10'}">${initial}</span>
          <div class="leading-tight">
            <div class="text-[13px] font-medium text-[#e7e7ee]">${escapeHtml(user.name || 'Utilisateur')}</div>
            <div class="text-[11px] text-[#7a7a86] capitalize">${isAdmin ? 'Administrateur' : 'Membre'}</div>
          </div>
        </a>
        <button id="logout-btn" class="btn-ghost text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5" title="Se déconnecter">
          <svg viewBox="0 0 18 18" class="w-4 h-4" fill="none"><path d="M11.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5h-5A1.5 1.5 0 0 0 3.5 4v10A1.5 1.5 0 0 0 5 15.5h5a1.5 1.5 0 0 0 1.5-1.5v-1.5M8 9h7m0 0-2.25-2.25M15 9l-2.25 2.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </div>
    <!-- nav mobile -->
    <nav class="md:hidden flex items-center gap-1 px-4 pb-2.5 -mt-1">
      ${link('convert','index.html','Convertir')}
      ${link('history','history.html','Historique')}
      ${link('settings','settings.html','Réglages')}
      ${isAdmin ? link('admin','admin.html','Admin') : ''}
    </nav>
  </header>
  <div class="h-16 md:h-16"></div>`;

  document.getElementById('logout-btn').addEventListener('click', logout);
}

async function logout() {
  try { await api('/api/auth/logout', { method: 'DELETE' }); }
  catch (_) { /* on déconnecte localement quoi qu'il arrive */ }
  finally {
    clearSession();
    toast.info('Déconnexion réussie.');
    setTimeout(() => { window.location.href = 'login.html'; }, 350);
  }
}

/* ---------- Ambient background ---------- */
function mountAmbient() {
  if (document.querySelector('.ambient')) return;
  const a = document.createElement('div'); a.className = 'ambient';
  const g = document.createElement('div'); g.className = 'grid-veil';
  document.body.prepend(g); document.body.prepend(a);
}

/* ---------- Modal de confirmation / formulaire ---------- */
/**
 * openModal({ title, body, confirmLabel, danger, fields, onConfirm })
 * - body: string HTML (optionnel)
 * - fields: [{ name, label, value, type }] -> rend un mini formulaire ; onConfirm reçoit les valeurs
 * - onConfirm: async fn -> doit résoudre pour fermer ; lève pour rester ouvert
 */
function openModal(opts) {
  const { title, body = '', confirmLabel = 'Confirmer', danger = false, fields = null, onConfirm } = opts;
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[90] grid place-items-center px-5';
  overlay.innerHTML = `
    <div class="absolute inset-0 bg-black/55 backdrop-blur-sm" data-close></div>
    <div class="relative card glass w-full max-w-[420px] p-6 shadow-2xl animate-pop">
      <h3 class="text-[17px] font-semibold tracking-tight">${escapeHtml(title)}</h3>
      ${body ? `<p class="text-sm text-[#9a9aa6] mt-2 leading-relaxed">${body}</p>` : ''}
      ${fields ? `<div class="mt-4 space-y-3.5">${fields.map(f => `
        <div>
          <label class="block text-[13px] font-medium text-[#c7c7d0] mb-1.5">${escapeHtml(f.label)}</label>
          ${f.type === 'select'
            ? `<select data-field="${f.name}" class="field w-full rounded-xl px-3.5 py-2.5 text-sm">${f.options.map(o => `<option value="${o}" ${o===f.value?'selected':''}>${o}</option>`).join('')}</select>`
            : `<input data-field="${f.name}" type="${f.type||'text'}" value="${escapeHtml(f.value||'')}" class="field w-full rounded-xl px-3.5 py-2.5 text-sm" />`}
        </div>`).join('')}</div>` : ''}
      <div class="flex items-center justify-end gap-2.5 mt-6">
        <button data-close class="btn-ghost rounded-lg px-4 py-2 text-sm font-medium">Annuler</button>
        <button data-confirm class="${danger ? '' : 'btn-primary'} rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 ${danger ? 'text-white' : ''}"
          ${danger ? 'style="background:linear-gradient(120deg,#f43f5e,#e11d48);box-shadow:0 8px 24px -8px rgba(244,63,94,.6)"' : ''}>
          <span class="m-label">${escapeHtml(confirmLabel)}</span>
          <span class="m-spin spinner w-4 h-4 hidden"></span>
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => { overlay.style.animation = 'fade-in .15s reverse forwards'; setTimeout(() => overlay.remove(), 150); };
  overlay.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);

  const confirmBtn = overlay.querySelector('[data-confirm]');
  confirmBtn.addEventListener('click', async () => {
    const lbl = confirmBtn.querySelector('.m-label');
    const spn = confirmBtn.querySelector('.m-spin');
    let values = {};
    if (fields) fields.forEach(f => { values[f.name] = overlay.querySelector(`[data-field="${f.name}"]`).value; });
    confirmBtn.disabled = true; lbl.classList.add('opacity-60'); spn.classList.remove('hidden');
    try {
      await (onConfirm ? onConfirm(values) : Promise.resolve());
      close();
    } catch (err) {
      confirmBtn.disabled = false; lbl.classList.remove('opacity-60'); spn.classList.add('hidden');
    }
  });
  const firstField = overlay.querySelector('[data-field]');
  if (firstField) setTimeout(() => firstField.focus(), 60);
}

/* ---------- Téléchargement d'un blob ---------- */
async function downloadConversion(id, filename) {
  const res = await api(`/api/conversions/${id}/download`, { raw: true });
  const blob = await res.blob();
  let name = filename;
  const cd = res.headers && res.headers.get && res.headers.get('Content-Disposition');
  if (cd) { const m = cd.match(/filename="?([^"]+)"?/); if (m) name = m[1]; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name || `conversion-${id}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------- Partage public (lien temporaire) ---------- */
async function openShareModal(id, filename) {
  let shareUrl, expiresAt;
  try {
    const res = await api(`/api/conversions/${id}/share`, { method: 'POST' });
    shareUrl = location.origin + res.share_url;
    expiresAt = res.expires_at;
  } catch (err) {
    toast.error(err.message || 'Impossible de générer le lien.');
    return;
  }

  const body = `
    <p class="text-sm text-[#9a9aa6] leading-relaxed">
      « ${escapeHtml(filename)} » est accessible via ce lien, sans connexion, jusqu'au
      <strong class="text-[#c7c7d0]">${escapeHtml(formatDateFull(expiresAt))}</strong>.
    </p>
    <div class="mt-3.5 flex items-center gap-2">
      <input id="share-link-input" type="text" readonly value="${escapeHtml(shareUrl)}"
        class="field flex-1 rounded-xl px-3.5 py-2.5 text-[13px] font-mono" />
      <button id="share-copy-btn" class="btn-ghost shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-medium">Copier</button>
    </div>
    <button id="share-revoke-btn" class="text-[13px] text-rose-300 hover:text-rose-200 mt-3.5">
      Révoquer ce lien
    </button>`;

  openModal({
    title: 'Lien de partage',
    body,
    confirmLabel: 'Fermer',
    onConfirm: () => {},
  });

  document.getElementById('share-copy-btn').addEventListener('click', async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Lien copié.');
  });

  document.getElementById('share-revoke-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await api(`/api/conversions/${id}/share`, { method: 'DELETE' });
      toast.success('Lien révoqué.');
      document.querySelector('[data-close]')?.click();
    } catch (err) {
      toast.error(err.message || 'Impossible de révoquer le lien.');
    }
  });
}
