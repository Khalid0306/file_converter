/* Page Login */
(function () {
  mountAmbient();
  document.getElementById('brand').innerHTML = logoMark(46);

  // Si déjà connecté, aller à l'accueil
  if (getToken()) { window.location.href = 'index.html'; return; }

  const form = document.getElementById('login-form');
  const btn = document.getElementById('submit-btn');
  const label = btn.querySelector('.btn-label');
  const spin = btn.querySelector('.btn-spin');

  // toggle password
  document.getElementById('toggle-pw').addEventListener('click', () => {
    const pw = document.getElementById('password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  });

  function setLoading(on) {
    btn.disabled = on;
    label.classList.toggle('hidden', on);
    spin.classList.toggle('hidden', !on);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) { toast.error('Veuillez renseigner e-mail et mot de passe.'); return; }

    setLoading(true);
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      if (!data || !data.token) throw new ApiError('Réponse invalide du serveur.', 0);
      setSession(data.user, data.token);
      toast.success('Connexion réussie. Redirection…');
      setTimeout(() => { window.location.href = 'index.html'; }, 500);
    } catch (err) {
      toast.error(err.message || 'Identifiants incorrects.');
      setLoading(false);
    }
  });
})();
