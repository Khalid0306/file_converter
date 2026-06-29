/* Page Historique (/history) */
(function () {
  if (!requireAuth()) return;
  mountAmbient();
  renderNavbar('history');

  const list = document.getElementById('list');
  const filterFrom = document.getElementById('filter-from');
  const filterTo = document.getElementById('filter-to');
  const sortBy = document.getElementById('sort-by');
  const orderToggle = document.getElementById('order-toggle');
  const orderLabel = document.getElementById('order-label');
  const orderIcon = document.getElementById('order-icon');

  [filterFrom, filterTo, sortBy].forEach(el => el.addEventListener('change', load));
  orderToggle.addEventListener('click', () => {
    const next = orderToggle.dataset.order === 'desc' ? 'asc' : 'desc';
    orderToggle.dataset.order = next;
    orderLabel.textContent = next;
    orderIcon.style.transform = next === 'asc' ? 'rotate(180deg)' : '';
    orderIcon.style.transition = 'transform .2s ease';
    load();
  });

  function buildQuery() {
    const params = new URLSearchParams();
    if (filterFrom.value) params.set('from_format', filterFrom.value);
    if (filterTo.value) params.set('to_format', filterTo.value);
    params.set('sort', sortBy.value);
    params.set('order', orderToggle.dataset.order);
    return params.toString();
  }

  function skeleton() {
    list.innerHTML = `<div class="divide-y divide-[var(--line)]">${
      Array.from({ length: 5 }).map(() => `
        <div class="flex items-center gap-4 px-5 py-4">
          <div class="skeleton w-10 h-10 rounded-xl"></div>
          <div class="flex-1 space-y-2"><div class="skeleton h-3.5 w-48"></div><div class="skeleton h-2.5 w-28"></div></div>
          <div class="skeleton h-7 w-16 rounded-lg"></div>
          <div class="skeleton h-7 w-7 rounded-lg"></div>
        </div>`).join('')
    }</div>`;
  }

  function emptyState() {
    const filtered = filterFrom.value || filterTo.value;
    list.innerHTML = `
      <div class="px-6 py-20 text-center">
        <div class="mx-auto w-16 h-16 grid place-items-center rounded-2xl bg-white/[0.03] ring-1 ring-[var(--line)] mb-5">
          <svg viewBox="0 0 24 24" class="w-7 h-7 text-[#5c5c66]" fill="none"><path d="M5 7h14M5 12h14M5 17h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </div>
        <h3 class="text-[16px] font-semibold text-[#d7d7df]">${filtered ? 'Aucun résultat' : 'Aucune conversion pour le moment'}</h3>
        <p class="text-sm text-[#7a7a86] mt-1.5 max-w-xs mx-auto">${filtered ? 'Aucune conversion ne correspond à ces filtres. Essayez de les ajuster.' : 'Vos fichiers convertis apparaîtront ici.'}</p>
        ${filtered
          ? `<button id="clear-filters" class="btn-ghost rounded-lg px-3.5 py-2 text-sm font-medium mt-5">Réinitialiser les filtres</button>`
          : `<a href="index.html" class="btn-primary inline-flex rounded-lg px-4 py-2 text-sm font-semibold mt-5">Convertir un fichier</a>`}
      </div>`;
    const clr = document.getElementById('clear-filters');
    if (clr) clr.addEventListener('click', () => { filterFrom.value = ''; filterTo.value = ''; load(); });
  }

  function render(items) {
    if (!items.length) { emptyState(); return; }
    list.innerHTML = `
      <div class="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[var(--line)] text-[11px] font-medium uppercase tracking-wide text-[#6a6a76]">
        <span>Fichier</span><span class="w-24 text-right">Taille</span><span class="w-32">Date</span><span class="w-28 text-right">Actions</span>
      </div>
      <div class="divide-y divide-[var(--line)] stagger">
        ${items.map(rowHtml).join('')}
      </div>`;
    bindRows(items);
  }

  function rowHtml(c) {
    return `
    <div class="row-hover px-5 py-3.5 flex items-center gap-4" data-id="${c.id}">
      <div class="min-w-0 flex-1 flex items-center gap-3.5">
        <div class="shrink-0 w-10 h-10 grid place-items-center rounded-xl bg-white/[0.04] ring-1 ring-[var(--line)] font-mono text-[10px] font-semibold uppercase text-[#a8a8b2]">${escapeHtml(c.to_format||'?')}</div>
        <div class="min-w-0">
          <div class="text-[14px] font-medium text-[#e7e7ee] truncate">${escapeHtml(c.file_name)}</div>
          <div class="flex items-center gap-2 mt-1">
            ${formatBadge(c.from_format)}
            <svg viewBox="0 0 16 16" class="w-3 h-3 text-[#5c5c66]" fill="none"><path d="M3 8h9m0 0L9 5m3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            ${formatBadge(c.to_format)}
            <span class="mx-0.5 text-[#3c3c44]">·</span>
            ${statusBadge(c.status)}
          </div>
        </div>
      </div>
      <div class="hidden sm:block w-24 text-right text-[13px] text-[#9a9aa6] font-mono">${formatBytes(c.file_size)}</div>
      <div class="hidden sm:block w-32 text-[13px] text-[#9a9aa6]" title="${escapeHtml(formatDateFull(c.created_at))}">${formatDate(c.created_at)}</div>
      <div class="w-28 flex items-center justify-end gap-1">
        <button data-act="share" class="p-2 rounded-lg text-[#9a9aa6] hover:text-violet-300 hover:bg-white/5 transition-colors" title="Partager">
          <svg viewBox="0 0 18 18" class="w-4 h-4" fill="none"><path d="M13 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm6.5-3.2L6.7 5.4m0 7.2 4.8-2.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button data-act="download" class="p-2 rounded-lg text-[#9a9aa6] hover:text-violet-300 hover:bg-white/5 transition-colors" title="Télécharger">
          <svg viewBox="0 0 18 18" class="w-4 h-4" fill="none"><path d="M9 3v8m0 0L5.5 7.5M9 11l3.5-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 13.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
        <button data-act="delete" class="p-2 rounded-lg text-[#9a9aa6] hover:text-rose-300 hover:bg-white/5 transition-colors" title="Supprimer">
          <svg viewBox="0 0 18 18" class="w-4 h-4" fill="none"><path d="M3.5 5h11M7 5V3.5h4V5m-6 0 .5 9a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1l.5-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>`;
  }

  function bindRows(items) {
    list.querySelectorAll('[data-id]').forEach(row => {
      const id = +row.dataset.id;
      const conv = items.find(c => c.id === id);
      row.querySelector('[data-act="share"]').addEventListener('click', () => openShareModal(id, conv.file_name));
      row.querySelector('[data-act="download"]').addEventListener('click', async (e) => {
        const btn = e.currentTarget; btn.innerHTML = '<span class="spinner w-4 h-4 block"></span>';
        try { await downloadConversion(id, conv.file_name); toast.success('Téléchargement lancé.'); }
        catch (err) { toast.error(err.message || 'Téléchargement impossible.'); }
        finally { btn.innerHTML = '<svg viewBox="0 0 18 18" class="w-4 h-4" fill="none"><path d="M9 3v8m0 0L5.5 7.5M9 11l3.5-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 13.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'; }
      });
      row.querySelector('[data-act="delete"]').addEventListener('click', () => confirmDelete(id, conv.file_name, row));
    });
  }

  function confirmDelete(id, name, row) {
    openModal({
      title: 'Supprimer la conversion ?',
      body: `« ${escapeHtml(name)} » sera définitivement supprimée. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
      onConfirm: async () => {
        try {
          await api(`/api/conversions/${id}`, { method: 'DELETE' });
          row.style.transition = 'opacity .2s, transform .2s';
          row.style.opacity = '0'; row.style.transform = 'translateX(8px)';
          setTimeout(load, 220);
          toast.success('Conversion supprimée.');
        } catch (err) { toast.error(err.message || 'Suppression impossible.'); }
      },
    });
  }

  async function load() {
    skeleton();
    try {
      const data = await api('/api/conversions?' + buildQuery());
      render(data.conversions || []);
    } catch (err) {
      list.innerHTML = `<div class="px-6 py-16 text-center text-sm text-rose-300">${escapeHtml(err.message || 'Erreur de chargement.')}</div>`;
    }
  }

  load();
})();
