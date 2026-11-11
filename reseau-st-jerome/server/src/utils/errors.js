export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express 4 n’attrape pas les erreurs des fonctions async : ce wrapper les transmet au gestionnaire d’erreurs.
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
