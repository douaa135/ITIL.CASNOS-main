/**
 * ============================================================
 * Response Helpers — Format uniforme des réponses API
 * ============================================================
 */

/**
 * Réponse succès
 * { success: true, data: {...}, message: '...' }
 */
const success = (res, data = {}, message = 'OK', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Réponse erreur
 * { success: false, error: { code: '...', message: '...' } }
 */
const error = (res, message = 'Erreur serveur', statusCode = 500, code = 'SERVER_ERROR') => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

// Raccourcis courants
const unauthorized  = (res, msg = 'Non authentifié. Veuillez vous connecter.')          => error(res, msg, 401, 'UNAUTHORIZED');
const forbidden     = (res, msg = 'Accès refusé. Permission insuffisante.')             => error(res, msg, 403, 'FORBIDDEN');
const notFound      = (res, msg = 'Ressource introuvable.')                             => error(res, msg, 404, 'NOT_FOUND');
const badRequest    = (res, msg = 'Données invalides.', code = 'VALIDATION_ERROR')      => error(res, msg, 400, code);
const serverError   = (res, msg = 'Erreur interne du serveur.')                         => error(res, msg, 500, 'SERVER_ERROR');

module.exports = { 
  success, 
  error, 
  unauthorized, 
  forbidden, 
  notFound, 
  badRequest, 
  serverError 
};

/**
 * Utilitaires de réponse API standardisée.
 * Format uniforme : { success, message, data, meta? }
 */

// export function successResponse(res, data = null, status = 200, message = "Succès") {
//   return res.status(status).json({ success: true, message, data });
// }

// export function errorResponse(res, err) {
//   console.error("[API ERROR]", err);
//   const status  = err.status ?? err.statusCode ?? 500;
//   const message = err.message ?? "Erreur serveur interne";
//   return res.status(status).json({ success: false, message, data: null });
// }

// export function paginatedResponse(res, { data, total, page, limit }) {
//   return res.status(200).json({
//     success: true,
//     message: "Succès",
//     data,
//     meta: { total, page, limit, pages: Math.ceil(total / limit) },
//   });
// }