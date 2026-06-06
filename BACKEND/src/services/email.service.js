'use strict';

/**
 * ============================================================
 * email.service.js — Envoi d'emails transactionnels ITIL
 * ============================================================
 * Utilise nodemailer avec transport SMTP configurable via .env.
 *
 * Variables d'environnement requises :
 *   SMTP_HOST        ex: smtp.gmail.com | smtp.casnos.dz
 *   SMTP_PORT        ex: 587 (TLS) ou 465 (SSL)
 *   SMTP_SECURE      true pour SSL (port 465), false pour TLS (port 587)
 *   SMTP_USER        ex: notifications@casnos.dz
 *   SMTP_PASS        mot de passe ou App Password
 *   SMTP_FROM_NAME   ex: CASNOS ITIL (optionnel, défaut: "CASNOS ITIL")
 *   SMTP_FROM_EMAIL  ex: notifications@casnos.dz (optionnel, utilise SMTP_USER)
 *
 * Variables optionnelles :
 *   APP_URL          ex: http://localhost:5173 (pour les liens dans les mails)
 *   MAIL_ENABLED     true | false  (désactiver en dev si besoin, défaut: true)
 *
 * Installation :
 *   npm install nodemailer
 *
 * POSITIONNEMENT : src/services/email.service.js
 * ============================================================
 */

const nodemailer = require('nodemailer');

// ── Configuration ─────────────────────────────────────────────

const MAIL_ENABLED  = process.env.MAIL_ENABLED !== 'false'; // actif par défaut
const APP_URL       = process.env.APP_URL || 'http://localhost:5173';
const FROM_NAME     = process.env.SMTP_FROM_NAME  || 'CASNOS ITIL';
const FROM_EMAIL    = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

// Singleton du transporteur
let _transporter = null;

function _getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true = SSL/465, false = TLS/587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Tolérer les certs auto-signés en dev (retirer en prod)
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  return _transporter;
}

// ============================================================
// TEMPLATES HTML
// ============================================================

/**
 * Layout commun — wraps le contenu dans un email responsive.
 */
function _layout(titre, contenu, lienUrl = null, lienLabel = null) {
  const bouton = lienUrl ? `
    <div style="text-align:center; margin:32px 0;">
      <a href="${lienUrl}"
         style="background:#1a56db; color:#fff; padding:12px 28px; border-radius:6px;
                text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
        ${lienLabel || 'Voir le détail'}
      </a>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titre}</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI',Arial,sans-serif; background:#f4f6f9; color:#1e293b;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#1a56db; padding:20px 40px;">
        <span style="color:#fff; font-size:20px; font-weight:700; letter-spacing:0.5px;">
          🏛️ CASNOS — Gestion des Changements ITIL
        </span>
      </td>
    </tr>
  </table>

  <!-- Corps -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:32px 40px; max-width:640px; margin:0 auto; background:#fff;">

        <h2 style="color:#1a56db; margin-top:0; font-size:20px;">${titre}</h2>

        ${contenu}

        ${bouton}

        <hr style="border:none; border-top:1px solid #e2e8f0; margin:28px 0;">
        <p style="font-size:12px; color:#94a3b8; margin:0;">
          Cet email est généré automatiquement par le système ITIL CASNOS.<br>
          Ne pas répondre directement à ce message.
        </p>

      </td>
    </tr>
  </table>

  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#f1f5f9; padding:16px 40px; text-align:center;">
        <span style="font-size:12px; color:#64748b;">
          © ${new Date().getFullYear()} CASNOS — Direction de Modernisation des Systèmes d'Information (DMSI)
        </span>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Génère une ligne de détail dans le tableau du mail.
 */
function _ligne(label, valeur, couleur = null) {
  const style = couleur
    ? `background:${couleur}; color:#fff; padding:2px 8px; border-radius:4px; font-weight:600; font-size:13px;`
    : '';
  return `
    <tr>
      <td style="padding:8px 12px; font-weight:600; color:#475569; width:40%; border-bottom:1px solid #f1f5f9;">${label}</td>
      <td style="padding:8px 12px; color:#1e293b; border-bottom:1px solid #f1f5f9;">
        ${couleur ? `<span style="${style}">${valeur}</span>` : valeur}
      </td>
    </tr>`;
}

// ── Couleurs par statut ────────────────────────────────────────
const COULEURS_STATUT = {
  APPROUVEE:        '#16a34a',
  REJETEE:          '#dc2626',
  CLOTUREE:         '#64748b',
  SOUMIS:           '#2563eb',
  EVALUEE:          '#7c3aed',
  PRE_APPROUVEE:    '#0891b2',
  EN_COURS:         '#d97706',
  EN_PLANIFICATION: '#6366f1',
  IMPLEMENTE:       '#059669',
  TESTE:            '#10b981',
  EN_ECHEC:         '#dc2626',
  TERMINEE:         '#16a34a',
  ANNULEE:          '#64748b',
};

