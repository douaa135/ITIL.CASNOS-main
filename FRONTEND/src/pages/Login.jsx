import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_ROUTES } from '../utils/constants';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { FiMail, FiLock, FiLogIn, FiEye, FiEyeOff, FiKey } from 'react-icons/fi';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // ── Login state ──────────────────────────────────────────────
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [emailError, setEmailError]       = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [serverError, setServerError]     = useState('');
  const [showPassword, setShowPassword]   = useState(false);

  // ── Forgot password state ────────────────────────────────────
  // step: 'login' | 'forgot_email' | 'forgot_code'
  const [step, setStep]               = useState('login');
  const [resetEmail, setResetEmail]   = useState('');
  const [resetCode, setResetCode]     = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetStatus, setResetStatus] = useState({ type: '', message: '' });

  // ── Handlers ─────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault();
    const isEmailEmpty    = !email.trim();
    const isPasswordEmpty = !password.trim();
    setEmailError(isEmailEmpty);
    setPasswordError(isPasswordEmpty);
    if (isEmailEmpty || isPasswordEmpty) return;

    setIsLoading(true);
    setServerError('');
    try {
      const finalEmail = email.includes('@')
        ? email.trim()
        : `${email.trim()}@casnos.dz`;

      const result = await login(finalEmail, password.trim());
      if (result.success) {
        const primaryRole = result.user?.roles?.[0];
        navigate(ROLE_ROUTES[primaryRole] ?? '/dashboard', { replace: true });
      } else {
        setServerError(result.message || 'Identifiants invalides');
      }
    } catch (err) {
      setServerError(err?.error?.message || err?.message || 'Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Étape 1 : envoyer l'email → recevoir le code
const handleSendCode = async (e) => {
  e.preventDefault();
  if (!resetEmail.trim()) {
    setResetStatus({ type: 'error', message: 'Veuillez saisir votre adresse e-mail.' });
    return;
  }

  setIsLoading(true);
  setResetStatus({ type: '', message: '' });

  try {
    const finalEmail = resetEmail.includes('@')
      ? resetEmail.trim()
      : `${resetEmail.trim()}@casnos.dz`;

    await fetch(`${API_URL}/api/auth/forgot-password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: finalEmail }),
    });

    // Passer directement à l'étape 2
    setResetEmail(finalEmail);
    setStep('forgot_code');

  } catch (err) {
    setResetStatus({ type: 'error', message: 'Erreur réseau. Veuillez réessayer.' });
  } finally {
    setIsLoading(false);
  }
};

  // Étape 2 : valider code + nouveau mot de passe
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetStatus({ type: '', message: '' });

    if (!resetCode.trim() || resetCode.trim().length !== 6) {
      setResetStatus({ type: 'error', message: 'Veuillez saisir le code à 6 chiffres reçu par email.' });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setResetStatus({ type: 'error', message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetStatus({ type: 'error', message: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:        resetEmail,
          code:         resetCode.trim(),
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResetStatus({
          type:    'success',
          message: '✅ Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.',
        });
        // Retour au login après 2s
        setTimeout(() => {
          setStep('login');
          setResetCode('');
          setNewPassword('');
          setConfirmPassword('');
          setResetEmail('');
          setResetStatus({ type: '', message: '' });
        }, 2500);
      } else {
        setResetStatus({
          type:    'error',
          message: data.message || 'Code invalide ou expiré. Veuillez refaire une demande.',
        });
      }
    } catch (err) {
      setResetStatus({ type: 'error', message: 'Erreur réseau. Veuillez réessayer.' });
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToLogin = () => {
    setStep('login');
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetStatus({ type: '', message: '' });
  };

  // ── Titres dynamiques ────────────────────────────────────────
  const titles = {
    login:        { title: 'Bienvenue !',            subtitle: 'Connectez-vous à votre compte' },
    forgot_email: { title: 'Mot de passe oublié',    subtitle: 'Saisissez votre adresse e-mail pour recevoir un code de réinitialisation.' },
    forgot_code:  { title: 'Réinitialisation',       subtitle: 'Saisissez le code reçu par email et votre nouveau mot de passe.' },
  };

  const { title, subtitle } = titles[step];

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="login-page">
      {/* Sidebar gauche */}
      <div className="login-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo-container">
            <img
              src="/logo.png"
              alt="CASNOS Logo"
              className="sidebar-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="sidebar-text">
            <h2>ITIL CASNOS</h2>
            <p>Système de gestion des changements</p>
          </div>
        </div>
      </div>

      {/* Zone principale */}
      <div className="login-content">
        <div className="login-container">
          <div className="login-header">
            <h1 className="login-title">{title}</h1>
            <p className="login-subtitle">{subtitle}</p>
          </div>

          <Card className="login-card">

            {/* ── Formulaire login ── */}
            {step === 'login' && (
              <form onSubmit={handleLogin} className="login-form">
                {serverError && (
                  <div className="login-server-error">{serverError}</div>
                )}
                <Input
                  id="email"
                  type="text"
                  label="Identifiant ou Email"
                  placeholder="Ex: admin ou implementeur@casnos.dz"
                  icon={<FiMail />}
                  value={email}
                  error={emailError ? 'Veuillez saisir votre identifiant' : null}
                  onChange={(e) => { setEmail(e.target.value.toLowerCase()); setEmailError(false); }}
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Mot de passe"
                  placeholder="••••••••"
                  icon={<FiLock />}
                  suffix={
                    <span onClick={() => setShowPassword(v => !v)} title={showPassword ? 'Masquer' : 'Afficher'} className="password-toggle">
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </span>
                  }
                  value={password}
                  error={passwordError ? 'Veuillez saisir votre mot de passe' : null}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
                />
                <div className="login-options">
                  <label className="remember-me">
                    <input type="checkbox" />
                    <span>Se souvenir de moi</span>
                  </label>
                  <span onClick={() => setStep('forgot_email')} className="forgot-password" style={{ cursor: 'pointer' }}>
                    Mot de passe oublié ?
                  </span>
                </div>
                <Button type="submit" variant="primary" className="login-submit-btn" icon={<FiLogIn />} disabled={isLoading}>
                  {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                </Button>
              </form>
            )}

            {/* ── Étape 1 : saisir l'email ── */}
            {step === 'forgot_email' && (
              <form onSubmit={handleSendCode} className="login-form">
                {resetStatus.message && (
                  <div className="login-server-error" style={{
                    backgroundColor: resetStatus.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color:           resetStatus.type === 'success' ? '#16a34a' : '#b91c1c',
                    border:          `1px solid ${resetStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  }}>
                    {resetStatus.message}
                  </div>
                )}
                <Input
                  id="resetEmail"
                  type="text"
                  label="Identifiant ou Email"
                  placeholder="Ex: jean.dupont@casnos.dz"
                  icon={<FiMail />}
                  value={resetEmail}
                  error={null}
                  onChange={(e) => { setResetEmail(e.target.value.toLowerCase()); setResetStatus({ type: '', message: '' }); }}
                />
                <Button type="submit" variant="primary" className="login-submit-btn" disabled={isLoading}>
                  {isLoading ? 'Envoi en cours...' : 'Envoyer le code'}
                </Button>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button type="button" onClick={goBackToLogin} className="reset-back-btn">
                    Retour à la connexion
                  </button>
                </div>
              </form>
            )}

            {/* ── Étape 2 : code + nouveau mdp ── */}
            {step === 'forgot_code' && (
              <form onSubmit={handleResetPassword} className="login-form">
                {resetStatus.message && (
                  <div className="login-server-error" style={{
                    backgroundColor: resetStatus.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color:           resetStatus.type === 'success' ? '#16a34a' : '#b91c1c',
                    border:          `1px solid ${resetStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  }}>
                    {resetStatus.message}
                  </div>
                )}

                <Input
                  id="resetCode"
                  type="text"
                  label="Code de vérification (6 chiffres)"
                  placeholder="Ex: 483920"
                  icon={<FiKey />}
                  value={resetCode}
                  maxLength={6}
                  error={null}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setResetCode(val);
                    setResetStatus({ type: '', message: '' });
                  }}
                />

                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  label="Nouveau mot de passe"
                  placeholder="Min. 8 caractères"
                  icon={<FiLock />}
                  suffix={
                    <span onClick={() => setShowNewPassword(v => !v)} className="password-toggle">
                      {showNewPassword ? <FiEyeOff /> : <FiEye />}
                    </span>
                  }
                  value={newPassword}
                  error={null}
                  onChange={(e) => { setNewPassword(e.target.value); setResetStatus({ type: '', message: '' }); }}
                />

                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirmer le mot de passe"
                  placeholder="Répétez le nouveau mot de passe"
                  icon={<FiLock />}
                  suffix={
                    <span onClick={() => setShowConfirmPassword(v => !v)} className="password-toggle">
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </span>
                  }
                  value={confirmPassword}
                  error={null}
                  onChange={(e) => { setConfirmPassword(e.target.value); setResetStatus({ type: '', message: '' }); }}
                />

                <Button type="submit" variant="primary" className="login-submit-btn" disabled={isLoading}>
                  {isLoading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                </Button>

                <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button type="button" onClick={() => { setStep('forgot_email'); setResetStatus({ type: '', message: '' }); }} className="reset-back-btn">
                    ← Renvoyer un nouveau code
                  </button>
                  <button type="button" onClick={goBackToLogin} className="reset-back-btn">
                    Retour à la connexion
                  </button>
                </div>
              </form>
            )}

          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;