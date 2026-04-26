import { useState, useRef, useEffect } from 'react';
import { FiUser, FiSettings, FiCamera, FiLock, FiShield, FiCheckCircle } from 'react-icons/fi';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('security');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  const fileInputRef = useRef(null);

  // Fallback for avatar handling if needed, though we primarily use initials now
  const [avatar, setAvatar] = useState(localStorage.getItem('demo_avatar') || null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setAvatar(imageUrl);
      localStorage.setItem('demo_avatar', imageUrl);
      window.dispatchEvent(new Event('avatarChanged')); // Notify MainLayout
      setSuccessMsg('Photo de profil mise à jour localement !');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handlePasswordUpdate = () => {
    // In this version, we don't modify the backend, so we just show a message.
    setSuccessMsg('Fonctionnalité de changement de mot de passe en cours de déploiement.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (!user) return <div className="loading-state">Chargement du profil...</div>;

  const userRole = user.roles?.[0] || 'Utilisateur';

  return (
    <div className="profile-page">
      <div>
        <h1 className="page-title">Paramètres du compte</h1>
        <p className="page-subtitle">Modifiez uniquement votre mot de passe. Les autres informations sont en lecture seule.</p>
      </div>

      <div className="profile-layout">
        
        {/* Menu Gauche */}
        <div className="profile-menu-card">
          <div className="profile-avatar-section">
            <div className="avatar-large" style={{ backgroundImage: avatar ? `url(${avatar})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', color: avatar ? 'transparent' : 'white' }}>
              {!avatar && `${user.prenom_user?.[0] || ''}${user.nom_user?.[0] || ''}`}
              <button className="avatar-edit-btn" title="Changer de photo" onClick={() => fileInputRef.current?.click()}>
                <FiCamera size={14} color="var(--text-main)" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" style={{ display: 'none' }} />
            </div>
            <h3>{user.prenom_user} {user.nom_user}</h3>
            <p className="user-badge" style={{ 
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              borderRadius: '99px',
              background: 'var(--primary-light, #ede9fe)',
              color: 'var(--primary-color, #7c3aed)',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginTop: '0.5rem'
            }}>{userRole}</p>
          </div>
          <div className="profile-nav-list">
            <button 
              className={`profile-nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <FiLock /> Sécurité & Mot de passe
            </button>
          </div>
        </div>

        {/* Contenu Principal */}
        <div className="profile-content-card">
          {successMsg && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--status-success-bg, #d1fae5)', color: 'var(--status-success-text, #065f46)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
              <FiCheckCircle size={18} /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
              <FiLock size={18} /> {errorMsg}
            </div>
          )}

          {activeTab === 'infos' && (
            <div className="settings-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="settings-section-title" style={{ margin: 0 }}><FiUser /> Informations Générales</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>Lecture seule</span>
              </div>
              <div className="settings-grid">
                <div className="settings-field">
                  <label className="settings-label">Nom</label>
                  <input className="settings-input" value={user.nom_user} disabled style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Prénom</label>
                  <input className="settings-input" value={user.prenom_user} disabled style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Adresse Email</label>
                  <input className="settings-input" type="email" value={user.email_user} disabled style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Direction/Service</label>
                  <input className="settings-input" value={user.nom_direction || 'Non assigné'} disabled style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Code Métier</label>
                  <input className="settings-input" value={user.code_metier} disabled style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} />
                </div>
              </div>
              <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                * Ces informations sont gérées par l'administrateur système. Veuillez contacter le support pour toute correction.
              </p>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <h3 className="settings-section-title"><FiLock /> Sécurité</h3>
              <div className="settings-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="settings-field">
                  <label className="settings-label">Mot de passe actuel</label>
                  <input className="settings-input" type="password" placeholder="••••••••" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Nouveau mot de passe</label>
                  <input className="settings-input" type="password" placeholder="••••••••" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Confirmer le nouveau mot de passe</label>
                  <input className="settings-input" type="password" placeholder="••••••••" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} />
                </div>
              </div>
              <div className="settings-actions" style={{ marginTop: '2rem' }}>
                <Button variant="primary" onClick={handlePasswordUpdate}>Mettre à jour le mot de passe</Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Profile;
