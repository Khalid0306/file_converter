/* ============================================================
   Toasts — notifications succès / erreur / info
   Usage: toast.success('...'), toast.error('...'), toast.info('...')
   ============================================================ */

const toast = (() => {
  function container() {
    let el = document.getElementById('toast-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-root';
      el.className = 'fixed top-4 right-4 z-[100] flex flex-col gap-2.5 w-[340px] max-w-[calc(100vw-2rem)]';
      document.body.appendChild(el);
    }
    return el;
  }

  const ICONS = {
    success: `<svg viewBox="0 0 20 20" fill="none" class="w-4 h-4"><path d="M16.5 6L8.25 14.25 4.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    error:   `<svg viewBox="0 0 20 20" fill="none" class="w-4 h-4"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    info:    `<svg viewBox="0 0 20 20" fill="none" class="w-4 h-4"><path d="M10 9v5M10 6.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="10" r="7.25" stroke="currentColor" stroke-width="1.5"/></svg>`,
  };
  const TONE = {
    success: 'text-emerald-400 bg-emerald-400/10 ring-emerald-400/20',
    error:   'text-rose-400 bg-rose-400/10 ring-rose-400/20',
    info:    'text-violet-300 bg-violet-400/10 ring-violet-400/20',
  };

  function show(type, message) {
    const root = container();
    const el = document.createElement('div');
    el.className = 'glass card flex items-start gap-3 px-3.5 py-3 shadow-2xl';
    el.style.animation = 'toast-in .3s cubic-bezier(.2,.8,.2,1) both';
    el.innerHTML = `
      <span class="shrink-0 mt-0.5 grid place-items-center w-7 h-7 rounded-lg ring-1 ${TONE[type]}">${ICONS[type]}</span>
      <p class="text-sm text-[#d7d7df] leading-snug flex-1 pt-1">${escapeHtml(message)}</p>
      <button class="shrink-0 text-[#5c5c66] hover:text-white transition-colors mt-0.5" aria-label="Fermer">
        <svg viewBox="0 0 16 16" class="w-3.5 h-3.5" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>`;
    const close = () => {
      el.style.animation = 'toast-in .2s ease reverse forwards';
      setTimeout(() => el.remove(), 200);
    };
    el.querySelector('button').addEventListener('click', close);
    root.appendChild(el);
    setTimeout(close, 4200);
  }

  function successEnabled() {
    return typeof getSettings !== 'function' || getSettings().successToasts !== false;
  }
  return {
    success: (m) => { if (successEnabled()) show('success', m); },
    error:   (m) => show('error', m),
    info:    (m) => show('info', m),
  };
})();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
