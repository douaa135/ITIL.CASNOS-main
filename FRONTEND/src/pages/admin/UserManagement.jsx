import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import Toast from '../../components/common/Toast';
import StatCard from '../../components/common/StatCard';
import {
  FiUsers, FiUserPlus, FiTrash2, FiEdit2, FiCheck,
  FiX, FiSearch, FiShield, FiToggleLeft, FiToggleRight,
  FiAlertTriangle, FiCheckCircle, FiLoader, FiEye, FiEyeOff, FiBell, FiCalendar, FiClock, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight
} from 'react-icons/fi';
import './UserManagement.css';
import './AdminUnified.css';
import PremiumToolbar from '../../components/common/PremiumToolbar';

// ── Couleurs par rôle ────────────────────────────────────────
const ROLE_META = {
  ADMIN:          { color: '#7c3aed', bg: '#f5f3ff', label: 'Admin' },
  CHANGE_MANAGER: { color: '#0369a1', bg: '#e0f2fe', label: 'Change Manager' },
  IMPLEMENTEUR:   { color: '#047857', bg: '#d1fae5', label: 'Implémenteur' },
  MEMBRE_CAB:     { color: '#b45309', bg: '#fef3c7', label: 'Membre CAB' },
  DEMANDEUR:      { color: '#0c3709', bg: '#f3f4f6', label: 'Demandeur' },
  SERVICE_DESK:   { color: '#0e7490', bg: '#cffafe', label: 'Service Desk' },
};

const ITEMS_PER_PAGE = 10;

