import { getUser, handleAuthCallback, login, logout, signup } from '@netlify/identity';

const gate = document.querySelector('#academyAccessGate');
const shell = document.querySelector('.app-shell');
const message = document.querySelector('#academyAccessMessage');
const forms = ['academyLoginForm', 'academySignupForm', 'academyRequestForm'].map((id) => document.getElementById(id));
const signOut = document.querySelector('#academySignOut');
let approved = false;

function view(formId = '') {
  gate.hidden = false;
  shell.hidden = true;
  for (const form of forms) form.hidden = form.id !== formId;
}

function notice(text) { message.textContent = text; }

async function api(action, options = {}) {
  const result = await fetch(`/api/academy/${action}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

async function refreshAccess() {
  approved = false;
  view();
  notice('Comprobando tu acceso…');
  try {
    const user = await getUser();
    signOut.hidden = !user;
    if (!user) {
      notice('Entra con tu correo o crea una cuenta para solicitar acceso.');
      view('academyLoginForm');
      return;
    }
    if (!user.emailVerified) {
      notice('Confirma tu correo mediante el enlace que recibiste. Después, vuelve a abrir Academy.');
      return;
    }
    const { profile } = await api('me');
    if (!profile) {
      const request = document.getElementById('academyRequestForm');
      request.elements.name.value = user.name || '';
      notice('Para solicitar acceso, indica tu nombre y el nombre del local.');
      view('academyRequestForm');
      return;
    }
    if (profile.status === 'pending') {
      notice(`Tu solicitud para ${profile.requestedLocal} está pendiente de aprobación en Gestión.`);
      return;
    }
    if (profile.status !== 'approved') {
      notice('Tu acceso está retirado. Consulta con el administrador de Peppos.');
      return;
    }
    approved = true;
    gate.hidden = true;
    shell.hidden = false;
  } catch (error) {
    notice(error.message || 'No se pudo comprobar el acceso.');
  }
}

document.getElementById('showAcademySignup').addEventListener('click', () => {
  notice('Necesitas confirmar tu correo antes de que el administrador apruebe el acceso.');
  view('academySignupForm');
});
document.getElementById('showAcademyLogin').addEventListener('click', () => {
  notice('Entra con tu correo y contraseña.');
  view('academyLoginForm');
});
document.getElementById('academyLoginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await login(form.elements.email.value.trim(), form.elements.password.value);
    await refreshAccess();
  } catch (error) { notice(error.message || 'No se pudo entrar.'); }
  finally { button.disabled = false; }
});
document.getElementById('academySignupForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const name = form.elements.name.value.trim();
    const local = form.elements.local.value.trim();
    if (name.length < 2 || local.length < 2) throw new Error('Indica tu nombre y el nombre del local.');
    sessionStorage.setItem('academy-request-draft', JSON.stringify({ name, local }));
    await signup(form.elements.email.value.trim(), form.elements.password.value, { full_name: name });
    view();
    notice('Te hemos enviado un enlace para confirmar el correo. Después podrás enviar tu solicitud de acceso.');
  } catch (error) { notice(error.message || 'No se pudo crear la cuenta.'); }
  finally { button.disabled = false; }
});
document.getElementById('academyRequestForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const name = form.elements.name.value.trim();
    const local = form.elements.local.value.trim();
    if (name.length < 2 || local.length < 2) throw new Error('Indica tu nombre y el nombre del local.');
    await api('request', { method: 'POST', body: { name, local } });
    sessionStorage.removeItem('academy-request-draft');
    view();
    notice(`Solicitud enviada para ${local}. El administrador comprobará el local antes de aprobarte.`);
  } catch (error) { notice(error.message || 'No se pudo enviar la solicitud.'); }
  finally { button.disabled = false; }
});
signOut.addEventListener('click', async () => {
  await logout();
  await refreshAccess();
});

window.PepposAcademyAccess = {
  get approved() { return approved; },
  async saveRecord(record) {
    if (!approved) throw new Error('Tu acceso a Academy aún no está aprobado.');
    try { return (await api('record', { method: 'POST', body: { record } })).record; }
    catch (error) {
      if (/pendiente|retirado|Confirma tu correo/i.test(error.message)) await refreshAccess();
      throw error;
    }
  }
};

handleAuthCallback().catch((error) => notice(error.message || 'No se pudo confirmar el correo.'))
  .finally(async () => {
    const draft = sessionStorage.getItem('academy-request-draft');
    await refreshAccess();
    if (draft && !document.getElementById('academyRequestForm').hidden) {
      try {
        const values = JSON.parse(draft);
        const form = document.getElementById('academyRequestForm');
        form.elements.name.value = values.name || '';
        form.elements.local.value = values.local || '';
      } catch { /* La persona puede rellenar los campos manualmente. */ }
    }
  });
