/* Panel Admin (/admin) — réservé role === 'admin' */
(function () {
  if (!requireAuth()) return;
  const user = getUser();
  if (!user || user.role !== 'admin') {
    toast.error("Accès réservé aux administrateurs.");
    setTimeout(() => { window.location.href = 'index.html'; }, 800);
    return;
  }
  mountAmbient();
  renderNavbar('admin');

  /* ===== STATS ===== */
  const statsGrid = document.getElementById('stats-grid');
  const STAT_DEFS = [
    { key: 'total_users',       label: 'Utilisateurs',     icon: 'users',  suffix: '' },
    { key: 'total_conversions', label: 'Conversions',      icon: 'files',  suffix: '' },
    { key: 'storage_used',      label: 'Stockage utilisé', icon: 'disk',   bytes: true },
    { key: 'success_rate',      label: 'Taux de réussite', icon: 'check',  suffix: '%' },
  ];
  const STAT_ICONS = {
    users: '<path d="M13 16v-1a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 7v-1a3 3 0 0 0-2.25-2.9M13.5 3.1A3 3 0 0 1 13.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    files: '<path d="M11 3H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8m-5-5 5 5m-5-5v5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    disk:  '<rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 9h14M6.5 12.5h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    check: '<path d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm-2.5-7 1.8 1.8L13 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  function statSkeleton() {
    statsGrid.innerHTML = STAT_DEFS.map(() => `
      <div class="card p-4">
        <div class="skeleton w-9 h-9 rounded-xl mb-4"></div>
        <div class="skeleton h-6 w-16 mb-2"></div>
        <div class="skeleton h-3 w-20"></div>
      </div>`).join('');
  }

  function renderStats(stats) {
    statsGrid.innerHTML = STAT_DEFS.map((d, i) => {
      const raw = stats ? stats[d.key] : null;
      const has = raw != null;
      const val = !has ? '—' : (d.bytes ? formatBytes(raw) : raw + (d.suffix || ''));
      return `
        <div class="card p-4 relative overflow-hidden group animate-fade-up" style="animation-delay:${i*0.04}s">
          <div class="w-9 h-9 grid place-items-center rounded-xl bg-grad/none text-violet-300 ring-1 ring-violet-400/20 bg-violet-400/10 mb-3.5">
            <svg viewBox="0 0 20 20" class="w-[18px] h-[18px]" fill="none">${STAT_ICONS[d.icon]}</svg>
          </div>
          <div class="text-[24px] font-semibold tracking-tight ${has ? '' : 'text-[#5c5c66]'}">${val}</div>
          <div class="text-[12px] text-[#7a7a86] mt-0.5">${d.label}</div>
        </div>`;
    }).join('');
  }

  /* Placeholder élégant : l'endpoint /api/admin/stats n'existe pas encore.
     En DEMO_MODE le mock renvoie des chiffres ; sinon on garde le placeholder. */
  async function loadStats() {
    statSkeleton();
    try {
      const data = await api('/api/admin/stats');
      renderStats(data || null);
    } catch (_) {
      renderStats(null); // placeholder propre, sans erreur bruyante
    }
  }

  /* ===== USERS ===== */
  const usersTable = document.getElementById('users-table');

  function tableSkeleton(el, cols) {
    el.innerHTML = `<div class="divide-y divide-[var(--line)]">${
      Array.from({ length: 4 }).map(() => `<div class="flex items-center gap-4 px-5 py-3.5">${
        Array.from({ length: cols }).map((_, i) => `<div class="skeleton h-3.5 ${i===0?'w-40':'w-20'}"></div>`).join('<div class="flex-1"></div>')
      }</div>`).join('')
    }</div>`;
  }

  function renderUsers(users) {
    if (!users || !users.length) {
      usersTable.innerHTML = emptyBlock('Aucun utilisateur', 'La liste des utilisateurs apparaîtra ici.');
      return;
    }
    usersTable.innerHTML = `
      <div class="hidden sm:grid grid-cols-[1.4fr_1.6fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[var(--line)] text-[11px] font-medium uppercase tracking-wide text-[#6a6a76]">
        <span>Nom</span><span>E-mail</span><span class="w-20">Rôle</span><span class="w-28">Inscrit</span><span class="w-16 text-right">Actions</span>
      </div>
      <div class="divide-y divide-[var(--line)] stagger">
        ${users.map(u => `
          <div class="row-hover px-5 py-3 flex items-center gap-4" data-uid="${u.id}">
            <div class="flex items-center gap-3 min-w-0 flex-1 sm:flex-none sm:w-[calc(1.4fr)]" style="flex:1.4 1 0">
              <span class="shrink-0 grid place-items-center w-8 h-8 rounded-full bg-grad text-white text-[12px] font-semibold">${(u.name||'?').charAt(0).toUpperCase()}</span>
              <span class="text-[14px] font-medium text-[#e7e7ee] truncate">${escapeHtml(u.name)}</span>
            </div>
            <div class="hidden sm:block text-[13px] text-[#9a9aa6] truncate" style="flex:1.6 1 0">${escapeHtml(u.email)}</div>
            <div class="w-20">
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-md ring-1 ${u.role==='admin' ? 'text-violet-300 ring-violet-400/30 bg-violet-400/10' : 'text-[#9a9aa6] ring-white/10 bg-white/5'}">${u.role==='admin'?'Admin':'Membre'}</span>
            </div>
            <div class="hidden sm:block w-28 text-[12px] text-[#7a7a86]">${formatDate(u.created_at)}</div>
            <div class="w-16 flex items-center justify-end gap-1">
              <button data-act="edit" class="p-2 rounded-lg text-[#9a9aa6] hover:text-violet-300 hover:bg-white/5 transition-colors" title="Modifier">
                <svg viewBox="0 0 18 18" class="w-4 h-4" fill="none"><path d="M12.5 3.5l2 2L7 13l-2.5.5L5 11l7.5-7.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
              </button>
              <button data-act="del" class="p-2 rounded-lg text-[#9a9aa6] hover:text-rose-300 hover:bg-white/5 transition-colors" title="Supprimer">
                <svg viewBox="0 0 18 18" class="w-4 h-4" fill="none"><path d="M3.5 5h11M7 5V3.5h4V5m-6 0 .5 9a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1l.5-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </div>`).join('')}
      </div>`;

    usersTable.querySelectorAll('[data-uid]').forEach(row => {
      const id = +row.dataset.uid;
      const u = users.find(x => x.id === id);
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editUser(u));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deleteUser(u, row));
    });
  }

  function editUser(u) {
    openModal({
      title: 'Modifier l\'utilisateur',
      confirmLabel: 'Enregistrer',
      fields: [
        { name: 'name', label: 'Nom', value: u.name },
        { name: 'email', label: 'E-mail', value: u.email, type: 'email' },
        { name: 'role', label: 'Rôle', value: u.role, type: 'select', options: ['user', 'admin'] },
      ],
      onConfirm: async (vals) => {
        await api(`/api/admin/users/${u.id}`, { method: 'PUT', body: vals });
        toast.success('Utilisateur mis à jour.');
        loadUsers();
      },
    });
  }
  function deleteUser(u, row) {
    openModal({
      title: 'Supprimer l\'utilisateur ?',
      body: `« ${escapeHtml(u.name)} » et ses données seront supprimés. Action irréversible.`,
      confirmLabel: 'Supprimer', danger: true,
      onConfirm: async () => {
        await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
        row.style.transition = 'opacity .2s'; row.style.opacity = '0';
        toast.success('Utilisateur supprimé.');
        setTimeout(loadUsers, 220);
      },
    });
  }

  async function loadUsers() {
    tableSkeleton(usersTable, 4);
    try {
      const data = await api('/api/admin/users');
      renderUsers(data.users || []);
    } catch (err) {
      usersTable.innerHTML = emptyBlock('Indisponible', 'Impossible de charger les utilisateurs pour le moment.');
    }
  }

  /* ===== ALL CONVERSIONS ===== */
  const convTable = document.getElementById('conv-table');
  function renderConvs(items) {
    if (!items || !items.length) { convTable.innerHTML = emptyBlock('Aucune conversion', 'Aucune conversion enregistrée.'); return; }
    convTable.innerHTML = `
      <div class="hidden sm:grid grid-cols-[auto_1.6fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-[var(--line)] text-[11px] font-medium uppercase tracking-wide text-[#6a6a76]">
        <span class="w-10">ID</span><span>Fichier</span><span>Format</span><span class="w-24 text-right">Taille</span><span class="w-32">Date</span>
      </div>
      <div class="divide-y divide-[var(--line)] stagger">
        ${items.map(c => `
          <div class="row-hover px-5 py-3 flex items-center gap-4">
            <div class="w-10 font-mono text-[12px] text-[#6a6a76]">#${c.id}</div>
            <div class="min-w-0 flex-1 sm:flex-none text-[14px] font-medium text-[#e7e7ee] truncate" style="flex:1.6 1 0">${escapeHtml(c.file_name)}</div>
            <div class="hidden sm:flex items-center gap-2" style="flex:1 1 0">${formatBadge(c.from_format)}<svg viewBox="0 0 16 16" class="w-3 h-3 text-[#5c5c66]" fill="none"><path d="M3 8h9m0 0L9 5m3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${formatBadge(c.to_format)}</div>
            <div class="hidden sm:block w-24 text-right font-mono text-[13px] text-[#9a9aa6]">${formatBytes(c.file_size)}</div>
            <div class="hidden sm:block w-32 text-[12px] text-[#7a7a86]">${formatDate(c.created_at)}</div>
          </div>`).join('')}
      </div>`;
  }
  async function loadConvs() {
    tableSkeleton(convTable, 4);
    try {
      const data = await api('/api/admin/conversions');
      renderConvs(data.conversions || []);
    } catch (err) {
      convTable.innerHTML = emptyBlock('Indisponible', 'Impossible de charger les conversions.');
    }
  }

  function emptyBlock(title, sub) {
    return `<div class="px-6 py-14 text-center">
      <h3 class="text-[15px] font-semibold text-[#c7c7d0]">${escapeHtml(title)}</h3>
      <p class="text-sm text-[#7a7a86] mt-1.5">${escapeHtml(sub)}</p>
    </div>`;
  }

  loadStats();
  loadUsers();
  loadConvs();
})();
