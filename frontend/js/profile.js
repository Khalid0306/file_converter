/* Page Profil (/profile) — identité + statistiques calculées côté client
   depuis GET /api/conversions. Aucun nouvel endpoint. */
(function () {
  if (!requireAuth()) return;
  mountAmbient();
  renderNavbar('profile');

  const user = getUser() || { name: 'Utilisateur', email: '—', role: 'user' };
  const isAdmin = user.role === 'admin';
  const initial = (user.name || 'U').trim().charAt(0).toUpperCase();

  const identity = document.getElementById('identity');
  const statsGrid = document.getElementById('stats-grid');
  const chartCard = document.getElementById('chart-card');
  const highlightsCard = document.getElementById('highlights-card');

  /* ===== Carte identité ===== */
  function renderIdentity() {
    identity.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
        <span class="shrink-0 grid place-items-center w-20 h-20 rounded-full bg-grad text-white text-[34px] font-semibold ring-4 ring-white/10" style="box-shadow:0 10px 30px -8px rgba(139,92,246,.6)">${initial}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h2 class="text-[22px] font-semibold tracking-tight truncate">${escapeHtml(user.name || 'Utilisateur')}</h2>
            <span class="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ring-1 ${isAdmin ? 'text-violet-300 ring-violet-400/30 bg-violet-400/10' : 'text-sky-300 ring-sky-400/25 bg-sky-400/10'}">${isAdmin ? 'Admin' : 'Membre'}</span>
          </div>
          <div class="flex items-center gap-2 mt-1.5 text-[14px] text-[#9a9aa6]">
            <svg viewBox="0 0 18 18" class="w-4 h-4 text-[#6a6a76]" fill="none"><rect x="2.5" y="4" width="13" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M3 5l6 4.5L15 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="truncate font-mono text-[13px]">${escapeHtml(user.email || '—')}</span>
          </div>
        </div>
        <button id="logout-action" class="shrink-0 self-start sm:self-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2 transition-transform active:translate-y-px" style="background:linear-gradient(120deg,#f43f5e,#e11d48);box-shadow:0 8px 24px -8px rgba(244,63,94,.55)">
          <svg viewBox="0 0 18 18" class="w-4 h-4" fill="none"><path d="M11.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5h-5A1.5 1.5 0 0 0 3.5 4v10A1.5 1.5 0 0 0 5 15.5h5a1.5 1.5 0 0 0 1.5-1.5v-1.5M8 9h7m0 0-2.25-2.25M15 9l-2.25 2.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Déconnexion
        </button>
      </div>`;
    document.getElementById('logout-action').addEventListener('click', confirmLogout);
  }

  function confirmLogout() {
    openModal({
      title: 'Se déconnecter ?',
      body: 'Vous serez redirigé vers la page de connexion.',
      confirmLabel: 'Déconnexion',
      danger: true,
      onConfirm: async () => {
        clearSession();
        toast.info('Déconnexion réussie.');
        await new Promise(r => setTimeout(r, 350));
        window.location.href = 'login.html';
      },
    });
  }

  /* ===== Calcul des statistiques ===== */
  function computeStats(items) {
    const counts = (key) => {
      const map = {};
      items.forEach(c => { const k = (c[key] || '?').toLowerCase(); map[k] = (map[k] || 0) + 1; });
      return map;
    };
    const topOf = (map) => {
      let best = null, n = 0;
      for (const k in map) if (map[k] > n) { best = k; n = map[k]; }
      return best ? { fmt: best, count: n } : null;
    };
    const totalBytes = items.reduce((s, c) => s + (+c.file_size || 0), 0);
    const recent = items.reduce((a, b) => {
      const ta = new Date(String(a && a.created_at || '').replace(' ', 'T').replace(/\.\d+$/, ''));
      const tb = new Date(String(b.created_at || '').replace(' ', 'T').replace(/\.\d+$/, ''));
      return (!a || tb > ta) ? b : a;
    }, null);

    // Répartition combinée (source + destination tous formats confondus)
    const fromMap = counts('from_format');
    const toMap = counts('to_format');
    const allMap = {};
    items.forEach(c => {
      [c.from_format, c.to_format].forEach(f => {
        const k = (f || '?').toLowerCase(); allMap[k] = (allMap[k] || 0) + 1;
      });
    });

    return {
      total: items.length,
      topFrom: topOf(fromMap),
      topTo: topOf(toMap),
      totalBytes,
      recent,
      distribution: allMap,
    };
  }

  /* ===== Cartes stats ===== */
  const STAT_ICONS = {
    files: '<path d="M11 3H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8m-5-5 5 5m-5-5v5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    disk:  '<rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 9h14M6.5 12.5h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    arrowIn:  '<path d="M10 3v8m0 0 3-3m-3 3L7 8M4 15.5h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    arrowOut: '<path d="M10 13V5m0 0 3 3m-3-3L7 8M4 15.5h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  function statSkeleton() {
    statsGrid.innerHTML = Array.from({ length: 4 }).map(() => `
      <div class="card p-4">
        <div class="skeleton w-9 h-9 rounded-xl mb-4"></div>
        <div class="skeleton h-6 w-16 mb-2"></div>
        <div class="skeleton h-3 w-20"></div>
      </div>`).join('');
    chartCard.innerHTML = `<div class="skeleton h-5 w-40 mb-5"></div>${
      Array.from({ length: 4 }).map(() => `<div class="flex items-center gap-3 mb-3.5"><div class="skeleton h-4 w-12"></div><div class="skeleton h-3 flex-1"></div></div>`).join('')
    }`;
    highlightsCard.innerHTML = `<div class="skeleton h-5 w-32 mb-5"></div><div class="skeleton h-12 w-full mb-3 rounded-xl"></div><div class="skeleton h-12 w-full rounded-xl"></div>`;
  }

  function statCard(d, i) {
    return `
      <div class="card p-4 relative overflow-hidden animate-fade-up" style="animation-delay:${i*0.04}s">
        <div class="w-9 h-9 grid place-items-center rounded-xl text-violet-300 ring-1 ring-violet-400/20 bg-violet-400/10 mb-3.5">
          <svg viewBox="0 0 20 20" class="w-[18px] h-[18px]" fill="none">${STAT_ICONS[d.icon]}</svg>
        </div>
        <div class="text-[24px] font-semibold tracking-tight ${d.empty ? 'text-[#5c5c66]' : ''} leading-none flex items-baseline gap-1.5">${d.value}${d.unit ? `<span class="text-[12px] font-mono font-medium text-[#7a7a86]">${d.unit}</span>` : ''}</div>
        <div class="text-[12px] text-[#7a7a86] mt-1.5">${d.label}</div>
      </div>`;
  }

  function renderStats(s) {
    const fmtUp = (f) => f ? f.fmt.toUpperCase() : '—';
    const cards = [
      { icon: 'files', label: 'Conversions au total', value: s.total, empty: s.total === 0 },
      { icon: 'arrowIn', label: 'Format source favori', value: fmtUp(s.topFrom), empty: !s.topFrom, unit: s.topFrom ? `×${s.topFrom.count}` : '' },
      { icon: 'arrowOut', label: 'Format cible favori', value: fmtUp(s.topTo), empty: !s.topTo, unit: s.topTo ? `×${s.topTo.count}` : '' },
      { icon: 'disk', label: 'Volume converti', value: formatBytes(s.totalBytes), empty: s.totalBytes === 0 },
    ];
    statsGrid.innerHTML = cards.map(statCard).join('');
  }

  /* ===== Graphique de répartition (barres horizontales) ===== */
  const BAR_TONE = {
    csv:  '#34d399', json: '#fbbf24', xml: '#38bdf8', xlsx: '#34d399',
  };
  function renderChart(dist) {
    const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, n]) => s + n, 0);
    if (!total) {
      chartCard.innerHTML = `
        <h3 class="text-[15px] font-semibold text-[#e2e2e9] mb-1">Répartition des formats</h3>
        <p class="text-sm text-[#7a7a86]">Aucune donnée à afficher pour l'instant.</p>`;
      return;
    }
    const max = entries[0][1];
    chartCard.innerHTML = `
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-[15px] font-semibold text-[#e2e2e9]">Répartition des formats</h3>
        <span class="text-[11px] font-mono text-[#6a6a76]">source + cible</span>
      </div>
      <div class="space-y-3.5">
        ${entries.map(([fmt, n], i) => {
          const pct = Math.round(n / total * 100);
          const w = Math.max(4, Math.round(n / max * 100));
          const color = BAR_TONE[fmt] || '#8b5cf6';
          return `
          <div class="flex items-center gap-3">
            <span class="w-12 shrink-0 font-mono text-[11px] uppercase tracking-wide text-[#c7c7d0]">${escapeHtml(fmt)}</span>
            <div class="flex-1 h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div class="h-full rounded-full animate-fade-up" style="width:${w}%;background:linear-gradient(90deg, ${color}, ${color}cc);box-shadow:0 0 12px -2px ${color}66;animation-delay:${i*0.05}s"></div>
            </div>
            <span class="w-16 shrink-0 text-right text-[12px] text-[#9a9aa6] font-mono tabular-nums">${n} · ${pct}%</span>
          </div>`;
        }).join('')}
      </div>`;
  }

  /* ===== Faits marquants ===== */
  function renderHighlights(s) {
    const r = s.recent;
    const recentBlock = r ? `
      <div class="flex items-center gap-3.5">
        <div class="shrink-0 w-11 h-11 grid place-items-center rounded-xl bg-white/[0.04] ring-1 ring-[var(--line)] font-mono text-[10px] font-semibold uppercase text-[#a8a8b2]">${escapeHtml((r.to_format||'?'))}</div>
        <div class="min-w-0">
          <div class="text-[14px] font-medium text-[#e7e7ee] truncate">${escapeHtml(r.file_name || '—')}</div>
          <div class="flex items-center gap-2 mt-1.5">
            ${formatBadge(r.from_format)}
            <svg viewBox="0 0 16 16" class="w-3 h-3 text-[#5c5c66]" fill="none"><path d="M3 8h9m0 0L9 5m3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            ${formatBadge(r.to_format)}
          </div>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-[var(--line)] text-[12px] text-[#7a7a86]">${escapeHtml(formatDateFull(r.created_at))}</div>`
      : `<p class="text-sm text-[#7a7a86]">Aucune conversion enregistrée.</p>`;

    highlightsCard.innerHTML = `
      <h3 class="text-[15px] font-semibold text-[#e2e2e9] mb-1">Dernier fichier converti</h3>
      <p class="text-[12px] text-[#7a7a86] mb-4">Votre conversion la plus récente</p>
      ${recentBlock}`;
  }

  /* ===== Chargement ===== */
  async function load() {
    statSkeleton();
    try {
      const data = await api('/api/conversions');
      const items = data.conversions || [];
      const s = computeStats(items);
      renderStats(s);
      renderChart(s.distribution);
      renderHighlights(s);
    } catch (err) {
      statsGrid.innerHTML = `<div class="col-span-2 lg:col-span-4 card px-6 py-10 text-center text-sm text-rose-300">${escapeHtml(err.message || 'Erreur de chargement des statistiques.')}</div>`;
      chartCard.innerHTML = '';
      highlightsCard.innerHTML = '';
    }
  }

  renderIdentity();
  load();
})();
