/* Page Convertir (/) */
(function () {
  if (!requireAuth()) return;
  mountAmbient();
  renderNavbar('convert');

  const FORMATS = [
    { id: 'csv',  label: 'CSV',  desc: 'Tableur' },
    { id: 'json', label: 'JSON', desc: 'Structuré' },
    { id: 'xml',  label: 'XML',  desc: 'Balisé' },
  ];
  let selectedFile = null;
  let toFormat = (typeof getSettings === 'function' && getSettings().defaultFormat) || 'json';

  const dz = document.getElementById('dropzone');
  const input = document.getElementById('file-input');
  const dzEmpty = document.getElementById('dz-empty');
  const dzFile = document.getElementById('dz-file');
  const convertBtn = document.getElementById('convert-btn');
  const result = document.getElementById('result');

  /* ----- Segmented control format ----- */
  const seg = document.getElementById('format-seg');
  function renderSeg() {
    seg.innerHTML = FORMATS.map(f => {
      const on = f.id === toFormat;
      return `<button data-fmt="${f.id}"
        class="group relative rounded-xl px-3 py-3 text-left transition-all border ${on ? 'border-violet-500/60 bg-violet-500/[0.07]' : 'border-[var(--line)] bg-white/[0.015] hover:border-[var(--line-2)] hover:bg-white/[0.03]'}">
        <div class="flex items-center justify-between">
          <span class="font-mono text-[13px] font-semibold ${on ? 'text-violet-200' : 'text-[#d2d2da]'}">.${f.id}</span>
          <span class="w-4 h-4 rounded-full border ${on ? 'border-violet-400 bg-violet-500' : 'border-[var(--line-2)]'} grid place-items-center transition-colors">
            ${on ? '<svg viewBox=\"0 0 12 12\" class=\"w-2.5 h-2.5 text-white\" fill=\"none\"><path d=\"M2.5 6l2.5 2.5L9.5 3.5\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>' : ''}
          </span>
        </div>
        <div class="text-[11px] text-[#7a7a86] mt-1.5">${f.desc}</div>
      </button>`;
    }).join('');
    seg.querySelectorAll('[data-fmt]').forEach(b => {
      b.addEventListener('click', () => { toFormat = b.dataset.fmt; renderSeg(); });
    });
  }
  renderSeg();

  /* ----- File handling ----- */
  function setFile(file) {
    selectedFile = file;
    if (!file) {
      dzEmpty.classList.remove('hidden');
      dzFile.classList.add('hidden');
      convertBtn.disabled = true;
      return;
    }
    const ext = (file.name.split('.').pop() || '?').toUpperCase().slice(0, 4);
    document.getElementById('file-icon').textContent = ext;
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-meta').textContent = formatBytes(file.size);
    dzEmpty.classList.add('hidden');
    dzFile.classList.remove('hidden');
    dzFile.classList.add('animate-pop');
    convertBtn.disabled = false;
    result.classList.add('hidden');
  }

  dz.addEventListener('click', (e) => { if (!e.target.closest('#file-remove')) input.click(); });
  input.addEventListener('change', () => { if (input.files[0]) setFile(input.files[0]); });
  document.getElementById('file-remove').addEventListener('click', (e) => {
    e.stopPropagation(); input.value = ''; setFile(null);
  });

  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, (e) => {
    e.preventDefault(); dz.classList.add('drag-over');
  }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'dragleave' && dz.contains(e.relatedTarget)) return;
    dz.classList.remove('drag-over');
  }));
  dz.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  });

  /* ----- Convert ----- */
  const label = convertBtn.querySelector('.btn-label');
  const spin = convertBtn.querySelector('.btn-spin');
  function setLoading(on) {
    convertBtn.disabled = on || !selectedFile;
    label.textContent = on ? 'Conversion en cours…' : 'Convertir le fichier';
    spin.classList.toggle('hidden', !on);
  }

  convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    setLoading(true);
    result.classList.add('hidden');
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('to_format', toFormat);
      const data = await api('/api/conversions', { method: 'POST', body: fd, isForm: true });
      const conv = data.conversion || data;
      toast.success('Fichier converti avec succès.');
      showResult(conv);
      // Téléchargement auto si activé dans les Réglages
      if (typeof getSettings === 'function' && getSettings().autoDownload) {
        try { await downloadConversion(conv.id, conv.file_name); }
        catch (_) { /* l'utilisateur peut toujours cliquer Télécharger */ }
      }
    } catch (err) {
      toast.error(err.message || 'La conversion a échoué.');
    } finally {
      setLoading(false);
    }
  });

  function showResult(conv) {
    result.innerHTML = `
      <div class="card p-5 sm:p-6 shadow-2xl animate-fade-up overflow-hidden relative">
        <div class="absolute inset-x-0 top-0 h-px bg-grad opacity-70"></div>
        <div class="flex items-center gap-4">
          <div class="shrink-0 w-12 h-12 grid place-items-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/20 text-emerald-400">
            <svg viewBox="0 0 24 24" class="w-6 h-6" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-[#e7e7ee] truncate">${escapeHtml(conv.file_name || 'résultat')}</span>
              ${formatBadge(conv.from_format)}
              <svg viewBox="0 0 16 16" class="w-3.5 h-3.5 text-[#5c5c66]" fill="none"><path d="M3 8h9m0 0L9 5m3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              ${formatBadge(conv.to_format)}
            </div>
            <div class="text-[12px] text-[#7a7a86] mt-1">${formatBytes(conv.file_size)} · Prêt au téléchargement</div>
          </div>
          <button id="dl-result" class="btn-primary shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
            <svg viewBox="0 0 18 18" class="w-4 h-4" fill="none"><path d="M9 3v8m0 0L5.5 7.5M9 11l3.5-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 13.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            Télécharger
          </button>
        </div>
      </div>`;
    result.classList.remove('hidden');
    document.getElementById('dl-result').addEventListener('click', async () => {
      try { await downloadConversion(conv.id, conv.file_name); }
      catch (err) { toast.error(err.message || 'Téléchargement impossible.'); }
    });
  }
})();
