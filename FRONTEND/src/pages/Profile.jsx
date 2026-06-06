// ============================================================
// Profile.jsx — Page de profil utilisateur
// ============================================================

import { useState, useEffect } from 'react';
import {
  FiUser, FiMail, FiLock, FiShield, FiBriefcase,
  FiCheckCircle, FiAlertCircle, FiPhone, FiEye, FiEyeOff,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosClient';
import './Profile.css';

const ProfileField = ({ label, value, icon }) => (
  <div className="info-field-premium">
    <label>{label}</label>
    <div className="value-box">
      <span className="profile-inline-icon-text">
        {icon} {value || '—'}
      </span>
    </div>
  </div>
);

const Profile = () => {
  const { user, refreshUser } = useAuth();

  // ── État formulaire Mot de passe ────────────────────────────
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPwd, setShowPwd] = useState({
    old_password: false,
    new_password: false,
    confirm_password: false,
  });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');

  // Rafraîchit les données au montage
  useEffect(() => {
    refreshUser().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ────────────────────────────────────────────────
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const togglePwd = (field) => {
    setShowPwd((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', message: '' });

    if (!passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password) {
      setPasswordStatus({ type: 'error', message: 'Veuillez remplir tous les champs.' });
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordStatus({ type: 'error', message: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await api.put(`/users/${user.id_user}`, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      if (response.success || response.data) {
        setPasswordStatus({ type: 'success', message: 'Mot de passe mis à jour avec succès.' });
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        setShowPwd({ old_password: false, new_password: false, confirm_password: false });
      } else {
        setPasswordStatus({ type: 'error', message: response.message || 'Échec de la mise à jour.' });
      }
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err?.message || 'Erreur lors du changement de mot de passe.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header-premium">
        <div className="avatar-large-premium">
          {user?.prenom_user?.[0]}{user?.nom_user?.[0]}
        </div>
        <div className="profile-title-box">
          <h1>{user?.prenom_user} {user?.nom_user}</h1>
          <div className="profile-role-badge">
            <FiShield size={14} className="profile-role-icon" />
            {user?.roles?.[0] || 'Utilisateur'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs-premium">
        <button
          className={`profile-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Vue d'ensemble
        </button>
        <button
          className={`profile-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Mes Informations
        </button>
      </div>

      <div className="profile-grid-premium">
        {activeTab === 'overview' ? (
          <div className="premium-card">
            <div className="card-title-premium">
              <FiUser /> Résumé du Profil
            </div>
            <div className="profile-overview-fields">
              <ProfileField
                label="Nom Complet"
                value={`${user?.prenom_user || ''} ${user?.nom_user || ''}`}
                icon={<FiUser size={16} />}
              />
              <ProfileField
                label="Rôle"
                value={user?.roles?.[0] || 'Utilisateur'}
                icon={<FiShield size={16} />}
              />
              <ProfileField
                label="Direction / Département"
                value={user?.nom_direction || 'Direction non assignée'}
                icon={<FiBriefcase size={16} />}
              />
            </div>
          </div>
        ) : (
          <>
            {/* ── Carte : Informations en lecture seule ── */}
            <div className="premium-card">
              <div className="card-title-premium">
                <FiUser /> Mes Informations
              </div>
              <div className="profile-overview-fields">
                <ProfileField
                  label="Nom de famille"
                  value={user?.nom_user}
                  icon={<FiUser size={16} />}
                />
                <ProfileField
                  label="Prénom"
                  value={user?.prenom_user}
                  icon={<FiUser size={16} />}
                />
                <ProfileField
                  label="Adresse Email"
                  value={user?.email_user}
                  icon={<FiMail size={16} />}
                />
                <ProfileField
                  label="Téléphone"
                  value={user?.phone}
                  icon={<FiPhone size={16} />}
                />
                <ProfileField
                  label="Direction / Département"
                  value={user?.nom_direction || 'Non assignée'}
                  icon={<FiBriefcase size={16} />}
                />
              </div>
            </div>

            {/* ── Carte : Modification du mot de passe ── */}
            <div className="premium-card">
              <div className="card-title-premium">
                <FiLock /> Modifier le mot de passe
              </div>

              <form className="profile-form-premium" onSubmit={handlePasswordUpdate}>
                {[
                  { name: 'old_password',     label: 'Ancien Mot de Passe' },
                  { name: 'new_password',     label: 'Nouveau Mot de Passe' },
                  { name: 'confirm_password', label: 'Confirmer le Nouveau Mot de Passe' },
                ].map((f) => (
                  <div className="input-group-premium" key={f.name}>
                    <label>{f.label}</label>
                    <div className="profile-input-with-icon" style={{ position: 'relative' }}>
                      <FiLock size={16} style={{ flexShrink: 0 }} />
                      <input
                        type={showPwd[f.name] ? 'text' : 'password'}
                        name={f.name}
                        value={passwordData[f.name]}
                        onChange={handlePasswordChange}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <span
                        onClick={() => togglePwd(f.name)}
                        style={{
                          position: 'absolute',
                          right: '0.85rem',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          userSelect: 'none',
                        }}
                        title={showPwd[f.name] ? 'Masquer' : 'Afficher'}
                      >
                        {showPwd[f.name] ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </span>
                    </div>
                  </div>
                ))}

                <button type="submit" className="save-btn-premium" disabled={passwordLoading} style={{ marginTop: '1.5rem' }}>
                  <FiLock size={16} className="profile-save-icon" />
                  {passwordLoading ? 'Enregistrement...' : 'Sauvegarder le nouveau mot de passe'}
                </button>

                {passwordStatus.message && (
                  <div className={`profile-status-message ${passwordStatus.type}`}>
                    {passwordStatus.type === 'success'
                      ? <FiCheckCircle className="profile-status-icon" />
                      : <FiAlertCircle className="profile-status-icon" />}
                    {passwordStatus.message}
                  </div>
                )}
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
