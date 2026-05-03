import './LoadingSpinner.css';

/**
 * LoadingSpinner — Indicateur de chargement réutilisable
 */
const LoadingSpinner = ({ message = 'Chargement…', fullPage = false }) => {
  const spinnerClass = fullPage ? 'loading-spinner loading-spinner-fullpage' : 'loading-spinner';

  return (
    <div className={spinnerClass}>
      <div className="loading-spinner-icon" />
      <p className="loading-spinner-message">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