// ============================================================
// TEMPLATES MÉTIER
// ============================================================

/**
 * Template : changement de statut d'une RFC
 */
function templateRfcStatut({ code_rfc, titre_rfc, nouveau_statut, libelle_statut, demandeur, id_rfc }) {
  const couleur = COULEURS_STATUT[nouveau_statut] || '#1a56db';
  const lienUrl = `${APP_URL}/rfc/${id_rfc}`;

  const tableau = `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; margin:16px 0;">
      ${_ligne('Référence RFC',  code_rfc)}
      ${_ligne('Titre',          titre_rfc)}
      ${_ligne('Statut',         libelle_statut, couleur)}
      ${_ligne('Demandeur',      demandeur)}
      ${_ligne('Date',           new Date().toLocaleString('fr-FR'))}
    </table>`;

  const contenu = `
    <p>Bonjour,</p>
    <p>La <strong>Request For Change</strong> ci-dessous vient de changer de statut :</p>
    ${tableau}
    <p>Connectez-vous à l'application pour consulter les détails ou prendre les actions nécessaires.</p>`;

  return {
    sujet: `[ITIL] RFC ${code_rfc} — Statut : ${libelle_statut}`,
    html:  _layout(`RFC ${code_rfc} — ${libelle_statut}`, contenu, lienUrl, 'Voir la RFC'),
  };
}

/**
 * Template : changement de statut d'un Changement
 */
function templateChangementStatut({ code_changement, nouveau_statut, libelle_statut, change_manager, id_changement }) {
  const couleur = COULEURS_STATUT[nouveau_statut] || '#1a56db';
  const lienUrl = `${APP_URL}/changements/${id_changement}`;

  const tableau = `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; margin:16px 0;">
      ${_ligne('Référence',      code_changement)}
      ${_ligne('Statut',         libelle_statut, couleur)}
      ${_ligne('Change Manager', change_manager)}
      ${_ligne('Date',           new Date().toLocaleString('fr-FR'))}
    </table>`;

  const contenu = `
    <p>Bonjour,</p>
    <p>Le <strong>Changement</strong> ci-dessous a été mis à jour :</p>
    ${tableau}`;

  return {
    sujet: `[ITIL] Changement ${code_changement} — ${libelle_statut}`,
    html:  _layout(`Changement ${code_changement} — ${libelle_statut}`, contenu, lienUrl, 'Voir le Changement'),
  };
}

/**
 * Template : escalade urgente d'une RFC
 */
function templateEscalade({ code_rfc, titre_rfc, demandeur, id_rfc }) {
  const lienUrl = `${APP_URL}/rfc/${id_rfc}`;

  const tableau = `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #fca5a5; border-radius:8px; overflow:hidden; margin:16px 0;
                  background:#fef2f2;">
      ${_ligne('Référence RFC', code_rfc)}
      ${_ligne('Titre',         titre_rfc)}
      ${_ligne('Initiateur',    demandeur)}
      ${_ligne('Priorité',      '⚠️ URGENTE', '#dc2626')}
      ${_ligne('Date',          new Date().toLocaleString('fr-FR'))}
    </table>`;

  const contenu = `
    <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:12px 16px; margin-bottom:20px; border-radius:4px;">
      <strong style="color:#dc2626;">⚠️ Attention — Escalade urgente requise</strong>
    </div>
    <p>Bonjour,</p>
    <p>Une demande d'escalade a été déclenchée pour la RFC suivante. Votre intervention immédiate est requise.</p>
    ${tableau}`;

  return {
    sujet: `⚠️ [ITIL URGENT] Escalade RFC ${code_rfc} — Action immédiate requise`,
    html:  _layout('Escalade Urgente — RFC ' + code_rfc, contenu, lienUrl, 'Traiter en urgence'),
  };
}

/**
 * Template : convocation réunion CAB
 */
function templateConvocationCab({ date_reunion, ordre_jour, rfcs = [], nom_cab }) {
  const listeRfcs = rfcs.length
    ? `<ul style="margin:8px 0; padding-left:20px;">
         ${rfcs.map(r => `<li><strong>${r.code_rfc}</strong> — ${r.titre_rfc}</li>`).join('')}
       </ul>`
    : '<p style="color:#64748b;"><em>Aucune RFC inscrite à l\'ordre du jour.</em></p>';

  const tableau = `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; margin:16px 0;">
      ${_ligne('Comité',         nom_cab)}
      ${_ligne('Date',           new Date(date_reunion).toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' }))}
    </table>
    <p style="font-weight:600; margin-top:20px;">📋 Ordre du jour :</p>
    ${ordre_jour ? `<p style="color:#475569; white-space:pre-line;">${ordre_jour}</p>` : ''}
    <p style="font-weight:600; margin-top:20px;">📌 RFC à évaluer :</p>
    ${listeRfcs}`;

  const contenu = `
    <p>Bonjour,</p>
    <p>Vous êtes convoqué(e) à une réunion du <strong>Comité Aviseur du Changement (CAB)</strong>.</p>
    ${tableau}`;

  return {
    sujet: `[ITIL] Convocation CAB — ${new Date(date_reunion).toLocaleDateString('fr-FR')}`,
    html:  _layout('Convocation CAB', contenu, APP_URL + '/cab', 'Accéder au CAB'),
  };
}

