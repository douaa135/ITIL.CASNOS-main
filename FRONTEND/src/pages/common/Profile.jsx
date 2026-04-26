import React, { useState, useEffect } from 'react';
import { FiUser, FiMail, FiLock, FiShield, FiBriefcase, FiCheckCircle, FiAlertCircle, FiSave, FiPhone, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
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
    const { user, setUser } = useAuth();
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Refresh user data from backend on mount
    useEffect(() => {
        const fetchProfile = async () => {
            setRefreshing(true);
            try {
                const response = await api.get('/auth/me');
                if (response.success && response.user) {
                    // Update auth context with fresh data
                    // Note: AuthContext should provide a setUser or handle this update
                    if (typeof setUser === 'function') {
                        setUser(response.user);
                        localStorage.setItem('user', JSON.stringify(response.user));
                    }
                }
            } catch (error) {
                console.error('Failed to refresh profile data', error);
            } finally {
                setRefreshing(false);
            }
        };

        fetchProfile();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
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
                newPassword: passwordData.newPassword
            });

            if (response.success) {
                setStatus({ type: 'success', message: 'Mot de passe mis à jour avec succès.' });
                setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setStatus({ type: 'error', message: response.message || 'Échec de la mise à jour.' });
            }
        } catch (error) {
            const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Erreur lors de la mise à jour du mot de passe.';
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
                        value={user?.nom_direction || 'Direction non assignée'} 
                        icon={<FiBriefcase size={16} />} 
                    />
                    
                    <div style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd', fontSize: '0.85rem', color: '#0369a1' }}>
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
                        <div className="input-group-premium">
                            <label>Ancien mot de passe</label>
                            <input 
                                type="password" 
                                name="oldPassword"
                                value={passwordData.oldPassword}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                required 
                            />
                        </div>

                        <div className="input-group-premium">
                            <label>Nouveau mot de passe</label>
                            <input 
                                type="password" 
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                required 
                            />
                        </div>

                        <div className="input-group-premium">
                            <label>Confirmer le nouveau mot de passe</label>
                            <input 
                                type="password" 
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                required 
                            />
                        </div>

                        {status.message && (
                            <div style={{ 
                                padding: '12px', 
                                borderRadius: '8px', 
                                background: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                                color: status.type === 'success' ? '#166534' : '#991b1b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '0.9rem'
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
