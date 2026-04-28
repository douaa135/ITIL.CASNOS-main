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
  const [profileData, setProfileData] = useState({
    nom_user: '',
    prenom_user: '',
    email_user: '',
    phone: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  // Rafraîchit les données utilisateur depuis le backend au montage
  useEffect(() => {
    refreshUser().catch(() => {/* silencieux */});
    if (user) {
      setProfileData({
        nom_user: user.nom_user || '',
        prenom_user: user.prenom_user || '',
        email_user: user.email_user || '',
        phone: user.phone || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setLoading(true);
    try {
      // Note: On utilise l'endpoint /profile s'il existe, sinon on pourrait rediriger vers l'endpoint admin si l'user est admin.
      const response = await api.patch('/users/profile', profileData);
      if (response.success) {
        setStatus({ type: 'success', message: 'Profil mis à jour avec succès.' });
        await refreshUser();
      } else {
        setStatus({ type: 'error', message: response.message || 'Échec de la mise à jour.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err?.message || 'Erreur lors de la mise à jour du profil.' });
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
        {/* Informations Personnelles (Éditable) */}
        <div className="premium-card">
          <div className="card-title-premium">
            <FiUser /> Informations personnelles
          </div>

          <form className="profile-form-premium" onSubmit={handleProfileUpdate}>
            {[
              { name: 'nom_user', label: 'Nom de famille', icon: <FiUser size={16} />, type: 'text' },
              { name: 'prenom_user', label: 'Prénom', icon: <FiUser size={16} />, type: 'text' },
              { name: 'email_user', label: 'Adresse Email', icon: <FiMail size={16} />, type: 'email' },
              { name: 'phone', label: 'Téléphone', icon: <FiPhone size={16} />, type: 'text' },
            ].map((f) => (
              <div className="input-group-premium" key={f.name}>
                <label>{f.label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {f.icon}
                  <input
                    type={f.type}
                    name={f.name}
                    value={profileData[f.name]}
                    onChange={handleProfileChange}
                    placeholder={`Entrez votre ${f.label.toLowerCase()}`}
                    required
                  />
                </div>
              </div>
            ))}

            <ProfileField
              label="Direction / Département"
              value={user?.nom_direction || 'Direction non assignée'}
              icon={<FiBriefcase size={16} />}
            />

            <button type="submit" className="save-btn-premium" disabled={loading}>
              <FiSave size={16} style={{ marginRight: '8px' }} />
              {loading ? 'Mise à jour...' : 'Mettre à jour le profil'}
            </button>

            {status.message && (
              <div style={{
                marginTop: '15px', padding: '10px', borderRadius: '8px',
                background: status.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: status.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${status.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                fontSize: '0.85rem',
              }}>
                {status.type === 'success' ? <FiCheckCircle style={{ marginRight: '8px' }} /> : <FiAlertCircle style={{ marginRight: '8px' }} />}
                {status.message}
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  );
};

export default Profile;
