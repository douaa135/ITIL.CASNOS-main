import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import {
  FiUsers, FiUserPlus, FiTrash2, FiEdit2, FiCheck,
  FiX, FiSearch, FiShield, FiToggleLeft, FiToggleRight,
  FiAlertTriangle, FiCheckCircle, FiLoader, FiEye, FiEyeOff, FiBell
} from 'react-icons/fi';

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
      padding: '0.2rem 0.65rem',
      borderRadius: '99px',
      fontSize: '0.65rem',
      fontWeight: '700',
      color: meta.color,
      background: meta.bg,
      border: `1px solid ${meta.color}30`,
      letterSpacing: '0.02em',
    }}>
      {meta.label}
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
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{
      background: 'white', borderRadius: '16px', padding: '2rem',
      maxWidth: '420px', width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: danger ? '#fee2e2' : '#dbeafe',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FiAlertTriangle size={22} color={danger ? '#dc2626' : '#2563eb'} />
        </div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{title}</h3>
      </div>
      <p style={{ color: '#475569', marginBottom: '1.75rem', lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0',
          background: 'white', cursor: 'pointer', fontWeight: '600', color: '#475569',
        }}>Annuler</button>
        <button onClick={onConfirm} style={{
          padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
          background: danger ? '#dc2626' : '#2563eb',
          color: 'white', cursor: 'pointer', fontWeight: '700',
        }}>Confirmer</button>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
       <div className="glass-card" style={{ padding: '2rem', maxWidth: '500px', width: '100%', background: 'white', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.2rem', fontWeight: '800' }}>
              <FiBell color="#3b82f6" /> Envoyer une notification
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <FiX size={20} />
            </button>
          </div>
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
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{ padding: '0.7rem 1.5rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={loading} style={{ padding: '0.7rem 1.5rem', borderRadius: '10px', border: 'none', background: loading ? '#93c5fd' : '#3b82f6', color: 'white', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Envoi...' : 'Envoyer la notification'}
              </button>
            </div>
          </form>
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
      if (res.success) { onCreated(res.data.user); onClose(); }
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '2rem',
        width: '100%', maxWidth: '520px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiUserPlus size={20} color="#7c3aed" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Nouveau compte</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
            <FiX size={22} />
          </button>
        </div>

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

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '0.7rem 1.5rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
              background: 'white', cursor: 'pointer', fontWeight: '600', color: '#475569',
            }}>Annuler</button>
            <button type="submit" disabled={loading} style={{
              padding: '0.7rem 1.5rem', borderRadius: '10px', border: 'none',
              background: loading ? '#a78bfa' : '#7c3aed',
              color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              {loading ? <><FiLoader size={14} /> Création…</> : <><FiUserPlus size={14} /> Créer le compte</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modal Détails Compte ──────────────────────────────────
const DetailUserModal = ({ user, onClose, onEdit, onDelete }) => {
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card" style={{ padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', background: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
          <FiX size={24} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{
            width: '70px', height: '70px', borderRadius: '18px',
            background: meta.bg, color: meta.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', fontWeight: '800', border: "1px solid " + meta.color + "30"
          }}>
            {user.nom_user?.[0]}{user.prenom_user?.[0]}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>{user.prenom_user} {user.nom_user}</h2>
            <div style={{ marginTop: '0.4rem' }}><RoleBadge role={user.roles?.[0]} /></div>
          </div>
        </div>

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
            <div style={valueStyle}>{user.nom_direction || 'Non assigné'}</div>
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

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
           <button onClick={() => { onClose(); onDelete(user); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '700' }}>
              <FiTrash2 size={16} /> Supprimer
           </button>
           <button onClick={() => { onClose(); onEdit(user); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '700' }}>
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
      if (rRes.success) setRoles(rRes.data || []);
      if (dRes.success) {
        setDirections(dRes.data || []);
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
        showToast(!user.actif ? 'Compte activé.' : 'Compte désactivé.');
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
        showToast(`Compte "${user.email_user}" supprimé.`);
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
      : (filterDirection === 'NONE' ? !u.nom_direction : u.nom_direction === filterDirection);
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
          padding: 8px; 
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
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FiUsers size={28} color="#7c3aed" /> Gestion des Comptes
            </h1>
            <p style={{ color: '#64748b', margin: 0 }}>Créer, modifier et gérer les accès des utilisateurs CASNOS.</p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem',
            boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,58,237,0.5)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(124,58,237,0.4)'; }}
          >
            <FiUserPlus size={16} /> Créer un compte
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(130px, 1fr)', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <Card style={{ textAlign: 'center', borderTop: '3px solid #7c3aed', padding: '1rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#7c3aed' }}>{total}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total comptes</div>
        </Card>
        <Card style={{ textAlign: 'center', borderTop: '3px solid #10b981', padding: '1rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>{actifs}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Actifs</div>
        </Card>
        <Card style={{ textAlign: 'center', borderTop: '3px solid #f59e0b', padding: '1rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f59e0b' }}>{inactifs}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Désactivés</div>
        </Card>
        {Object.entries(roleCounts).slice(0, 4).map(([role, count]) => (
          <Card key={role} style={{ textAlign: 'center', borderTop: `3px solid ${ROLE_META[role]?.color || '#64748b'}`, padding: '1rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: ROLE_META[role]?.color || '#64748b' }}>{count}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              {ROLE_META[role]?.label || role}
            </div>
          </Card>
        ))}
      </div>

      {/* ── Filters Bar ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderBottom: '2px solid #e2e8f0' }}>
                {['Utilisateur', 'Email', 'Téléphone', 'Mot de passe', 'Direction', 'Rôle', 'Statut', 'Date Création', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
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
                  }}>
                  {/* Avatar + Nom */}
                  <td style={{ padding: '0.2rem 0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '10px',
                        background: ROLE_META[u.roles?.[0]]?.bg || '#f1f5f9',
                        color: ROLE_META[u.roles?.[0]]?.color || '#64748b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '0.75rem',
                      }}>
                        {(u.prenom_user?.[0] || '') + (u.nom_user?.[0] || '')}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.8rem', color: '#0f172a' }}>
                          {u.prenom_user} {u.nom_user}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{u.code_metier}</div>
                      </div>
                    </div>
                  </td>

                   {/* Email */}
                  <td style={{ padding: '0.2rem 0.3rem', fontSize: '0.75rem', color: '#334155' }}>{u.email_user}</td>

                  {/* Telephone */}
                  <td style={{ padding: '0.2rem 0.3rem', fontSize: '0.75rem', color: '#334155' }}>
                    {u.phone ? u.phone : <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
                  </td>

                  {/* Password */}
                  <td style={{ padding: '0.2rem 0.3rem', maxWidth: '80px' }}>
                    {u.mot_passe ? (
                      <div style={{
                        fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0'
                      }} title={u.mot_passe}>
                        {u.mot_passe}
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontStyle: 'italic' }}>Non défini</span>
                    )}
                  </td>

                  {/* Direction */}
                  <td style={{ padding: '0.2rem 0.3rem', fontSize: '0.7rem', color: '#64748b', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={u.nom_direction}>
                    {u.nom_direction || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
                  </td>

                  {/* Rôle */}
                  <td style={{ padding: '0.2rem 0.3rem' }}>
                    {u.roles?.length > 0
                      ? <RoleBadge role={u.roles[0]} />
                      : <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontStyle: 'italic' }}>Aucun rôle</span>}
                  </td>

                  {/* Statut */}
                  <td style={{ padding: '0.2rem 0.3rem' }}>
                    <span style={{
                      padding: '0.25rem 0.65rem', borderRadius: '99px', fontSize: '0.65rem', fontWeight: '700',
                      color: u.actif ? '#065f46' : '#7f1d1d',
                      background: u.actif ? '#d1fae5' : '#fee2e2',
                    }}>
                      {u.actif ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>

                  {/* Date */}
                  <td style={{ padding: '0.2rem 0.3rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    {u.date_creation ? new Date(u.date_creation).toLocaleDateString('fr-DZ') : '—'}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.2rem 0.3rem' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {/* Envoyer une notification */}
                      <button className="action-btn" title="Envoyer une notification" onClick={() => setSendNotif(u)}>
                        <FiBell size={15} color="#3b82f6" />
                      </button>
                      {/* Modifier le compte */}
                      <button className="action-btn" title="Modifier le compte" onClick={() => setEditUser(u)}>
                        <FiEdit2 size={15} color="#3b82f6" />
                      </button>
                      {/* Activer / Désactiver */}
                      <button className="action-btn" title={u.actif ? 'Désactiver' : 'Activer'} onClick={() => setConfirmTog({ user: u })}>
                        {u.actif
                          ? <FiToggleRight size={18} color="#10b981" />
                          : <FiToggleLeft size={18} color="#94a3b8" />}
                      </button>
                      {/* Supprimer */}
                      <button className="action-btn" title="Supprimer" onClick={() => setConfirmDel({ user: u })}>
                        <FiTrash2 size={15} color="#ef4444" />
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
          onDelete={(u) => setConfirmDel({ user: u })}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          roles={roles}
          directions={directions}
          onClose={() => setEditUser(null)}
          onUpdated={(updatedUser) => {
            setUsers(users.map(u => u.id_user === updatedUser.id_user ? { ...u, ...updatedUser } : u));
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