/**
 * Template : notification générique (pour `createNotification` manuel)
 */
function templateGenerique({ objet, message, lienUrl = null }) {
  const contenu = `
    <p>Bonjour,</p>
    <p>${message.replace(/\n/g, '<br>')}</p>`;

  return {
    sujet: `[ITIL] ${objet || 'Notification'}`,
    html:  _layout(objet || 'Notification ITIL', contenu, lienUrl),
  };
}

// ============================================================
// ENVOI
// ============================================================

/**
 * Envoie un email à une ou plusieurs adresses.
 * NON BLOQUANT : les erreurs sont loguées mais ne font pas planter l'appelant.
 *
 * @param {object}         options
 * @param {string|string[]} options.to       Destinataire(s)
 * @param {string}          options.sujet    Objet du mail
 * @param {string}          options.html     Corps HTML
 * @param {string}          [options.text]   Corps texte (fallback)
 * @returns {Promise<boolean>}  true si envoyé, false si désactivé ou en erreur
 */
async function sendMail({ to, sujet, html, text = '' }) {
  if (!MAIL_ENABLED) {
    console.log(`[EMAIL] Désactivé — mail non envoyé à ${Array.isArray(to) ? to.join(', ') : to}`);
    return false;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[EMAIL] SMTP non configuré (SMTP_HOST / SMTP_USER manquants). Mail ignoré.');
    return false;
  }

  try {
    const transporter = _getTransporter();
    const destinataires = Array.isArray(to) ? to.join(', ') : to;

    const info = await transporter.sendMail({
      from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to:      destinataires,
      subject: sujet,
      text:    text || _htmlToText(html),
      html,
    });

    console.log(`[EMAIL] Envoyé → ${destinataires} | MessageId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Erreur d'envoi :`, err.message);
    return false;
  }
}

/**
 * Extrait un texte brut depuis le HTML (fallback basique).
 */
function _htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============================================================
// API MÉTIER — helpers appelés depuis notification.service.js
// ============================================================

async function sendRfcStatutEmail(destinataires, payload) {
  if (!destinataires?.length) return;
  const { sujet, html } = templateRfcStatut(payload);
  await sendMail({ to: destinataires, sujet, html });
}

async function sendChangementStatutEmail(destinataires, payload) {
  if (!destinataires?.length) return;
  const { sujet, html } = templateChangementStatut(payload);
  await sendMail({ to: destinataires, sujet, html });
}

async function sendEscaladeEmail(destinataires, payload) {
  if (!destinataires?.length) return;
  const { sujet, html } = templateEscalade(payload);
  await sendMail({ to: destinataires, sujet, html });
}

async function sendConvocationCabEmail(destinataires, payload) {
  if (!destinataires?.length) return;
  const { sujet, html } = templateConvocationCab(payload);
  await sendMail({ to: destinataires, sujet, html });
}

async function sendGeneriqueEmail(destinataires, payload) {
  if (!destinataires?.length) return;
  const { sujet, html } = templateGenerique(payload);
  await sendMail({ to: destinataires, sujet, html });
}

/**
 * Vérifie la connexion SMTP au démarrage du serveur.
 * Appeler dans server.js après le listen().
 */
async function verifySmtpConnection() {
  if (!MAIL_ENABLED || !process.env.SMTP_HOST) {
    console.log('[EMAIL] Service désactivé ou SMTP non configuré.');
    return false;
  }
  try {
    await _getTransporter().verify();
    console.log('[EMAIL] Connexion SMTP OK');
    return true;
  } catch (err) {
    console.warn('[EMAIL] Connexion SMTP échouée :', err.message);
    return false;
  }
}

module.exports = {
  sendMail,
  sendRfcStatutEmail,
  sendChangementStatutEmail,
  sendEscaladeEmail,
  sendConvocationCabEmail,
  sendGeneriqueEmail,
  verifySmtpConnection,
  // Templates exportés pour personnalisation externe
  templateRfcStatut,
  templateChangementStatut,
  templateEscalade,
  templateConvocationCab,
  templateGenerique,
};