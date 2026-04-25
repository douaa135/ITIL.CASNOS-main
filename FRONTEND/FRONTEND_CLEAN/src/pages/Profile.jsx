// ============================================================
// Profile.jsx — Page de profil utilisateur
// FIX: utilise refreshUser() au lieu de setUser() (inexistant dans AuthContext)
// ============================================================

import { useState, useEffect } from 'react';
import {
  FiUser, FiMail, FiLock, FiShield, FiBriefcase,
  FiCheckCircle, FiAlertCircle, FiSave, FiPhone,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosClient';
import './Profile.css';

const ProfileField = ({ label, value, icon }) => (
  <div className="info-field-premium">
    <label>{label}</label>
    <div className="value-box">
      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon} {value || '—'}
      </span>
    </div>
  </div>
);

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  // Rafraîchit les données utilisateur depuis le backend au montage
  useEffect(() => {
    refreshUser().catch(() => {/* silencieux */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return setStatus({ type: 'error', message: 'Les nouveaux mots de passe ne correspondent pas.' });
    }

    if (passwordData.newPassword.length < 6) {
      return setStatus({ type: 'error', message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
    }

    setLoading(true);
    try {
      const response = await api.patch('/users/profile/password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.success) {
        setStatus({ type: 'success', message: 'Mot de passe mis à jour avec succès.' });
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setStatus({ type: 'error', message: response.message || 'Échec de la mise à jour.' });
      }
    } catch (err) {
      const msg =
        err?.error?.message || err?.message || 'Erreur lors de la mise à jour du mot de passe.';
      setStatus({ type: 'error', message: msg });
    } finally {
      setLoading(false);
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
            <FiShield size={14} style={{ marginRight: '6px' }} />
            {user?.roles?.[0] || 'Utilisateur'}
          </div>
        </div>
      </div>

      <div className="profile-grid-premium">
        {/* Informations Personnelles (Lecture seule) */}
        <div className="premium-card">
          <div className="card-title-premium">
            <FiUser /> Informations personnelles
          </div>

          <ProfileField label="Nom de famille"    value={user?.nom_user}        icon={<FiUser size={16} />} />
          <ProfileField label="Prénom"            value={user?.prenom_user}     icon={<FiUser size={16} />} />
          <ProfileField label="Adresse Email"     value={user?.email_user}      icon={<FiMail size={16} />} />
          <ProfileField label="Téléphone"         value={user?.phone}           icon={<FiPhone size={16} />} />
          <ProfileField
            label="Direction / Département"
            value={user?.nom_direction || 'Direction non assignée'}
            icon={<FiBriefcase size={16} />}
          />

          <div style={{
            marginTop: '20px', padding: '15px', background: '#f0f9ff',
            borderRadius: '10px', border: '1px solid #bae6fd',
            fontSize: '0.85rem', color: '#0369a1',
          }}>
            <FiAlertCircle style={{ marginRight: '8px' }} />
            Pour modifier vos informations personnelles, veuillez contacter l'administrateur système.
          </div>
        </div>

        {/* Sécurité / Mot de passe */}
        <div className="premium-card">
          <div className="card-title-premium">
            <FiLock /> Sécurité du compte
          </div>

          <form className="password-form-premium" onSubmit={handlePasswordUpdate}>
            {[
              { name: 'oldPassword',     label: 'Ancien mot de passe' },
              { name: 'newPassword',     label: 'Nouveau mot de passe' },
              { name: 'confirmPassword', label: 'Confirmer le nouveau mot de passe' },
            ].map((f) => (
              <div className="input-group-premium" key={f.name}>
                <label>{f.label}</label>
                <input
                  type="password"
                  name={f.name}
                  value={passwordData[f.name]}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                />
              </div>
            ))}

            {status.message && (
              <div style={{
                padding: '12px', borderRadius: '8px',
                background: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                color: status.type === 'success' ? '#166534' : '#991b1b',
                display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem',
              }}>
                {status.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
                {status.message}
              </div>
            )}

            <button
              type="submit"
              className="btn-update-premium"
              disabled={loading || !passwordData.oldPassword || !passwordData.newPassword}
            >
              <FiSave /> {loading ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
