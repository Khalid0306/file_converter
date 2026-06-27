/* Page Réglages (/settings) — préférences persistées côté client.
   Les valeurs sont lues par les autres pages via getSettings()/applyAppearance()
   définis dans components.js. Enregistrement instantané (auto-save). */
(function () {
  if (!requireAuth()) return;
  mountAmbient();
  renderNavbar('settings');
  applyAppearance();

  const root = document.getElementById('settings');

  /* ----- Briques d'UI ----- */
  function section(title, desc, rows, delay) {
    return `
      <div class="card p-5 sm:p-6 animate-fade-up" style="animation-delay:${delay}s">
        <div class="mb-1.5">
          <h2 class="text-[15px] font-semibold text-[#e2e2e9]">${title}</h2>
          ${desc ? `<p class="text-[13px] text-[#7a7a86] mt-0.5">${desc}</p>` : ''}
        </div>
        <div class="divide-y divide-[var(--line)] mt-3">${rows}</div>
      </div>`;
  }

  function row(label, sub, control) {
    return `
      <div class="flex items-center gap-4 py-3.5 first:pt-1">
        <div class="min-w-0 flex-1">
          <div class="text-[14px] font-medium text-[#e7e7ee]">${label}</div>
          ${sub ? `<div class="text-[12px] text-[#7a7a86] mt-0.5 leading-relaxed">${sub}</div>` : ''}
        </div>
        <div class="shrink-0">${control}</div>
      </div>`;
  }

  function toggle(key, on) {
    return `<button data-toggle="${key}" role="switch" aria-checked="${on}"
      class="relative w-[46px] h-[26px] rounded-full transition-colors ${on ? 'bg-grad' : 'bg-white/10'}"
      style="box-shadow:${on ? '0 4px 12px -4px rgba(139,92,246,.6)' : 'none'}">
      <span class="absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white transition-transform" style="transform:translateX(${on ? '20px' : '0'})"></span>
    </button>`;
  }

  function segment(key, options, value) {
    return `<div data-seg="${key}" class="inline-flex p-0.5 rounded-lg bg-white/[0.04] ring-1 ring-[var(--line)]">
      ${options.map(o => {
        const on = o.id === value;
        return `<button data-val="${o.id}" class="px-3 py-1.5 rounded-md text-[12px] font-mono font-semibold transition-colors ${on ? 'bg-grad text-white' : 'text-[#9a9aa6] hover:text-[#e7e7ee]'}">${o.label}</button>`;
      }).join('')}
    </div>`;
  }

  function swatches(value) {
    return `<div data-accent class="flex items-center gap-2.5">
      ${Object.entries(ACCENTS).map(([id, a]) => {
        const on = id === value;
        return `<button data-accent-id="${id}" title="${a.label}" aria-pressed="${on}"
          class="w-7 h-7 rounded-full transition-transform ${on ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[var(--surface)] scale-105' : 'ring-1 ring-white/15 hover:scale-105'}"
          style="background:${a.grad}"></button>`;
      }).join('')}
    </div>`;
  }

  /* ----- Rendu ----- */
  function render() {
    const s = getSettings();

    const conversion = section('Conversion', 'Valeurs appliquées par défaut sur la page Convertir.', [
      row('Format de sortie par défaut', 'Format pré-sélectionné pour chaque nouvelle conversion.',
        segment('defaultFormat', [{id:'csv',label:'CSV'},{id:'json',label:'JSON'},{id:'xml',label:'XML'}], s.defaultFormat)),
      row('Téléchargement automatique', 'Lance le téléchargement dès qu\'une conversion est prête.',
        toggle('autoDownload', s.autoDownload)),
    ].join(''), 0.04);

    const appearance = section('Apparence', 'Choisissez le mode d\'affichage et la couleur d\'accent.', [
      row('Thème', 'Mode sombre, clair, ou selon votre système.',
        segment('theme', [{id:'dark',label:'Sombre'},{id:'light',label:'Clair'},{id:'auto',label:'Système'}], s.theme)),
      row('Couleur d\'accent', 'Recolore les dégradés, boutons et éléments actifs.', swatches(s.accent)),
      row('Réduire les animations', 'Désactive les animations d\'apparition pour une interface plus calme.',
        toggle('reduceMotion', s.reduceMotion)),
    ].join(''), 0.08);

    const notifications = section('Notifications', null, [
      row('Notifications de succès', 'Affiche un message lors d\'une conversion réussie. Les erreurs restent toujours signalées.',
        toggle('successToasts', s.successToasts)),
    ].join(''), 0.12);

    const reset = `
      <div class="flex justify-end animate-fade-up" style="animation-delay:.16s">
        <button id="reset-btn" class="btn-ghost rounded-lg px-3.5 py-2 text-[13px] font-medium flex items-center gap-2 text-[#9a9aa6]">
          <svg viewBox="0 0 18 18" class="w-4 h-4" fill="none"><path d="M3.5 9a5.5 5.5 0 1 1 1.7 4M3.5 13V9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Réinitialiser les réglages
        </button>
      </div>`;

    root.innerHTML = conversion + appearance + notifications + reset;
    bind();
  }

  /* ----- Interactions ----- */
  function bind() {
    // toggles
    root.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle;
        const next = !(getSettings()[key]);
        saveSettings({ [key]: next });
        render();
        toast.info(next ? 'Activé.' : 'Désactivé.');
      });
    });
    // segments
    root.querySelectorAll('[data-seg]').forEach(seg => {
      const key = seg.dataset.seg;
      seg.querySelectorAll('[data-val]').forEach(b => {
        b.addEventListener('click', () => {
          if (getSettings()[key] === b.dataset.val) return;
          saveSettings({ [key]: b.dataset.val });
          render();
        });
      });
    });
    // accent swatches
    const acc = root.querySelector('[data-accent]');
    if (acc) acc.querySelectorAll('[data-accent-id]').forEach(b => {
      b.addEventListener('click', () => {
        if (getSettings().accent === b.dataset.accentId) return;
        saveSettings({ accent: b.dataset.accentId });
        render(); // applyAppearance() est déjà appelé par saveSettings -> recolore live
      });
    });
    // reset
    document.getElementById('reset-btn').addEventListener('click', () => {
      openModal({
        title: 'Réinitialiser les réglages ?',
        body: 'Toutes vos préférences seront remises à leurs valeurs par défaut.',
        confirmLabel: 'Réinitialiser',
        danger: true,
        onConfirm: async () => {
          localStorage.removeItem(SETTINGS_KEY);
          applyAppearance();
          render();
          toast.success('Réglages réinitialisés.');
        },
      });
    });
  }

  render();
})();
