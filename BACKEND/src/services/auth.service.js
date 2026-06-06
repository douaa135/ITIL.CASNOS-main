'use strict';

/**
 * ============================================================
 * auth.service.js — Authentification + Gestion mot de passe
 * ============================================================
 * NOUVELLES FONCTIONS :
 *   requestPasswordReset(email)          → génère un token reset (6 chiffres)
 *   resetPassword(token, newPassword)    → valide le token et change le mdp
 *   changePassword(id_user, ancienMdp, nouveauMdp) → changement par l'utilisateur connecté
 * ============================================================
 */

const bcrypt      = require('bcryptjs');
const crypto      = require('crypto');
const jwtUtils    = require('../utils/jwt.utils');
const userService = require('./user.service');
const prisma      = require('./prisma.service');

const BCRYPT_ROUNDS      = 10;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ─── LOGIN ────────────────────────────────────────────────────
async function login(email, password, ipAddress, userAgent) {
  const user = await userService.findByLogin(email);
  if (!user)       throw new Error('Identifiants invalides');
  if (!user.actif) throw new Error('Compte désactivé');

  const passwordOk = await bcrypt.compare(password, user.mot_passe);
  if (!passwordOk) throw new Error('Identifiants invalides');

  const { token: accessToken, jti: accessJti } = jwtUtils.generateAccessToken({
    id_user:     user.id_user,
    email:       user.email_user,
    roles:       user.roles,
    permissions: user.permissions,
  });

  const { token: refreshToken } = jwtUtils.generateRefreshToken(user.id_user);

  await prisma.session.create({
    data: {
      userId:       user.id_user,
      jti:          accessJti,
      refreshToken: refreshToken,
      ip:           ipAddress,
      userAgent:    userAgent,
      active:       true,
      expiresAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900,
    user: userService.sanitize(user),
  };
}

// ─── REFRESH TOKEN ────────────────────────────────────────────
async function refreshAccessToken(rawRefreshToken) {
  const { valid, decoded, error } = jwtUtils.verifyRefreshToken(rawRefreshToken);
  if (!valid) throw new Error(error || 'Refresh token invalide ou expiré');

  const { sub: userId } = decoded;

  const session = await prisma.session.findFirst({
    where: {
      userId,
      refreshToken: rawRefreshToken,
      active:       true,
      revoked:      false,
      expiresAt:    { gt: new Date() },
    },
  });

  if (!session) throw new Error('Session invalide ou expirée. Veuillez vous reconnecter.');

  const user = await userService.findById(userId);
  if (!user || !user.actif) throw new Error('Compte désactivé');

  const { token: newAccessToken } = jwtUtils.generateAccessToken({
    id_user:     user.id_user,
    email:       user.email_user,
    roles:       user.roles,
    permissions: user.permissions,
  });

  return { accessToken: newAccessToken, expiresIn: 900 };
}

// ─── LOGOUT ───────────────────────────────────────────────────
async function logout(rawRefreshToken, userId, accessJti) {
  try {
    await prisma.session.updateMany({
      where: { jti: accessJti, userId },
      data:  { active: false, revoked: true, logoutAt: new Date() },
    });
  } catch (err) {
    console.error('[AUTH] logout error (non bloquant) :', err.message);
  }
}

// ─── MOT DE PASSE OUBLIÉ — Étape 1 : Demande de reset ────────
/**
 * Génère un code de réinitialisation à 6 chiffres, valable 15 min.
 * En production → envoyer par email. Ici → retourné dans la réponse
 * (à remplacer par nodemailer en production).
 *
 * Stocké en base dans la table PasswordResetToken (voir migration).
 *
 * @param {string} email
 * @returns {{ message: string, debug_token?: string }}
 */
async function requestPasswordReset(email) {
  // 1. Vérifier que l'utilisateur existe (ne pas révéler si l'email existe ou non)
  const user = await prisma.utilisateur.findUnique({
    where:  { email_user: email },
    select: { id_user: true, actif: true, nom_user: true, prenom_user: true },
  });

  // Toujours répondre "succès" même si l'email n'existe pas (sécurité anti-enumération)
  if (!user || !user.actif) {
    return {
      message: 'Si cet email existe dans notre système, un code de réinitialisation a été envoyé.',
    };
  }

  // 2. Invalider tous les tokens reset précédents de cet utilisateur
  await prisma.passwordResetToken.deleteMany({
    where: { id_user: user.id_user },
  });

  // 3. Générer un code à 6 chiffres cryptographiquement sûr
  const code       = String(crypto.randomInt(100000, 999999)); // 100000–999999
  const codeHashed = await bcrypt.hash(code, 10);
  const expiresAt  = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  // 4. Stocker en base
  await prisma.passwordResetToken.create({
    data: {
      id_user:    user.id_user,
      token_hash: codeHashed,
      expires_at: expiresAt,
      used:       false,
    },
  });

  // 5. TODO production : envoyer par email via nodemailer
const { sendMail } = require('./email.service');

await sendMail({
  to:   email,
  sujet: '[CASNOS] Code de réinitialisation de mot de passe',
  html: `
    <p>Bonjour <strong>${user.prenom_user}</strong>,</p>
    <p>Voici votre code de réinitialisation :</p>
    <div style="font-size:32px; font-weight:bold; letter-spacing:8px; 
                text-align:center; padding:20px; background:#f1f5f9; 
                border-radius:8px; margin:20px 0;">
      ${code}
    </div>
    <p>Ce code est valable <strong>15 minutes</strong>.</p>
    <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
  `,
});

  return {
    message:     'Si cet email existe dans notre système, un code de réinitialisation a été envoyé.',
    expires_in:  '15 minutes',
  };
}

// ─── MOT DE PASSE OUBLIÉ — Étape 2 : Valider code + nouveau mdp ──
/**
 * Valide le code de réinitialisation et applique le nouveau mot de passe.
 *
 * @param {string} email
 * @param {string} code          Code à 6 chiffres reçu par l'utilisateur
 * @param {string} newPassword   Nouveau mot de passe (min 8 caractères)
 */
async function resetPassword(email, code, newPassword) {
  // 1. Trouver l'utilisateur
  const user = await prisma.utilisateur.findUnique({
    where:  { email_user: email },
    select: { id_user: true, actif: true },
  });

  if (!user || !user.actif) {
    const err = new Error('Demande de réinitialisation invalide ou expirée.');
    err.code = 'INVALID_RESET';
    throw err;
  }

  // 2. Trouver le token reset actif
  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: {
      id_user:    user.id_user,
      used:       false,
      expires_at: { gt: new Date() }, // pas encore expiré
    },
    orderBy: { created_at: 'desc' },
  });

  if (!resetRecord) {
    const err = new Error('Code de réinitialisation invalide ou expiré. Veuillez refaire une demande.');
    err.code = 'INVALID_RESET';
    throw err;
  }

  // 3. Comparer le code fourni avec le hash stocké
  const codeOk = await bcrypt.compare(code, resetRecord.token_hash);
  if (!codeOk) {
    const err = new Error('Code de réinitialisation incorrect.');
    err.code = 'INVALID_RESET';
    throw err;
  }

  // 4. Valider le nouveau mot de passe
  if (!newPassword || newPassword.length < 8) {
    const err = new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    err.code = 'WEAK_PASSWORD';
    throw err;
  }

  // 5. Hasher + appliquer le nouveau mot de passe + invalider le token (transaction)
  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    // Mettre à jour le mot de passe
    await tx.utilisateur.update({
      where: { id_user: user.id_user },
      data:  { mot_passe: hashedPassword },
    });

    // Marquer le token comme utilisé
    await tx.passwordResetToken.update({
      where: { id: resetRecord.id },
      data:  { used: true },
    });

    // Révoquer toutes les sessions actives (sécurité : déconnexion forcée)
    await tx.session.updateMany({
      where: { userId: user.id_user, active: true },
      data:  { active: false, revoked: true, logoutAt: new Date() },
    });
  });

  return { message: 'Mot de passe réinitialisé avec succès. Veuillez vous reconnecter.' };
}

