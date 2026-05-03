import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import {
  FiUsers, FiUserPlus, FiTrash2, FiEdit2, FiCheck,
  FiX, FiSearch, FiShield, FiToggleLeft, FiToggleRight,
  FiAlertTriangle, FiCheckCircle, FiLoader, FiEye, FiEyeOff, FiBell
} from 'react-icons/fi';
import './AdminCabManagement.css';

// ── Couleurs par rôle ────────────────────────────────────────
const ROLE_META = {
  ADMIN:          { color: '#7c3aed', bg: '#f5f3ff', label: 'Admin' },
  CHANGE_MANAGER: { color: '#0369a1', bg: '#e0f2fe', label: 'Change Manager' },
  IMPLEMENTEUR:   { color: '#047857', bg: '#d1fae5', label: 'Implémenteur' },
  MEMBRE_CAB:     { color: '#b45309', bg: '#fef3c7', label: 'Membre CAB' },
  DEMANDEUR:      { color: '#6b7280', bg: '#f3f4f6', label: 'Demandeur' },
  SERVICE_DESK:   { color: '#0e7490', bg: '#cffafe', label: 'Service Desk' },
  ADMIN_SYSTEME:  { color: '#dc2626', bg: '#fee2e2', label: 'Admin Système' },
};

const RoleBadge = ({ role }) => {
  const meta = ROLE_META[role] || { color: '#64748b', bg: '#f8fafc', label: role };
  return (
    <span style={{
      padding: '0.15rem 0.5rem',
      borderRadius: '99px',
      fontSize: '0.6rem',
      fontWeight: '700',
      color: meta.color,
      background: meta.bg,
      border: `1px solid ${meta.color}30`,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap'
    }}>
      {meta.label}
    </span>
  );
};

const DirectionBadge = ({ name }) => {
  if (!name) return <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontSize: '0.65rem' }}>—</span>;
  return (
    <span style={{
      padding: '0.15rem 0.5rem',
      borderRadius: '6px',
      fontSize: '0.55rem',
      fontWeight: '600',
      color: '#475569',
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      display: 'inline-block',
      wordBreak: 'break-word',
      whiteSpace: 'normal',
      verticalAlign: 'middle',
      maxWidth: '100%',
      lineHeight: '1.2'
    }} title={name}>
      {name}
    </span>
  );
};

// ── Toast notifications ───────────────────────────────────────
const Toast = ({ msg, type, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '1rem 1.5rem', borderRadius: '12px',
    background: type === 'success' ? '#064e3b' : '#7f1d1d',
    color: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    animation: 'slideInUp 0.3s ease',
    minWidth: '280px',
  }}>
    {type === 'success' ? <FiCheckCircle size={18} /> : <FiAlertTriangle size={18} />}
    <span style={{ flex: 1, fontSize: '0.9rem' }}>{msg}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: '2px' }}>
      <FiX size={16} />
    </button>
  </div>
);

// ── Modal de confirmation ─────────────────────────────────────
const ConfirmModal = ({ title, message, onConfirm, onCancel, danger }) => (
  <div className="modal-backdrop-cab" onClick={onCancel}>
    <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
      <div className="modal-top-rfc-style">
        <div className="rfc-style-icon-wrapper" style={{ background: danger ? '#fee2e2' : '#dbeafe', color: danger ? '#dc2626' : '#2563eb', borderColor: danger ? '#fecaca' : '#bfdbfe' }}>
          <FiAlertTriangle size={22} />
        </div>
        <div className="rfc-style-header-text">
          <h2>{title}</h2>
          <div className="rfc-style-subtitle">Confirmation requise</div>
        </div>
        <button className="close-btn-rfc-style" onClick={onCancel}><FiX size={24} /></button>
      </div>

      <div className="modal-body-rfc-style">
        <p style={{ color: '#475569', marginBottom: '1.75rem', lineHeight: 1.6 }}>{message}</p>
      </div>

      <div className="modal-footer-rfc-style">
        <button type="button" className="btn-cancel-rfc-style" onClick={onCancel}>Annuler</button>
        <button type="button" className="btn-submit-rfc-style" onClick={onConfirm} style={{ background: danger ? '#dc2626' : undefined }}>
          Confirmer
        </button>
      </div>
    </div>
  </div>
);