const RoleBadge = ({ role }) => {
  const meta = ROLE_META[role] || { color: '#64748b', bg: '#f8fafc', label: role };
  return (
    <span style={{
      padding: '0.15rem 0.5rem',
      borderRadius: '99px',
      fontSize: '0.8rem',
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

const ROLE_UI = {
  ADMIN:          { color: 'purple', icon: <FiShield size={20} /> },
  CHANGE_MANAGER: { color: 'blue',   icon: <FiUsers size={20} /> },
  IMPLEMENTEUR:   { color: 'green',  icon: <FiCheckCircle size={20} /> },
  MEMBRE_CAB:     { color: 'amber',  icon: <FiUsers size={20} /> },
  DEMANDEUR:      { color: 'gray',   icon: <FiUserPlus size={20} /> },
  SERVICE_DESK:   { color: 'cyan',   icon: <FiClock size={20} /> },
};

const DirectionBadge = ({ name }) => {
  if (!name) return <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontSize: '0.65rem' }}>—</span>;
  return (
    <span style={{
      padding: '0.3rem 0.7rem',
      borderRadius: '8px',
      fontSize: '0.8rem',
      fontWeight: '700',
      color: '#6b21a8',
      background: '#f5f3ff',
      border: '1px solid #ddd6fe',
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

import ConfirmModal from '../../components/common/ConfirmModal';

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
      console.error(err);
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
          <button className="close-btn-rfc-style" onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10 }}><FiX size={24} /></button>
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

// ── Utilitaire email auto ─────────────────────────────────────
const generateEmail = (prenom, nom) => {
  const normalize = (str) =>
    str.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
  return `${normalize(prenom)}.${normalize(nom)}@casnos.dz`;
};

// ── Modal création de compte ──────────────────────────────────
const CreateUserModal = ({ roles, directions, onClose, onCreated }) => {
  const [form, setForm] = useState({
    nom_user: '', prenom_user: '', email_user: '',
    mot_passe: '', nom_role: '', id_direction: '',
    date_naissance: '', telephone_user: '',
  });
  const [emailAuto, setEmailAuto]   = useState(true);
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);
  const [apiError, setApiError]     = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Mise à jour champs + regénération email ───────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (emailAuto && (name === 'prenom_user' || name === 'nom_user')) {
        const prenom = name === 'prenom_user' ? value : prev.prenom_user;
        const nom    = name === 'nom_user'    ? value : prev.nom_user;
        if (prenom && nom) updated.email_user = generateEmail(prenom, nom);
        else if (prenom)   updated.email_user = `${prenom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.')}@casnos.dz`;
        else               updated.email_user = '';
      }
      return updated;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.prenom_user.trim()) e.prenom_user = 'Prénom requis';
    if (!form.nom_user.trim())    e.nom_user    = 'Nom requis';
    if (!form.email_user.trim() || !/\S+@\S+\.\S+/.test(form.email_user))
      e.email_user = 'Email valide requis';
    if (form.mot_passe.length < 6)  e.mot_passe  = 'Au moins 6 caractères';
    if (!form.nom_role) e.nom_role = 'Rôle requis';
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
      if (res.success) { onCreated(res.user || res.data?.user || res.data); onClose(); }
      else setApiError(res.message || 'Erreur inconnue.');
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
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '520px', background: '#f0f9ff', border: '1px solid #003366' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
          <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
            <FiUserPlus size={20} />
          </div>
          <div className="rfc-style-header-text">
            <h2 style={{ color: '#ffffff' }}>Nouveau compte</h2>
            <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Créer un nouvel utilisateur sur la plateforme</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}><FiX size={24} /></button>
        </div>

        <div className="modal-body-rfc-style">
          {apiError && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#b91c1c', fontSize: '0.875rem' }}>
              {apiError}
            </div>
          )}
          <form onSubmit={handleSubmit}>

            {/* Prénom + Nom */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Prénom *</label>
                <input name="prenom_user" value={form.prenom_user} onChange={handleChange}
                  style={fieldStyle(errors.prenom_user)} placeholder="Sara" />
                {errors.prenom_user && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.prenom_user}</span>}
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Nom *</label>
                <input name="nom_user" value={form.nom_user} onChange={handleChange}
                  style={fieldStyle(errors.nom_user)} placeholder="Rahmani" />
                {errors.nom_user && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.nom_user}</span>}
              </div>
            </div>

            {/* Email auto-généré */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>Email *</label>
                <button type="button" onClick={() => setEmailAuto(v => !v)}
                  style={{ fontSize: '0.7rem', fontWeight: '600', color: emailAuto ? '#2563eb' : '#94a3b8', background: emailAuto ? '#eff6ff' : '#f8fafc', border: `1px solid ${emailAuto ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '6px', padding: '2px 8px', cursor: 'pointer' }}>
                  {emailAuto ? '✦ Auto' : '✎ Manuel'}
                </button>
              </div>
              <input
                name="email_user"
                type="email"
                value={form.email_user}
                onChange={emailAuto ? undefined : handleChange}
                readOnly={emailAuto}
                style={{
                  ...fieldStyle(errors.email_user),
                  background: emailAuto ? '#eff6ff' : 'white',
                  color: emailAuto ? '#2563eb' : '#0f172a',
                  fontWeight: emailAuto ? '600' : '400',
                }}
                placeholder="sara.rahmani@casnos.dz"
              />
              {errors.email_user && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.email_user}</span>}
            </div>

            {/* Mot de passe + Téléphone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Mot de passe *</label>
                <div style={{ position: 'relative' }}>
                  <input name="mot_passe" type={showPassword ? 'text' : 'password'} value={form.mot_passe} onChange={handleChange}
                    style={{ ...fieldStyle(errors.mot_passe), paddingRight: '2rem' }} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
                {errors.mot_passe && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.mot_passe}</span>}
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Téléphone</label>
                <input name="telephone_user" type="tel" value={form.telephone_user} onChange={handleChange}
                  style={fieldStyle(false)} />
              </div>
            </div>

            {/* Date de naissance */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Date de Naissance *</label>
              <input name="date_naissance" type="date" value={form.date_naissance} onChange={handleChange}
                style={fieldStyle(errors.date_naissance)} />
              {errors.date_naissance && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.date_naissance}</span>}
            </div>

            {/* Rôle + Direction */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Rôle *</label>
                <select name="nom_role" value={form.nom_role} onChange={handleChange}
                  style={{ ...fieldStyle(errors.nom_role), background: 'white' }}>
                  <option value="">— Sélectionner —</option>
                  {roles.filter(r => r.nom_role !== 'SYSTEME' && r.nom_role !== 'SYSTEM').map(r => <option key={r.id_role} value={r.nom_role}>{ROLE_META[r.nom_role]?.label || r.nom_role}</option>)}
                </select>
                {errors.nom_role && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.nom_role}</span>}
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>Direction</label>
                <select name="id_direction" value={form.id_direction} onChange={handleChange}
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
    const payload = { ...form, nom_role: selectedRole?.nom_role };

    try {
      const res = await api.put(`/users/${user.id_user}`, payload);
      if (res.success) {
        const updatedData = res.user || res.data?.user || res.data;
        updatedData.nom_direction = selectedDirection ? selectedDirection.nom_direction : null;
        onUpdated(updatedData);
        onClose();
      } else {
        console.error(res.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '500px', background: '#f0f9ff', border: '1px solid #003366' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
          <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
            <FiEdit2 size={20} />
          </div>
          <div className="rfc-style-header-text">
            <h2 style={{ color: '#ffffff' }}>Modifier l'utilisateur</h2>
            <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Mettre à jour les informations du compte</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}><FiX size={24} /></button>
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
                {roles.filter(r => r.nom_role !== 'SYSTEME' && r.nom_role !== 'SYSTEM').map(r => <option key={r.id_role} value={r.id_role}>{r.libelle_role || r.nom_role}</option>)}
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

// ── Modal Détails Compte ──────────────────────────────────────
const DetailUserModal = ({ user, onClose, onEdit, onToggleStatus }) => {
  if (!user) return null;
  const meta = ROLE_META[user.roles?.[0]] || { color: '#64748b', bg: '#f8fafc', label: user.roles?.[0] };

  const detailStyle = {
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
    padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0'
  };
  const labelStyle = { fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.2rem' };
  const valueStyle = { fontSize: '0.95rem', color: '#0f172a', fontWeight: '600' };

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '600px', background: '#f0f9ff', border: '1px solid #003366' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
          <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.3)' }}>
            <span style={{ fontWeight: '800', fontSize: '1.4rem' }}>{user.nom_user?.[0]}{user.prenom_user?.[0]}</span>
          </div>
          <div className="rfc-style-header-text">
            <h2 style={{ color: '#ffffff' }}>{user.prenom_user} {user.nom_user}</h2>
            <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Détails du compte utilisateur</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}>
            <FiX size={24} />
          </button>
        </div>
        <div className="modal-body-rfc-style">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={detailStyle}><div style={labelStyle}>Email du compte</div><div style={valueStyle}>{user.email_user}</div></div>
            <div style={detailStyle}><div style={labelStyle}>Téléphone</div><div style={valueStyle}>{user.phone || '—'}</div></div>
            <div style={detailStyle}><div style={labelStyle}>Direction</div><div style={valueStyle}>{user.direction?.nom_direction || 'Non assigné'}</div></div>
            <div style={detailStyle}><div style={labelStyle}>Date de Naissance</div><div style={valueStyle}>{user.date_naissance ? new Date(user.date_naissance).toLocaleDateString('fr-DZ') : '—'}</div></div>
            <div style={detailStyle}><div style={labelStyle}>Code Métier</div><div style={valueStyle}>{user.code_metier}</div></div>
            <div style={detailStyle}><div style={labelStyle}>Statut</div><div style={{ ...valueStyle, color: user.actif ? '#059669' : '#dc2626' }}>{user.actif ? 'Actif' : 'Désactivé'}</div></div>
          </div>
        </div>
        <div className="modal-footer-rfc-style" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn-cancel-rfc-style" onClick={() => { onClose(); onToggleStatus(user); }}
            style={{ color: user.actif ? '#dc2626' : '#059669', borderColor: user.actif ? '#fee2e2' : '#d1fae5' }}>
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
  const [kpiFilter,  setKpiFilter]  = useState('');

  // ── Pagination ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showCreate,  setShowCreate]  = useState(false);
  const [editUser,    setEditUser]    = useState(null);
  const [detailUser,  setDetailUser]  = useState(null);
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [confirmTog,  setConfirmTog]  = useState(null);
  const [sendNotif,   setSendNotif]   = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── fetchData : charge TOUS les utilisateurs ──────────────
  const fetchData = useCallback(async () => {
    try {
      // Étape 1 : sonder le total réel (1 seul enregistrement, léger)
      const probe = await api.get('/users?page=1&limit=1');
      const totalCount = probe.data?.total ?? probe.total ?? 1000;

      // Étape 2 : tout charger en une seule requête
      const [uRes, rRes, dRes] = await Promise.all([
        api.get(`/users?limit=${totalCount}`),
        api.get('/users/roles'),
        api.get('/directions'),
      ]);

      if (uRes.success || uRes.data) {
        const uData = uRes.data || uRes;
        const list = uData.users || uData.data || (Array.isArray(uData) ? uData : []);
        setUsers(Array.isArray(list) ? list : []);
      }
      if (rRes.success || rRes.data) {
        const rData = rRes.data || rRes;
        const list = rData.roles || rData.data || (Array.isArray(rData) ? rData : []);
        setRoles(Array.isArray(list) ? list : []);
      }
      if (dRes.success || dRes.data) {
        const dData = dRes.data || dRes;
        const list = dData.directions || dData.data || (Array.isArray(dData) ? dData : []);
        setDirections(Array.isArray(list) ? list : []);
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
    if (location.state?.openCreate) setShowCreate(true);
  }, [location.state]);

  // Remet la pagination à 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRole, filterDirection, kpiFilter]);

  // ── Handlers ──────────────────────────────────────────────
  const handleCreated = (newUser) => {
    if (newUser.id_direction && !newUser.direction) {
      const dir = directions.find(d => d.id_direction === newUser.id_direction);
      if (dir) newUser.direction = dir;
    }
    setUsers(prev => [newUser, ...prev]);
    showToast(`Compte "${newUser.email_user}" créé avec succès !`);
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
      // Le backend ne supporte pas la suppression physique (et aucune méthode DELETE n'est exportée), 
      // donc on procède à une désactivation (soft delete)
      const res = await api.patch(`/users/${user.id_user}/actif`, { actif: false });
      if (res.success || res.user || res.data) {
        setUsers(prev => prev.map(u => u.id_user === user.id_user ? { ...u, actif: false } : u));
        showToast('Compte désactivé (suppression logique) avec succès.', 'success');
        setDetailUser(null);
      } else {
        showToast(res.message || 'Erreur.', 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Erreur réseau.', 'error');
    }
  };

  // ── Filtrage (sur la totalité des users) ──────────────────
  const hasRole = (u, name) => {
    if (!u) return false;
    const roleList = [];
    if (Array.isArray(u.roles)) {
        u.roles.forEach(r => {
            if (typeof r === 'string') roleList.push(r.toUpperCase());
            else if (r && r.nom_role) roleList.push(r.nom_role.toUpperCase());
        });
    }
    if (u.role && u.role.nom_role) roleList.push(u.role.nom_role.toUpperCase());
    if (u.nom_role) roleList.push(u.nom_role.toUpperCase());
    return roleList.includes(name.toUpperCase());
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || (
      `${u.prenom_user} ${u.nom_user} ${u.email_user}`.toLowerCase().includes(search.toLowerCase())
    );
    let matchRole = filterRole === 'ALL' || hasRole(u, filterRole);
    let matchActif = true;
    if (kpiFilter === 'ACTIF')        matchActif = u.actif === true;
    else if (kpiFilter === 'INACTIF') matchActif = u.actif === false;
    else if (kpiFilter && kpiFilter !== 'ALL') {
      matchRole = hasRole(u, kpiFilter);
    }
    const matchDir = filterDirection === 'ALL'
      ? true
      : (filterDirection === 'NONE'
          ? !u.direction?.nom_direction
          : u.direction?.nom_direction === filterDirection);
    return matchSearch && matchRole && matchActif && matchDir;
  });

  // ── Stats sur la TOTALITÉ (pas sur filtered) ──────────────
  // KPI cards affichent toujours les vrais totaux de la BDD
  const totalDB    = users.length;
  const actifsDB   = users.filter(u => u.actif).length;
  const inactifsDB = totalDB - actifsDB;
  const roleCountsDB = users.reduce((acc, u) => {
    let r = 'AUCUN';
    if (u.nom_role) r = u.nom_role.toUpperCase();
    else if (u.role?.nom_role) r = u.role.nom_role.toUpperCase();
    else if (Array.isArray(u.roles) && u.roles.length > 0) {
      const first = u.roles[0];
      r = (typeof first === 'string' ? first : (first?.nom_role || 'AUCUN')).toUpperCase();
    }
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  // ── Pagination (sur filtered) ─────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  // Génère les numéros de pages avec ellipsis
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTop: '4px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b', fontWeight: '500' }}>Chargement des comptes…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const btnPage = (disabled) => ({
    padding: '5px 10px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    background: disabled ? '#f8fafc' : 'white',
    color: disabled ? '#cbd5e1' : '#475569',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    fontWeight: '600',
    fontSize: '0.8rem',
  });

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      <style>{`
        @keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .glass-card {
          background: rgba(255,255,255,0.7) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255,255,255,0.5) !important;
          box-shadow: 0 8px 32px rgba(31,38,135,0.07) !important;
          border-radius: 20px !important;
        }
        .user-row { transition: all 0.3s ease; cursor: pointer; }
        .user-row:hover { background: rgba(248,250,252,0.8) !important; transform: scale(1.002) translateX(4px); }
        .action-btn {
          background: rgba(255,255,255,0.8); border: 1px solid #e2e8f0; cursor: pointer;
          padding: 6px; border-radius: 10px; transition: all 0.2s;
          display: inline-flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .action-btn:hover { background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .search-input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 4px rgba(124,58,237,0.1) !important; outline: none; }
        .table-scroll-container::-webkit-scrollbar { height: 10px; }
        .table-scroll-container::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .table-scroll-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f8fafc; }
        .table-scroll-container::-webkit-scrollbar-thumb:hover { background: #7c3aed; }
        .sticky-col-first { position: sticky; left: 0; z-index: 2; background: white !important; box-shadow: 4px 0 8px rgba(0,0,0,0.05); }
        .sticky-col-last  { position: sticky; right: 0; z-index: 2; background: white !important; box-shadow: -4px 0 8px rgba(0,0,0,0.05); }
        thead th.sticky-col-first, thead th.sticky-col-last { background: linear-gradient(to right,#f8fafc,#f1f5f9) !important; z-index: 3; }
        .user-row:hover .sticky-col-first, .user-row:hover .sticky-col-last { background: #f8fafc !important; }
        .page-btn:hover:not(:disabled) { border-color: #7c3aed !important; color: #7c3aed !important; background: #f5f3ff !important; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiUsers /></div>
          <div className="premium-header-text">
            <h1>Gestion des Comptes</h1>
            <p>Configurez les comptes utilisateurs et supervisez les accès et permissions du système</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium" onClick={fetchData}
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            <FiRefreshCw /> Actualiser
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-create-premium">
            <FiUserPlus size={16} /> Créer un compte
          </button>
        </div>
      </div>

      {/* ── KPI CARDs — basés sur la TOTALITÉ de la BDD ─────── */}
      <div className="um-kpi-grid">
        {/* Total */}
        {(() => {
          const isActive = kpiFilter === '' && filterRole === 'ALL';
          return (
            <div onClick={() => { setKpiFilter(''); setFilterRole('ALL'); }} style={{
              textAlign: 'center', padding: '16px 8px 14px', borderRadius: '14px',
              borderTop: '3px solid #64748b',
              background: isActive ? '#f8fafc' : '#ffffff',
              boxShadow: isActive ? '0 0 0 2px #64748b33,0 6px 16px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.08)',
              transform: isActive ? 'translateY(-2px)' : 'none',
              cursor: 'pointer', transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
            }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#1e293b', marginBottom: '6px' }}>{totalDB}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>Total</div>
            </div>
          );
        })()}

        {/* Actifs */}
        {(() => {
          const isActive = kpiFilter === 'ACTIF';
          return (
            <div onClick={() => setKpiFilter(k => k === 'ACTIF' ? '' : 'ACTIF')} style={{
              textAlign: 'center', padding: '16px 8px 14px', borderRadius: '14px',
              borderTop: '3px solid #10b981',
              background: isActive ? '#f0fdf4' : '#ffffff',
              boxShadow: isActive ? '0 0 0 2px #10b98133,0 6px 16px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.08)',
              transform: isActive ? 'translateY(-2px)' : 'none',
              cursor: 'pointer', transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
            }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#10b981', marginBottom: '6px' }}>{actifsDB}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>Actifs</div>
            </div>
          );
        })()}

        {/* Inactifs */}
        {(() => {
          const isActive = kpiFilter === 'INACTIF';
          return (
            <div onClick={() => setKpiFilter(k => k === 'INACTIF' ? '' : 'INACTIF')} style={{
              textAlign: 'center', padding: '16px 8px 14px', borderRadius: '14px',
              borderTop: '3px solid #f59e0b',
              background: isActive ? '#fffbeb' : '#ffffff',
              boxShadow: isActive ? '0 0 0 2px #f59e0b33,0 6px 16px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.08)',
              transform: isActive ? 'translateY(-2px)' : 'none',
              cursor: 'pointer', transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
            }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#f59e0b', marginBottom: '6px' }}>{inactifsDB}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>Inactifs</div>
            </div>
          );
        })()}

        {/* Rôles dynamiques */}
        {Object.keys(ROLE_META).map(role => {
          const isActive = kpiFilter === role;
          const meta  = ROLE_META[role];
          const count = roleCountsDB[role] || 0;
          return (
            <div key={role} onClick={() => setKpiFilter(k => k === role ? '' : role)} style={{
              textAlign: 'center', padding: '16px 8px 14px', borderRadius: '14px',
              borderTop: `3px solid ${meta.color}`,
              background: isActive ? meta.bg : '#ffffff',
              boxShadow: isActive ? `0 0 0 2px ${meta.color}33,0 6px 16px rgba(0,0,0,0.1)` : '0 2px 8px rgba(0,0,0,0.08)',
              transform: isActive ? 'translateY(-2px)' : 'none',
              cursor: 'pointer', transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
            }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', color: meta.color, marginBottom: '6px' }}>{count}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Filters Bar ────────────────────────────────────── */}
      <PremiumToolbar 
        searchProps={{
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Rechercher par nom, email ou code métier…"
        }}
        filters={[
          {
            value: filterRole,
            onChange: (e) => { setFilterRole(e.target.value); setKpiFilter(''); },
            placeholder: "Tous les rôles",
            options: roles.map(r => ({ value: r.nom_role, label: ROLE_META[r.nom_role]?.label || r.nom_role }))
          },
          {
            value: filterDirection,
            onChange: (e) => setFilterDirection(e.target.value),
            placeholder: "Toutes les directions",
            options: [
              { value: "NONE", label: "(Sans direction)" },
              ...directions.map(d => ({ value: d.nom_direction, label: d.nom_direction }))
            ]
          }
        ]}
        onReset={() => { setSearch(''); setFilterRole('ALL'); setFilterDirection('ALL'); setKpiFilter(''); }}
        showReset={!!(search || filterRole !== 'ALL' || filterDirection !== 'ALL' || kpiFilter)}
      />

      {/* ── Table ──────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: '16px',
        border: '1px solid #e2e8f0', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1300px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th className="sticky-col-first" style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>Utilisateur</th>
                <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>Email</th>
                <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>Rôle</th>
                <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>Direction</th>
                <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>Téléphone</th>
                <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>Statut</th>
                <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>Création</th>
                <th className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiUsers size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : paginated.map((u, i) => (
                <tr key={u.id_user} className="user-row" onClick={() => setDetailUser(u)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', opacity: u.actif ? 1 : 0.6, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                >
                  <td className="sticky-col-first" style={{ position: 'sticky', left: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderRight: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: ROLE_META[u.roles?.[0]]?.bg || '#f1f5f9', color: ROLE_META[u.roles?.[0]]?.color || '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.75rem' }}>
                        {(u.prenom_user?.[0] || '') + (u.nom_user?.[0] || '')}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                          {u.prenom_user} {u.nom_user}
                        </div>
                        <div className="hide-text-mobile" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.code_metier}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{u.email_user}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle' }}>
                    {u.roles?.length > 0
                      ? <RoleBadge role={u.roles[0]} />
                      : <span style={{ color: '#cbd5e1', fontSize: '0.7rem', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle' }}>
                    <DirectionBadge name={u.direction?.nom_direction} />
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#64748b', verticalAlign: 'middle' }}>
                    {u.phone || <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle' }}>
                    <span style={{ padding: '0.3rem 0.8rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: '700', color: u.actif ? '#065f46' : '#7f1d1d', background: u.actif ? '#d1fae5' : '#fee2e2', whiteSpace: 'nowrap' }}>
                      {u.actif ? 'Actif' : 'Off'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#94a3b8', verticalAlign: 'middle' }}>
                    {u.date_creation ? new Date(u.date_creation).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                  </td>
                  <td className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderLeft: '1px solid #f1f5f9', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      <button className="action-btn" title="Modifier" onClick={() => setEditUser(u)}>
                        <FiEdit2 size={14} color="#3b82f6" />
                      </button>
                      <button className="action-btn" title={u.actif ? 'Désactiver' : 'Activer'} onClick={() => setConfirmTog({ user: u })}>
                        {u.actif ? <FiToggleRight size={16} color="#10b981" /> : <FiToggleLeft size={16} color="#94a3b8" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer pagination ──────────────────────────── */}
        <div style={{
          padding: '0.75rem 1.25rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          {/* Info texte */}
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {filtered.length === 0
              ? '0 résultat'
              : <>
                  <strong style={{ color: '#475569' }}>
                    {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                  </strong>
                  {' '}sur{' '}
                  <strong style={{ color: '#475569' }}>{filtered.length}</strong>
                  {filtered.length !== totalDB && (
                    <span style={{ color: '#94a3b8' }}> (filtré · {totalDB} au total)</span>
                  )}
                </>
            }
          </span>

          {/* Boutons de navigation */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Première page */}
              <button className="page-btn" disabled={safePage === 1} onClick={() => setCurrentPage(1)}
                style={btnPage(safePage === 1)} title="Première page">
                <FiChevronsLeft size={14} />
              </button>
              {/* Page précédente */}
              <button className="page-btn" disabled={safePage === 1} onClick={() => setCurrentPage(p => p - 1)}
                style={btnPage(safePage === 1)} title="Page précédente">
                <FiChevronLeft size={14} />
              </button>

              {/* Numéros */}
              {getPageNumbers().map((p, idx) =>
                p === '...'
                  ? <span key={`dots-${idx}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.85rem' }}>…</span>
                  : (
                    <button key={p} className="page-btn" onClick={() => setCurrentPage(p)}
                      style={{
                        ...btnPage(false),
                        border: `1.5px solid ${p === safePage ? '#7c3aed' : '#e2e8f0'}`,
                        background: p === safePage ? '#7c3aed' : 'white',
                        color: p === safePage ? 'white' : '#475569',
                        fontWeight: p === safePage ? '700' : '500',
                        minWidth: '34px',
                      }}>
                      {p}
                    </button>
                  )
              )}

              {/* Page suivante */}
              <button className="page-btn" disabled={safePage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                style={btnPage(safePage === totalPages)} title="Page suivante">
                <FiChevronRight size={14} />
              </button>
              {/* Dernière page */}
              <button className="page-btn" disabled={safePage === totalPages} onClick={() => setCurrentPage(totalPages)}
                style={btnPage(safePage === totalPages)} title="Dernière page">
                <FiChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {showCreate && (
        <CreateUserModal roles={roles} directions={directions}
          onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}

      {detailUser && (
        <DetailUserModal user={detailUser}
          onClose={() => setDetailUser(null)}
          onEdit={(u) => setEditUser(u)}
          onToggleStatus={(u) => setConfirmTog({ user: u })} />
      )}

      {editUser && (
        <EditUserModal user={editUser} roles={roles} directions={directions}
          onClose={() => setEditUser(null)}
          onUpdated={async (resData) => {
            let updatedUser = resData?.user || resData?.data?.user || resData?.data || resData;
            if (updatedUser && updatedUser.id_user) {
              if (Array.isArray(updatedUser.roles)) {
                updatedUser.roles = updatedUser.roles.map(r =>
                  (typeof r === 'object' && r !== null) ? (r.nom_role || r.role?.nom_role || JSON.stringify(r)) : r
                );
              }
              setUsers(prev => prev.map(u =>
                u.id_user === updatedUser.id_user ? { ...u, ...updatedUser } : u
              ));
              if (detailUser && detailUser.id_user === updatedUser.id_user) {
                setDetailUser(prev => ({ ...prev, ...updatedUser }));
              }
            }
            await fetchData();
            showToast('Utilisateur mis à jour avec succès.');
          }}
        />
      )}

      {confirmTog && (
        <ConfirmModal
          isOpen={true}
          title={confirmTog.user.actif ? 'Désactiver le compte' : 'Activer le compte'}
          message={`Voulez-vous ${confirmTog.user.actif ? 'désactiver' : 'activer'} le compte de ${confirmTog.user.prenom_user} ${confirmTog.user.nom_user} (${confirmTog.user.email_user}) ?`}
          danger={confirmTog.user.actif}
          onConfirm={handleToggle}
          onCancel={() => setConfirmTog(null)}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          isOpen={true}
          title="Supprimer le compte"
          message={`Cette action est irréversible. Supprimer "${confirmDel.user.prenom_user} ${confirmDel.user.nom_user}" (${confirmDel.user.email_user}) ?`}
          danger={true}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {sendNotif && (
        <SendNotifModal user={sendNotif}
          onClose={() => setSendNotif(null)}
          onSent={() => showToast(`Notification envoyée à ${sendNotif.prenom_user} !`)} />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default UserManagement;