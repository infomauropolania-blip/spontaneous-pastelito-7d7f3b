import { getUser, handleAuthCallback, login, logout, signup } from '@netlify/identity';

const gate = document.querySelector('#academyAccessGate');
const shell = document.querySelector('.app-shell');
const message = document.querySelector('#academyAccessMessage');
const forms = ['academyLoginForm', 'academySignupForm', 'academyRequestForm'].map((id) => document.getElementById(id));
const signOut = document.querySelector('#academySignOut');
const loginFeedback = document.querySelector('#academyLoginFeedback');
const resendConfirmation = document.querySelector('#resendAcademyConfirmation');
let approved = false;

function view(formId = '') {
  gate.hidden = false;
  shell.hidden = true;
  for (const form of forms) form.hidden = form.id !== formId;
}

function notice(text) { message.textContent = text; }
function loginNotice(text, unconfirmed = false) {
  loginFeedback.textContent = text;
  loginFeedback.hidden = !text;
  resendConfirmation.hidden = !unconfirmed;
  notice(text);
}
function isUnconfirmed(error) { return /email not confirmed|correo no confirmado/i.test(error?.message || ''); }
function friendlyError(error) {
  if (isUnconfirmed(error)) return 'Tu correo aún no está confirmado. Abre el enlace que te envió Academy o pulsa «Reenviar correo de confirmación».';
  if (/invalid.grant|invalid login|invalid credentials/i.test(error?.message || '')) return 'No se pudo entrar. Comprueba el correo y la contraseña.';
  return error?.message || 'No se pudo completar la operación.';
}

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
      notice('¿Es tu primera vez? Solicita acceso con tu correo, nombre y local. Si ya tienes permiso, entra con tu cuenta.');
      view('academySignupForm');
      return;
    }
    if (!user.emailVerified) {
      notice('Confirma tu correo mediante el enlace que recibiste. Después, vuelve a abrir Academy.');
      return;
    }
    const { profile } = await api('me');
    if (!profile) {
      const request = document.getElementById('academyRequestForm');
      const name = user.userMetadata?.full_name || user.name || '';
      const local = user.userMetadata?.academy_local || '';
      request.elements.name.value = name;
      request.elements.local.value = local;
      if (name.trim().length >= 2 && local.trim().length >= 2) {
        try {
          await api('request', { method: 'POST', body: { name, local } });
          notice(`Solicitud enviada para ${local}. El administrador comprobará el local antes de aprobarte.`);
          return;
        } catch (error) { notice(`Confirma tu solicitud: ${friendlyError(error)}`); }
      } else notice('Correo confirmado. Indica tu nombre y el local para solicitar acceso.');
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
  loginNotice('Indica tu correo, nombre y local. Después confirmarás el correo para enviar la solicitud.');
  view('academySignupForm');
});
document.getElementById('showAcademyLogin').addEventListener('click', () => {
  loginNotice('Entra con el correo y la contraseña de una cuenta existente.');
  view('academyLoginForm');
});
document.getElementById('academyLoginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = 'Entrando…';
  loginNotice('Comprobando el correo y la contraseña…');
  try {
    await login(form.elements.email.value.trim(), form.elements.password.value);
    await refreshAccess();
  } catch (error) { loginNotice(friendlyError(error), isUnconfirmed(error)); }
  finally { button.disabled = false; button.textContent = 'Entrar'; }
});
resendConfirmation.addEventListener('click', async () => {
  const form = document.getElementById('academyLoginForm');
  if (!form.reportValidity()) return;
  resendConfirmation.disabled = true;
  loginNotice('Enviando de nuevo el correo de confirmación…', true);
  try {
    await signup(form.elements.email.value.trim(), form.elements.password.value);
    loginNotice('Correo enviado. Revisa la bandeja de entrada y correo no deseado; abre el enlace y vuelve a Academy.');
  } catch (error) { loginNotice(friendlyError(error), true); }
  finally { resendConfirmation.disabled = false; }
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
    const user = await signup(form.elements.email.value.trim(), form.elements.password.value, { full_name: name, academy_local: local });
    if (user.emailVerified) await refreshAccess();
    else {
      view();
      notice('Te hemos enviado un enlace para confirmar el correo. Al abrirlo, Academy enviará tu solicitud al administrador. Revisa también el correo no deseado.');
    }
  } catch (error) { notice(friendlyError(error)); }
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
  } catch (error) { notice(friendlyError(error)); }
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

handleAuthCallback().catch((error) => notice(friendlyError(error)))
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