// ─── CHANGEMENT DE MOT DE PASSE PAR L'UTILISATEUR CONNECTÉ ───
/**
 * Permet à un utilisateur authentifié de changer son propre mot de passe.
 * Exige l'ancien mot de passe pour confirmation.
 *
 * @param {string} id_user        UUID de l'utilisateur connecté (depuis JWT)
 * @param {string} ancienMotPasse Mot de passe actuel pour vérification
 * @param {string} nouveauMotPasse Nouveau mot de passe (min 8 caractères)
 */
async function changePassword(id_user, ancienMotPasse, nouveauMotPasse) {
  // 1. Récupérer l'utilisateur avec son hash
  const user = await prisma.utilisateur.findUnique({
    where:  { id_user },
    select: { id_user: true, mot_passe: true, actif: true },
  });

  if (!user || !user.actif) {
    const err = new Error('Utilisateur introuvable ou compte désactivé.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // 2. Vérifier l'ancien mot de passe
  const ancienOk = await bcrypt.compare(ancienMotPasse, user.mot_passe);
  if (!ancienOk) {
    const err = new Error('Mot de passe actuel incorrect.');
    err.code = 'WRONG_PASSWORD';
    err.statusCode = 400;
    throw err;
  }

  // 3. Valider le nouveau mot de passe
  if (!nouveauMotPasse || nouveauMotPasse.length < 8) {
    const err = new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    err.code = 'WEAK_PASSWORD';
    err.statusCode = 400;
    throw err;
  }

  // 4. Vérifier que le nouveau ≠ l'ancien
  const samePassword = await bcrypt.compare(nouveauMotPasse, user.mot_passe);
  if (samePassword) {
    const err = new Error('Le nouveau mot de passe doit être différent de l\'ancien.');
    err.code = 'SAME_PASSWORD';
    err.statusCode = 400;
    throw err;
  }

  // 5. Hasher + sauvegarder
  const hashedPassword = await bcrypt.hash(nouveauMotPasse, BCRYPT_ROUNDS);

  await prisma.utilisateur.update({
    where: { id_user },
    data:  { mot_passe: hashedPassword },
  });

  // 6. Révoquer toutes les autres sessions (sécurité)
  //    La session courante sera invalidée côté client après la réponse
  await prisma.session.updateMany({
    where: { userId: id_user, active: true },
    data:  { active: false, revoked: true, logoutAt: new Date() },
  });

  return { message: 'Mot de passe modifié avec succès. Veuillez vous reconnecter.' };
}

module.exports = {
  login,
  refreshAccessToken,
  logout,
  requestPasswordReset,
  resetPassword,
  changePassword,
};