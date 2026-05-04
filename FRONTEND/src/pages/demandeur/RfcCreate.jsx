import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiFileText, FiTarget, FiShield, FiPaperclip,
  FiChevronRight, FiChevronLeft, FiCheck,
  FiUpload, FiFile, FiSend, FiX, FiInfo
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import './RfcCreate.css';

import api from '../../api/axiosClient';
import rfcService from '../../services/rfcService';

const ROLE_LABELS = {
  ADMIN:          'Admin',
  CHANGE_MANAGER: 'Change Manager',
  SERVICE_DESK:   'Service Desk',
  IMPLEMENTEUR:   'Implémenteur',
  DEMANDEUR:      'Demandeur',
  MEMBRE_CAB:     'Membre CAB',
  ADMIN_SYSTEME:  'Admin Système',
};

// ─── Static Data ───────────────────────────
const STEPS = [
  { label: 'Description',  icon: <FiFileText /> },
  { label: 'Justification & Implémentation', icon: <FiTarget /> },
  { label: 'Documentation de soutien', icon: <FiPaperclip /> },
];

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
};

// ─── Sub-components ─────────────────────────────────────────────────────────
const StepperBar = ({ current }) => (
  <div className="stepper">
    {STEPS.map((step, i) => {
      const state = i < current ? 'completed' : i === current ? 'active' : '';
      return (
        <div key={i} className="step-item" style={{ flex: i < STEPS.length - 1 ? '1' : 'none' }}>
          <div className="step-bullet-wrapper">
            <div className={`step-bullet ${state}`}>
              {i < current ? <FiCheck size={16} /> : i + 1}
            </div>
            <span className={`step-label ${state}`}>{step.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`step-connector ${i < current ? 'completed' : ''}`} />
          )}
        </div>
      );
    })}
  </div>
);

const FormCardHeader = ({ icon, title, subtitle }) => (
  <div className="form-card-header">
    <div className="form-card-header-icon">{icon}</div>
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  </div>
);

// ─── Modèles prédéfinis ──────────────────────────────────────────────────────
const TEMPLATES = [
  {
    label: 'Mise à jour préventive',
    titre: 'Mise à jour préventive du système [Nom]',
    description: 'Opération de maintenance proactive visant à appliquer les derniers correctifs et optimisations sur l\'infrastructure [Nom].',
    justification: 'Garantir la stabilité et la disponibilité continue des services critiques.'
  },
  {
    label: 'Interruption de service',
    titre: 'Interruption de service planifiée - [Service]',
    description: 'Arrêt temporaire du service [Nom] pour permettre des interventions techniques majeures sur la couche [Base de données/Réseau].',
    justification: 'Nécessaire pour le déploiement de correctifs structurels ne pouvant être appliqués à chaud.'
  },
  {
    label: 'Service restauré',
    titre: 'Restauration complète du service [Service]',
    description: 'Suite à l\'incident [ID], nous procédons à la restauration formelle de la configuration stable du service [Nom].',
    justification: 'Rétablissement de l\'activité métier normale après résolution technique.'
  },
  {
    label: 'Changement d\'urgence',
    titre: 'Changement d\'urgence en cours - [Composant]',
    description: 'Application immédiate d\'une solution de contournement ou d\'un correctif pour résoudre une panne bloquante sur [Nom].',
    justification: 'Résolution d\'un incident de haute priorité impactant gravement la production.'
  },
  {
    label: 'Maintenance ce soir',
    titre: 'Maintenance planifiée – ce soir - [Infrastructure]',
    description: 'Travaux de maintenance périodique prévus ce soir entre 18h et 20h sur les serveurs de [Module].',
    justification: 'Entretien régulier pour prévenir les pannes et assurer les performances.'
  },
  {
    label: 'Nouvelle RFC soumise',
    titre: 'Nouvelle RFC soumise – action requise - [Projet]',
    description: 'Soumission d\'un changement pour le projet [Nom] nécessitant une analyse et une validation prioritaire.',
    justification: 'Respect des délais de mise en production pour les nouveaux besoins métier.'
  }
];

