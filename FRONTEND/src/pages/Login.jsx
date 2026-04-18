import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { FiMail, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validation
    const isEmailEmpty = !email.trim();
    const isPasswordEmpty = !password.trim();

    setEmailError(isEmailEmpty);
    setPasswordError(isPasswordEmpty);

    if (isEmailEmpty || isPasswordEmpty) {
      return;
    }

    setIsLoading(true);
    setServerError('');
    
    try {
      // Auto-append domain if user just typed username (like y.benamara)
      const finalEmail = email.includes('@') ? email : `${email}@casnos.dz`;
      const result = await login(finalEmail, password);
      
      if (result.success) {
        if (result.role === 'DEMANDEUR') {
          navigate('/demandeur');
        } else if (result.role === 'CHANGE_MANAGER') {
          navigate('/manager');
        } else if (result.role === 'SERVICE_DESK') {
          navigate('/servicedesk');
        } else if (result.role === 'ADMIN_SYSTEME') {
          navigate('/admin-system');
        } else {
          navigate('/dashboard');
        }
      } else {
        setServerError(result.message || 'Identifiants invalides');
      }
    } catch (err) {
      setServerError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo-container">
            <img src="/logo.png" alt="CASNOS Logo" className="sidebar-logo" />
          </div>
          <div className="sidebar-text">
            <h2>ITIL CASNOS</h2>
            <p>Système de gestion des changements</p>
          </div>
        </div>
      </div>

      <div className="login-content">
        <div className="login-container">

          <div className="login-header">
            <h1 className="login-title">Bienvenue !</h1>
            <p className="login-subtitle">Connectez-vous à votre compte</p>
          </div>

          <Card className="login-card">
            <form onSubmit={handleLogin} className="login-form">
              {serverError && (
                <div className="login-server-error">
                  {serverError}
                </div>
              )}
              <Input
                id="email"
                type="text"
                label="Identifiant ou Email"
                placeholder="Ex: y.benamara"
                icon={<FiMail />}
                value={email}
                error={emailError ? 'Veuillez saisir votre adresse email' : null}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(false);
                }}
              />

              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Mot de passe"
                placeholder="••••••••"
                icon={<FiLock />}
                suffix={
                  <div onClick={() => setShowPassword(!showPassword)} title={showPassword ? 'Masquer' : 'Afficher'}>
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </div>
                }
                value={password}
                error={passwordError ? 'Veuillez saisir votre mot de passe' : null}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(false);
                }}
              />

              <div className="login-options">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Se souvenir de moi</span>
                </label>
                <a href="#" className="forgot-password">Mot de passe oublié ?</a>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="login-submit-btn"
                icon={<FiLogIn />}
                disabled={isLoading}
              >
                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
