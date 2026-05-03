/**
 * LoadingSpinner — Indicateur de chargement réutilisable
 */
const LoadingSpinner = ({ message = 'Chargement…', fullPage = false }) => {
  const style = fullPage
    ? {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: '1rem',
      }
    : {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem',
        color: '#64748b',
      };

  return (
    <div style={style}>
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #1e40af',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ color: '#64748b', fontWeight: 500, margin: 0 }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LoadingSpinner;