// ─── STEP 1 : Informations générales ─────────────────────────────────────────
const Step1 = ({ data, onChange, isSD, demandeurs, isEdit, environments }) => {
  const applyTemplate = (t) => {
    onChange('titre', t.titre);
    onChange('description', t.description);
    onChange('justification', t.justification);
  };

  return (
    <div className="form-card-body">
      {!isEdit && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Suggestions de modèles :</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyTemplate(t)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.color = '#3b82f6'; }}
                onMouseLeave={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.color = '#475569'; }}
              >
                <FiFileText size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="form-grid cols-1" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
      {isSD && (
        <div className="form-field">
          <label className="form-label">Émettre au nom de (Demandeur) <span className="required">*</span></label>
          <select 
            className="form-select" 
            value={data.id_demandeur || ''} 
            onChange={e => onChange('id_demandeur', e.target.value)}
            style={{ fontWeight: 600 }}
          >
            <option value="">-- Sélectionner le demandeur --</option>
            {demandeurs.map(u => (
              <option key={u.id_user} value={u.id_user}>
                👤 {u.prenom_user} {u.nom_user} ({ROLE_LABELS[u.roles?.[0]] || 'Demandeur'})
              </option>
            ))}
          </select>
          <span className="form-hint" style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#64748b' }}>
            En tant que Service Desk / Admin, vous pouvez créer une RFC pour un autre utilisateur.
          </span>
        </div>
      )}
      


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="form-field">
          <label className="form-label">Titre de la RFC <span className="required">*</span></label>
          <input
            className="form-input"
            placeholder="Titre clair et concis (ex: Ajout d'un rapport financier mensuel)"
            value={data.titre}
            onChange={e => onChange('titre', e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Cible (Environnement) <span className="required">*</span></label>
          <select 
            className="form-select" 
            value={data.id_env || ''} 
            onChange={e => onChange('id_env', e.target.value)}
            style={{ fontWeight: 600 }}
            required
          >
            <option value="">-- Sélectionner l'environnement --</option>
            {environments.map(env => (
              <option key={env.id_env} value={env.id_env}>
                 {env.nom_env}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Description détaillée de la demande <span className="required">*</span></label>
        <textarea
          className="form-textarea"
          rows={5}
          placeholder="Décrivez précisément ce que vous souhaitez accomplir ou modifier..."
          value={data.description}
          onChange={e => onChange('description', e.target.value)}
        />
        <span className="form-hint">Fournissez toutes les informations nécessaires pour une première compréhension par le Service Desk et le Change Manager.</span>
      </div>
    </div>
  </div>
);
};

// ─── STEP 2 : Justification, Implémentation & Risques ────────────────────────
const Step2 = ({ data, onChange }) => (
  <div className="form-card-body">
    <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="form-field">
        <label className="form-label">Justification Business (Métier) <span className="required">*</span></label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Pourquoi avons-nous besoin de ce changement ? (Gain de temps, obligation légale, correction...)"
          value={data.justification}
          onChange={e => onChange('justification', e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="form-field">
          <label className="form-label">Urgence métier exprimée</label>
          <select className="form-select" value={data.urgence} onChange={e => onChange('urgence', e.target.value)}>
            <option value="FAIBLE">🟢 Faible (Aucun impact immédiat)</option>
            <option value="NORMALE">🟡 Normale (Impact opérationnel standard)</option>
            <option value="HAUTE">🔴 Haute (Impact direct sur l'activité)</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Date de mise en œuvre souhaitée</label>
          <input
            className="form-input"
            type="date"
            value={data.dateSouhaitee}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => onChange('dateSouhaitee', e.target.value)}
          />
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Plan d'implémentation proposé (Si connu)</label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Comment pensez-vous que ce changement devrait être mis en œuvre ?"
          value={data.planImplementation}
          onChange={e => onChange('planImplementation', e.target.value)}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Risques identifiés par le métier</label>
        <textarea
          className="form-textarea"
          rows={2}
          placeholder="Y a-t-il des périodes critiques à éviter ? Des risques d'interruption perçus ?"
          value={data.risquesConnus}
          onChange={e => onChange('risquesConnus', e.target.value)}
        />
      </div>
    </div>
  </div>
);

// ─── STEP 3 : Pièces jointes (Documentation) ──────────────────────────────────
const Step3 = ({ data, onChange }) => {
  const [drag, setDrag] = useState(false);

  const handleFiles = (files) => {
    const newFiles = Array.from(files).map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      size: f.size,
      type: f.type,
      raw: f // Conserver le fichier brut pour l'upload réel plus tard
    }));
    onChange('piecesJointes', [...data.piecesJointes, ...newFiles]);
  };

  const removeFile = (id) => onChange('piecesJointes', data.piecesJointes.filter(f => f.id !== id));

  return (
    <div className="form-card-body">
      <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        La documentation de soutien (rapports de bugs, cahier des charges, maquettes) est essentielle pour permettre au Change Manager d'évaluer le changement.
      </div>

      <div
        className={`file-dropzone ${drag ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      >
        <input type="file" multiple onChange={e => handleFiles(e.target.files)} />
        <div className="dropzone-icon"><FiUpload /></div>
        <div className="dropzone-text">
          <h4>Glissez vos documents de soutien ici</h4>
          <p>ou <span>cliquez pour parcourir</span></p>
        </div>
      </div>

      {data.piecesJointes.length > 0 && (
        <div className="attached-files">
          {data.piecesJointes.map(file => (
            <div key={file.id} className="attached-file-item">
              <div className="file-icon-box"><FiFile /></div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatSize(file.size)}</div>
              </div>
              <button className="file-remove" onClick={() => removeFile(file.id)}><FiX /></button>
            </div>
          ))}
        </div>
      )}

      {/* Message Final */}
      <div style={{
        marginTop: '2rem', padding: '1rem 1.25rem',
        background: 'var(--status-info-bg)', borderRadius: 'var(--radius-md)',
        borderLeft: '4px solid var(--primary-color)',
        display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
      }}>
        <FiInfo style={{ color: 'var(--primary-color)', marginTop: '2px', flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--status-info-text)', marginBottom: '0.25rem' }}>
            Prêt à soumettre au Change Manager
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--status-info-text)', opacity: 0.85 }}>
            Une fois soumise, votre demande sera analysée techniquement. Restez disponible pour clarifier la demande si le Change Manager vous sollicite via les commentaires.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const RfcCreate = ({ isModal = false, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [demandeurs, setDemandeurs] = useState([]);
  const [environments, setEnvironments] = useState([]);

  const userRole = user?.roles?.[0] || user?.role;
  // On ne redirige vers Service Desk que si on est explicitement dans une route Service Desk
  const isSD = (userRole === 'SERVICE_DESK' || userRole === 'ADMIN') && location.pathname.startsWith('/servicedesk');

  // Fetch demandeurs for SD/Admin and environments
  useEffect(() => {
    if (isSD) {
      rfcService.getUsersByRole('DEMANDEUR')
        .then(list => setDemandeurs(list))
        .catch(err => console.error('Error fetching demandeurs:', err));
    }
    
    // Fetch environments for all
    api.get('/environnements')
      .then(res => {
        const list = res.data?.environnements || res.data || [];
        setEnvironments(Array.isArray(list) ? list : []);
      })
      .catch(err => console.error('Error fetching environments:', err));
  }, [isSD]);

  const isEdit = location.state?.edit;
  const initialRfc = location.state?.rfcData;

  const [form, setForm] = useState({
    id_demandeur: initialRfc?.id_user || '',
    titre: initialRfc?.titre || '', 
    description: initialRfc?.description || '', 
    justification: initialRfc?.justification || '', 
    dateSouhaitee: initialRfc?.date_souhaitee || '', 
    urgence: initialRfc?.urgence || 'NORMALE',
    impacte_estimee: initialRfc?.impacte_estimee || 'MINEUR',
    id_env: initialRfc?.id_env || '',
    planImplementation: initialRfc?.planImplementation || '', 
    risquesConnus: initialRfc?.risquesConnus || '',
    piecesJointes: [],
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const isStepValid = () => {
    if (step === 0) return form.titre && form.description;
    if (step === 1) return form.justification;
    return true;
  };

  const handleNext = () => { if (isStepValid()) setStep(s => s + 1); };
  const handleBack = () => setStep(s => s - 1);
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        titre_rfc:      form.titre,
        description:    form.description,
        justification:  form.justification,
        date_souhaitee: form.dateSouhaitee || null,
        urgence:        form.urgence === 'HAUTE',
        impacte_estimee: form.impacte_estimee || 'MINEUR',
        id_env:          form.id_env || null,
        id_user:         isSD ? form.id_demandeur : undefined,
      };

      if (isEdit) {
        await rfcService.updateRfc(initialRfc.db_id, payload);
      } else {
        await rfcService.createRfc(payload); // On crée juste, le backend gère le statut par défaut
      }

      if (isModal && onSuccess) {
        onSuccess();
      } else {
        const targetPath = isSD ? '/servicedesk/inquiry' : '/mes-rfcs';
        navigate(targetPath, { state: { success: true } });
      }
    } catch (err) {
      console.error('RFC Save Error:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepHeaders = [
    { icon: <FiFileText />, title: 'Informations de base', subtitle: 'La définition de votre demande de changement.' },
    { icon: <FiTarget />, title: 'Objectifs et Implémentation', subtitle: 'La justification business et l\'implémentation souhaitée.' },
    { icon: <FiPaperclip />, title: 'Documentation de soutien', subtitle: 'Fournissez les documents pertinents pour le dossier.' },
  ];

  return (
    <div className={isModal ? "" : "rfc-create-page"}>
      {!isModal && (
        <>
          {/* Breadcrumb */}
          <nav className="page-breadcrumb">
            {isSD ? (
              <a onClick={() => navigate('/servicedesk/inquiry')}>Gestion des RFC (Service Desk)</a>
            ) : (
              <a onClick={() => navigate('/mes-rfcs')}>Mes RFCs (Demandeur)</a>
            )}
            <FiChevronRight className="breadcrumb-sep" />
            <span>{isEdit ? 'Modifier la Demande' : 'Nouvelle Demande'}</span>
          </nav>

          {/* Heading */}
          <div className="create-page-heading">
            <h1>{isEdit ? 'Modifier votre RFC' : 'Soumettre une RFC'}</h1>
            <p>Fournissez les informations métier nécessaires pour initier le processus de changement.</p>
          </div>
        </>
      )}

      {/* Stepper */}
      <StepperBar current={step} />

      {/* Form Card */}
      <div className="form-card">
        {error && (
          <div className="form-error-summary">
            <FiX className="error-close" onClick={() => setError(null)} />
            <div className="error-icon-box"><FiInfo /></div>
            <div className="error-text">
              <strong>Erreur de soumission</strong>
              <p>{error}</p>
            </div>
          </div>
        )}
        <FormCardHeader {...stepHeaders[step]} />

        {step === 0 && <Step1 data={form} onChange={update} isSD={isSD} demandeurs={demandeurs} isEdit={isEdit} environments={environments} />}
        {step === 1 && <Step2 data={form} onChange={update} />}
        {step === 2 && <Step3 data={form} onChange={update} />}

        {/* Navigation */}
        <div className="form-navigation">
          <span className="nav-progress">Étape <span>{step + 1}</span> sur {STEPS.length}</span>
          <div className="nav-btn-group">
            {isModal && step === 0 && (
              <Button variant="secondary" onClick={onCancel}>
                Annuler
              </Button>
            )}
            {step > 0 && (
              <Button variant="secondary" icon={<FiChevronLeft />} onClick={handleBack}>
                Précédent
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!isStepValid()}
                style={{ opacity: isStepValid() ? 1 : 0.5 }}
              >
                Suivant <FiChevronRight style={{ marginLeft: '0.25rem' }} />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="submit-loading">
                    <span className="spinner" /> {isEdit ? 'Mise à jour...' : 'Envoi...'}
                  </span>
                ) : (
                  <><FiSend style={{ marginRight: '0.375rem' }} /> {isEdit ? 'Mettre à jour' : 'Soumettre la demande'}</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RfcCreate;
