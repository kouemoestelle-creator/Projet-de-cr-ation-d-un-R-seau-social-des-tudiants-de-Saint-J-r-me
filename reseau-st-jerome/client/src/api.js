export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Petit outil unique pour parler au serveur. Les cookies de session sont envoyés automatiquement.
export async function api(path, { method = 'GET', body, formData } = {}) {
  const options = { method, credentials: 'same-origin', headers: {} };
  if (formData) {
    options.body = formData;
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`/api${path}`, options);
  } catch {
    throw new ApiError('Connexion impossible. Vérifiez votre réseau et réessayez.', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      window.dispatchEvent(new Event('sj:unauthorized')); // session expirée : retour à la connexion
    }
    throw new ApiError(data.error || 'Une erreur est survenue.', res.status);
  }
  return data;
}