// ── Modal Envoi Notification ──────────────────────────────────
const SendNotifModal = ({ user, onClose, onSent }) => {
  const [form, setForm] = useState({ objet: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setLoading(true);
    try {
      await api.post('/notifications', {
        id_user: user.id_user,
        objet: form.objet,
        message: form.message,
        type_notif: 'IN_APP'
      });
      onSent();
      onClose();
    } catch (err) {
      alert("Erreur lors de l'envoi de la notification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper" style={{ background: '#dbeafe', color: '#2563eb', borderColor: '#bfdbfe' }}>
            <FiBell size={20} />
          </div>
          <div className="rfc-style-header-text">
            <h2>Envoyer une notification</h2>
            <div className="rfc-style-subtitle">Message interne pour l'utilisateur sélectionné</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>

        <div className="modal-body-rfc-style">
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Destinataire : <strong>{user.prenom_user} {user.nom_user}</strong> ({user.email_user})
          </p>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '0.4rem' }}>Objet</label>
              <input 
                value={form.objet} 
                onChange={e => setForm(f => ({...f, objet: e.target.value}))}
                placeholder="Ex: Rappel de validation..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '0.4rem' }}>Message *</label>
              <textarea 
                required
                value={form.message} 
                onChange={e => setForm(f => ({...f, message: e.target.value}))}
                placeholder="Votre message ici..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', minHeight: '120px', outline: 'none', resize: 'vertical' }}
              />
            </div>
            <div className="modal-footer-rfc-style">
              <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Annuler</button>
              <button type="submit" disabled={loading} className="btn-submit-rfc-style">{loading ? 'Envoi...' : 'Envoyer la notification'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── Modal création de compte ──────────────────────────────────
const CreateUserModal = ({ roles, directions, onClose, onCreated }) => {
  const [form, setForm] = useState({
    nom_user: '', prenom_user: '', email_user: '',
    mot_passe: '', nom_role: '', id_direction: '',
    date_naissance: '', telephone_user: '',
  });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.prenom_user.trim()) e.prenom_user = 'Prénom requis';
    if (!form.nom_user.trim())    e.nom_user    = 'Nom requis';
    if (!form.email_user.trim() || !/\S+@\S+\.\S+/.test(form.email_user))
      e.email_user = 'Email valide requis';
    if (form.mot_passe.length < 6)  e.mot_passe  = 'Au moins 6 caractères';
    if (!form.roleName && !form.nom_role) e.roleName = 'Rôle requis';
    if (!form.date_naissance) e.date_naissance = 'Date requise';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const payload = { ...form };
    if (!payload.id_direction) payload.id_direction = null;
    if (payload.telephone_user) payload.phone = payload.telephone_user;
    delete payload.telephone_user;

    try {
      const res = await api.post('/users', payload);
      if (res.success) {
        // Extraction robuste de l'utilisateur
        const createdUser = res.user || res.data?.user || res.data;
        onCreated(createdUser);
        onClose();
      } else setApiError(res.message || 'Erreur inconnue.');
    } catch (err) {
      setApiError(err?.message || err?.error?.message || 'Erreur lors de la création.');
    } finally { setLoading(false); }
  };

  const fieldStyle = (hasErr) => ({
    width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px',
    border: `1.5px solid ${hasErr ? '#ef4444' : '#e2e8f0'}`,
    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  });

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper" style={{ background: '#ede9fe', color: '#7c3aed', borderColor: '#c7d2fe' }}>
            <FiUserPlus size={20} />
          </div>
          <div className="rfc-style-header-text">
            <h2>Nouveau compte</h2>
            <div className="rfc-style-subtitle">Créer un nouvel utilisateur</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>

        <div className="modal-body-rfc-style">
          {apiError && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#b91c1c', fontSize: '0.875rem' }}>
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Prénom *</label>
                <input value={form.prenom_user} onChange={e => setForm(f => ({...f, prenom_user: e.target.value}))}
                  style={fieldStyle(errors.prenom_user)} placeholder="Sara" />
                {errors.prenom_user && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.prenom_user}</span>}
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Nom *</label>
                <input value={form.nom_user} onChange={e => setForm(f => ({...f, nom_user: e.target.value}))}
                  style={fieldStyle(errors.nom_user)} placeholder="Rahmani" />
                {errors.nom_user && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.nom_user}</span>}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Email *</label>
              <input type="email" value={form.email_user} onChange={e => setForm(f => ({...f, email_user: e.target.value}))}
                style={fieldStyle(errors.email_user)} placeholder="sara.rahmani@casnos.dz" />
              {errors.email_user && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.email_user}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Mot de passe *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? "text" : "password"} value={form.mot_passe} onChange={e => setForm(f => ({...f, mot_passe: e.target.value}))}
                    style={{ ...fieldStyle(errors.mot_passe), paddingRight: '2rem' }} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }} title={showPassword ? 'Masquer' : 'Afficher'}>
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
                {errors.mot_passe && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.mot_passe}</span>}
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Téléphone</label>
                <input type="tel" value={form.telephone_user} onChange={e => setForm(f => ({...f, telephone_user: e.target.value}))}
                  style={fieldStyle(false)} />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Date de Naissance *</label>
              <input type="date" value={form.date_naissance} onChange={e => setForm(f => ({...f, date_naissance: e.target.value}))}
                style={fieldStyle(errors.date_naissance)} />
              {errors.date_naissance && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.date_naissance}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Rôle *</label>
                <select value={form.nom_role} onChange={e => setForm(f => ({...f, nom_role: e.target.value}))}
                  style={{ ...fieldStyle(errors.roleName), background: 'white' }}>
                  <option value="">— Sélectionner —</option>
                  {roles.map(r => <option key={r.id_role} value={r.nom_role}>{ROLE_META[r.nom_role]?.label || r.nom_role}</option>)}
                </select>
                {errors.roleName && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.roleName}</span>}
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Direction</label>
                <select value={form.id_direction} onChange={e => setForm(f => ({...f, id_direction: e.target.value}))}
                  style={{ ...fieldStyle(false), background: 'white' }}>
                  <option value="">— Optionnel —</option>
                  {directions.map(d => <option key={d.id_direction} value={d.id_direction}>{d.nom_direction}</option>)}
                </select>
              </div>
            </div>

            <div className="modal-footer-rfc-style">
              <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Annuler</button>
              <button type="submit" disabled={loading} className="btn-submit-rfc-style">
                {loading ? <><FiLoader size={14} /> Création…</> : <><FiUserPlus size={14} /> Créer le compte</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── Modal de Modification d'Utilisateur ───────────────────────
const EditUserModal = ({ user, roles, directions, onClose, onUpdated }) => {
  const [form, setForm] = useState({
    nom_user: user.nom_user || '',
    prenom_user: user.prenom_user || '',
    email_user: user.email_user || '',
    phone: user.phone || '',
    code_metier: user.code_metier || '',
    id_role: user.roles?.[0] ? roles.find(r => r.nom_role === user.roles[0])?.id_role : '',
    id_direction: user.direction?.id_direction || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const selectedRole = roles.find(r => r.id_role === form.id_role);
    const selectedDirection = directions.find(d => String(d.id_direction) === String(form.id_direction));
    
    const payload = { 
      ...form, 
      nom_role: selectedRole?.nom_role 
    };

    try {
      const res = await api.put(`/users/${user.id_user}`, payload);
      if (res.success) {
        // Extraction robuste de l'utilisateur mis à jour
        const updatedData = res.user || res.data?.user || res.data;
        
        // Maintien de la cohérence de la colonne Direction pour la mise à jour optimiste
        updatedData.nom_direction = selectedDirection ? selectedDirection.nom_direction : null;
        
        onUpdated(updatedData);
        onClose();
      } else {
        alert(res.message || 'Erreur lors de la mise à jour.');
      }
    } catch (err) {
      alert(err?.message || err?.error?.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
            <FiEdit2 size={20} />
          </div>
          <div className="rfc-style-header-text">
            <h2>Modifier l'utilisateur</h2>
            <div className="rfc-style-subtitle">Mettre à jour les informations du compte</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>

        <div className="modal-body-rfc-style">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.4rem', color: '#64748b' }}>Prénom</label>
                <input type="text" value={form.prenom_user} onChange={e => setForm({...form, prenom_user: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.4rem', color: '#64748b' }}>Nom</label>
                <input type="text" value={form.nom_user} onChange={e => setForm({...form, nom_user: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} required />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.4rem', color: '#64748b' }}>Email</label>
              <input type="email" value={form.email_user} onChange={e => setForm({...form, email_user: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.4rem', color: '#64748b' }}>Rôle</label>
              <select value={form.id_role} onChange={e => setForm({...form, id_role: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} required>
                <option value="">Sélectionner un rôle</option>
                {roles.map(r => <option key={r.id_role} value={r.id_role}>{r.libelle_role || r.nom_role}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.4rem', color: '#64748b' }}>Téléphone</label>
                <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.4rem', color: '#64748b' }}>Direction</label>
                <select value={form.id_direction} onChange={e => setForm({...form, id_direction: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <option value="">Non assignée</option>
                  {directions.map(d => <option key={d.id_direction} value={d.id_direction}>{d.nom_direction}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer-rfc-style">
              <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Annuler</button>
              <button type="submit" disabled={loading} className="btn-submit-rfc-style">{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── Modal Détails Compte ──────────────────────────────────
const DetailUserModal = ({ user, onClose, onEdit, onToggleStatus }) => {
  if (!user) return null;
  const meta = ROLE_META[user.roles?.[0]] || { color: '#64748b', bg: '#f8fafc', label: user.roles?.[0] };

  const detailStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  };

  const labelStyle = {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: '0.2rem'
  };

  const valueStyle = {
    fontSize: '0.95rem',
    color: '#0f172a',
    fontWeight: '600'
  };

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <button className="close-btn-rfc-style" onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <FiX size={24} />
        </button>

        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper" style={{ background: meta.bg, color: meta.color, borderColor: meta.color + '30' }}>
            <span style={{ fontWeight: '800', fontSize: '1.4rem' }}>{user.nom_user?.[0]}{user.prenom_user?.[0]}</span>
          </div>
          <div className="rfc-style-header-text">
            <h2>{user.prenom_user} {user.nom_user}</h2>
            <div className="rfc-style-subtitle">Détails du compte utilisateur</div>
          </div>
        </div>

        <div className="modal-body-rfc-style">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={detailStyle}>
              <div style={labelStyle}>Email du compte</div>
              <div style={valueStyle}>{user.email_user}</div>
            </div>
            <div style={detailStyle}>
              <div style={labelStyle}>Téléphone</div>
              <div style={valueStyle}>{user.phone || '—'}</div>
            </div>
            <div style={detailStyle}>
              <div style={labelStyle}>Direction</div>
              <div style={valueStyle}>{user.direction?.nom_direction || 'Non assigné'}</div>
            </div>
            <div style={detailStyle}>
              <div style={labelStyle}>Date de Naissance</div>
              <div style={valueStyle}>{user.date_naissance ? new Date(user.date_naissance).toLocaleDateString('fr-DZ') : '—'}</div>
            </div>
            <div style={detailStyle}>
              <div style={labelStyle}>Code Métier</div>
              <div style={valueStyle}>{user.code_metier}</div>
            </div>
            <div style={detailStyle}>
              <div style={labelStyle}>Statut</div>
              <div style={{ ...valueStyle, color: user.actif ? '#059669' : '#dc2626' }}>{user.actif ? 'Actif' : 'Désactivé'}</div>
            </div>
          </div>
        </div>

        <div className="modal-footer-rfc-style" style={{ justifyContent: 'flex-end' }}>
           <button 
             type="button" 
             className="btn-cancel-rfc-style" 
             onClick={() => { onClose(); onToggleStatus(user); }}
             style={{ color: user.actif ? '#dc2626' : '#059669', borderColor: user.actif ? '#fee2e2' : '#d1fae5' }}
           >
              {user.actif ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
              {user.actif ? ' Désactiver' : ' Activer'}
           </button>
           <button type="button" className="btn-submit-rfc-style" onClick={() => { onClose(); onEdit(user); }}>
              <FiEdit2 size={16} /> Modifier
           </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  PAGE PRINCIPALE — UserManagement
// ═══════════════════════════════════════════════════════════
const UserManagement = () => {
  const [users,      setUsers]      = useState([]);
  const [roles,      setRoles]      = useState([]);
  const [directions, setDirections] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterRole,      setFilterRole]      = useState('ALL');
  const [filterDirection, setFilterDirection] = useState('ALL');

  // Modals
  const [showCreate,  setShowCreate]  = useState(false);
  const [editUser,    setEditUser]    = useState(null);   
  const [detailUser,  setDetailUser]  = useState(null);   
  const [confirmDel,  setConfirmDel]  = useState(null);   
  const [confirmTog,  setConfirmTog]  = useState(null);   
  const [sendNotif,   setSendNotif]   = useState(null);   

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [uRes, rRes, dRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
        api.get('/users/directions'),
      ]);
      if (uRes.success) setUsers(uRes.data.data || []);
      if (rRes.success) setRoles(rRes.data.roles || rRes.data || []);
      if (dRes.success) {
        setDirections(dRes.data.directions || dRes.data || []);
      }
    } catch (err) {
      showToast('Erreur lors du chargement des données depuis le backend.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const location = useLocation();

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (location.state?.openCreate) {
      setShowCreate(true);
    }
  }, [location.state]);

  // ── Handlers ──────────────────────────────────────────────
  const handleCreated = (newUser) => {
    // Si la direction n'est qu'un ID, on injecte l'objet direction pour l'affichage immédiat
    if (newUser.id_direction && !newUser.direction) {
      const dir = directions.find(d => d.id_direction === newUser.id_direction);
      if (dir) newUser.direction = dir;
    }
    setUsers(prev => [newUser, ...prev]);
    showToast(`Compte "${newUser.email_user}" créé avec succès !`);
  };

  const handleRoleUpdated = (id_user, newRole) => {
    setUsers(prev => prev.map(u =>
      u.id_user === id_user ? { ...u, roles: [newRole] } : u
    ));
    showToast('Rôle mis à jour avec succès !');
  };

  const handleToggle = async () => {
    const user = confirmTog.user;
    setConfirmTog(null);
    try {
      const res = await api.patch(`/users/${user.id_user}/actif`, { actif: !user.actif });
      if (res.success) {
        setUsers(prev => prev.map(u =>
          u.id_user === user.id_user ? { ...u, actif: !u.actif } : u
        ));
        showToast(`Compte ${!user.actif ? 'activé' : 'désactivé'} avec succès.`);
      } else showToast(res.message || 'Erreur.', 'error');
    } catch (err) {
      showToast(err?.message || 'Erreur réseau.', 'error');
    }
  };

  const handleDelete = async () => {
    const user = confirmDel.user;
    setConfirmDel(null);
    try {
      const res = await api.delete(`/users/${user.id_user}`);
      if (res.success) {
        setUsers(prev => prev.filter(u => u.id_user !== user.id_user));
        showToast('Compte supprimé avec succès.');
        setDetailUser(null);
      } else showToast(res.message || 'Erreur.', 'error');
    } catch (err) {
      showToast(err?.message || 'Ce compte est lié à des données. Désactivez-le.', 'error');
    }
  };

  // ── Filtrage ───────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = !search || (
      `${u.prenom_user} ${u.nom_user} ${u.email_user}`.toLowerCase().includes(search.toLowerCase())
    );
    const matchRole = filterRole === 'ALL' || (u.roles && u.roles.includes(filterRole));
    const matchDir  = filterDirection === 'ALL' 
      ? true 
      : (filterDirection === 'NONE' ? !u.direction?.nom_direction : u.direction?.nom_direction === filterDirection);
    return matchSearch && matchRole && matchDir;
  });

  // ── Stats ──────────────────────────────────────────────────
  const total   = users.length;
  const actifs  = users.filter(u => u.actif).length;
  const inactifs = total - actifs;

  const roleCounts = users.reduce((acc, u) => {
    const r = u.roles?.[0] || 'AUCUN';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTop: '4px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b', fontWeight: '500' }}>Chargement des comptes…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
        @keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.7) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.5) !important;
          box-shadow: 0 8px 32px rgba(31, 38, 135, 0.07) !important;
          border-radius: 20px !important;
        }

        .user-row { 
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .user-row:hover { 
          background: rgba(248, 250, 252, 0.8) !important;
          transform: scale(1.002) translateX(4px);
        }

        .action-btn { 
          background: rgba(255, 255, 255, 0.8); 
          border: 1px solid #e2e8f0; 
          cursor: pointer; 
          padding: 6px; 
          border-radius: 10px; 
          transition: all 0.2s; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .action-btn:hover { 
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .search-input:focus { 
          border-color: #7c3aed !important; 
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1) !important;
          outline: none; 
        }

        /* Style du scrollbar horizontal premium */
        .table-scroll-container::-webkit-scrollbar {
          height: 8px;
        }
        .table-scroll-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .table-scroll-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
          border: 2px solid #f1f5f9;
        }
        .table-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Colonnes collantes (Sticky) pour l'effet de glissement */
        .sticky-col-first {
          position: sticky;
          left: 0;
          z-index: 2;
          background: white !important;
          box-shadow: 4px 0 8px rgba(0,0,0,0.05);
        }
        .sticky-col-last {
          position: sticky;
          right: 0;
          z-index: 2;
          background: white !important;
          box-shadow: -4px 0 8px rgba(0,0,0,0.05);
        }
        thead th.sticky-col-first, thead th.sticky-col-last {
          background: linear-gradient(to right, #f8fafc, #f1f5f9) !important;
          z-index: 3;
        }
        .user-row:hover .sticky-col-first, .user-row:hover .sticky-col-last {
          background: #f8fafc !important;
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FiUsers size={28} color="#7c3aed" /> Gestion des Comptes & RBAC
            </h1>
            <p style={{ color: '#64748b', margin: 0 }}>Gérer les accès, les rôles et les permissions des utilisateurs CASNOS.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-create-premium">
            <FiUserPlus size={16} /> Créer un compte
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div style={{ 
        display: 'grid', 
        gridAutoFlow: 'column', 
        gridAutoColumns: 'minmax(110px, 1fr)', 
        gap: '0.6rem', 
        marginBottom: '1.25rem', 
        overflowX: 'auto', 
        paddingBottom: '0.5rem',
        scrollbarWidth: 'thin'
      }}>
        {/* Totaux de base */}
        <Card style={{ textAlign: 'center', borderTop: '3px solid #64748b', padding: '0.75rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>{total}</div>
          <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total</div>
        </Card>
        <Card style={{ textAlign: 'center', borderTop: '3px solid #10b981', padding: '0.75rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>{actifs}</div>
          <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Actifs</div>
        </Card>
        <Card style={{ textAlign: 'center', borderTop: '3px solid #f59e0b', padding: '0.75rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f59e0b' }}>{inactifs}</div>
          <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Inactifs</div>
        </Card>
        
        {/* Rôles spécifiques - On boucle sur ROLE_META pour garantir l'ordre et la présence */}
        {Object.keys(ROLE_META).map(role => {
          const count = roleCounts[role] || 0;
          const meta = ROLE_META[role];
          return (
            <Card key={role} style={{ textAlign: 'center', borderTop: `3px solid ${meta.color}`, padding: '0.75rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: meta.color }}>{count}</div>
              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {meta.label}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Filters Bar ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <FiSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            style={{
              width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem',
              borderRadius: '10px', border: '1.5px solid #e2e8f0',
              fontSize: '0.9rem', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{
            padding: '0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            fontSize: '0.875rem', background: 'white', cursor: 'pointer', fontWeight: '500',
            minWidth: '150px'
          }}
        >
          <option value="ALL">Tous les rôles</option>
          {roles.map(r => <option key={r.id_role} value={r.nom_role}>{ROLE_META[r.nom_role]?.label || r.nom_role}</option>)}
        </select>

        <select
          value={filterDirection}
          onChange={e => setFilterDirection(e.target.value)}
          style={{
            padding: '0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            fontSize: '0.875rem', background: 'white', cursor: 'pointer', fontWeight: '500',
            minWidth: '150px'
          }}
        >
          <option value="ALL">Toutes les directions</option>
          <option value="NONE">(Sans direction)</option>
          {directions.map(d => <option key={d.id_direction} value={d.nom_direction}>{d.nom_direction}</option>)}
        </select>

        {(search || filterRole !== 'ALL' || filterDirection !== 'ALL') && (
          <button 
            onClick={() => { setSearch(''); setFilterRole('ALL'); setFilterDirection('ALL'); }}
            style={{
              padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #7c3aed',
              fontSize: '0.875rem', background: '#f5f3ff', color: '#7c3aed', 
              cursor: 'pointer', fontWeight: '600'
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <Card className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-scroll-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderBottom: '2px solid #e2e8f0' }}>
                <th className="sticky-col-first" style={{ padding: '0.4rem 0.3rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '16%' }}>Utilisateur</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '16%' }}>Email</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '10%' }}>Rôle</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '18%' }}>Direction</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '10%' }}>Téléphone</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '8%' }}>Statut</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '10%' }}>Création</th>
                <th className="sticky-col-last" style={{ padding: '0.4rem 0.3rem', textAlign: 'center', fontSize: '0.6rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '12%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiUsers size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : filtered.map((u, i) => (
                <tr 
                  key={u.id_user} 
                  className="user-row" 
                  onClick={() => setDetailUser(u)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? 'white' : '#fafbfc',
                    opacity: u.actif ? 1 : 0.6,
                    cursor: 'pointer'
                  }}>
                  {/* 1. Utilisateur */}
                  <td className="sticky-col-first" style={{ padding: '0.4rem 0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '6px',
                        background: ROLE_META[u.roles?.[0]]?.bg || '#f1f5f9',
                        color: ROLE_META[u.roles?.[0]]?.color || '#64748b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '0.6rem',
                      }}>
                        {(u.prenom_user?.[0] || '') + (u.nom_user?.[0] || '')}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.75rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {u.prenom_user} {u.nom_user}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{u.code_metier}</div>
                      </div>
                    </div>
                  </td>

                  {/* 2. Email */}
                  <td style={{ padding: '0.4rem 0.3rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{u.email_user}</div>
                  </td>

                  {/* 3. Rôle */}
                  <td style={{ padding: '0.4rem 0.3rem' }}>
                    {u.roles?.length > 0
                      ? <RoleBadge role={u.roles[0]} />
                      : <span style={{ color: '#cbd5e1', fontSize: '0.7rem', fontStyle: 'italic' }}>—</span>}
                  </td>

                  {/* 4. Direction */}
                  <td style={{ padding: '0.4rem 0.3rem' }}>
                    <DirectionBadge name={u.direction?.nom_direction} />
                  </td>

                  {/* 5. Téléphone */}
                  <td style={{ padding: '0.4rem 0.3rem', fontSize: '0.7rem', color: '#64748b' }}>
                    {u.phone || <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>

                  {/* 6. Statut */}
                  <td style={{ padding: '0.4rem 0.3rem' }}>
                    <span style={{
                      padding: '0.1rem 0.4rem', borderRadius: '99px', fontSize: '0.55rem', fontWeight: '700',
                      color: u.actif ? '#065f46' : '#7f1d1d',
                      background: u.actif ? '#d1fae5' : '#fee2e2',
                      whiteSpace: 'nowrap'
                    }}>
                      {u.actif ? 'Actif' : 'Off'}
                    </span>
                  </td>

                  {/* 7. Création */}
                  <td style={{ padding: '0.4rem 0.3rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                    {u.date_creation ? new Date(u.date_creation).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                  </td>

                  {/* 8. Actions */}
                  <td className="sticky-col-last" style={{ padding: '0.4rem 0.3rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center' }}>
                      <button className="action-btn" style={{ padding: '4px' }} title="Modifier" onClick={() => setEditUser(u)}>
                        <FiEdit2 size={12} color="#3b82f6" />
                      </button>
                      <button className="action-btn" style={{ padding: '4px' }} title={u.actif ? 'Désactiver' : 'Activer'} onClick={() => setConfirmTog({ user: u })}>
                        {u.actif ? <FiToggleRight size={14} color="#10b981" /> : <FiToggleLeft size={14} color="#94a3b8" />}
                      </button>
                      <button className="action-btn" style={{ padding: '4px' }} title="Supprimer" onClick={() => setConfirmDel({ user: u })}>
                        <FiTrash2 size={12} color="#ef4444" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div style={{ padding: '0.75rem 1.25rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''} sur {total} comptes
          </div>
        )}
      </Card>

      {/* ── Modals ─────────────────────────────────────────── */}
      {showCreate && (
        <CreateUserModal
          roles={roles}
          directions={directions}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {detailUser && (
        <DetailUserModal
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onEdit={(u) => setEditUser(u)}
          onToggleStatus={(u) => setConfirmTog({ user: u })}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          roles={roles}
          directions={directions}
          onClose={() => setEditUser(null)}
          onUpdated={async (resData) => {
            // Extraction très robuste de l'objet utilisateur
            let updatedUser = resData?.user || resData?.data?.user || resData?.data || resData;
            
            if (updatedUser && updatedUser.id_user) {
              // Normalisation des rôles : s'assurer que c'est un tableau de strings
              if (Array.isArray(updatedUser.roles)) {
                updatedUser.roles = updatedUser.roles.map(r => (typeof r === 'object' && r !== null) ? (r.nom_role || r.role?.nom_role || JSON.stringify(r)) : r);
              }

              // 1. Mise à jour optimiste et profonde du state
              setUsers(prevUsers => prevUsers.map(u => 
                u.id_user === updatedUser.id_user 
                  ? { ...u, ...updatedUser } 
                  : u
              ));
              
              // 2. Si le détail est ouvert, on le met à jour
              if (detailUser && detailUser.id_user === updatedUser.id_user) {
                setDetailUser(prev => ({ ...prev, ...updatedUser }));
              }
            }
            
            // 3. Re-synchronisation complète avec le backend pour garantir la cohérence
            await fetchData();
            
            showToast('Utilisateur mis à jour avec succès.');
          }}
        />
      )}

      {confirmTog && (
        <ConfirmModal
          title={confirmTog.user.actif ? 'Désactiver le compte' : 'Activer le compte'}
          message={`Voulez-vous ${confirmTog.user.actif ? 'désactiver' : 'activer'} le compte de ${confirmTog.user.prenom_user} ${confirmTog.user.nom_user} (${confirmTog.user.email_user}) ?`}
          danger={confirmTog.user.actif}
          onConfirm={handleToggle}
          onCancel={() => setConfirmTog(null)}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          title="Supprimer le compte"
          message={`Cette action est irréversible. Supprimer "${confirmDel.user.prenom_user} ${confirmDel.user.nom_user}" (${confirmDel.user.email_user}) ?`}
          danger={true}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {sendNotif && (
        <SendNotifModal
          user={sendNotif}
          onClose={() => setSendNotif(null)}
          onSent={() => showToast(`Notification envoyée à ${sendNotif.prenom_user} !`)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default UserManagement;
