import './Badge.css';

/**
 * Badge — affiche un label coloré.
 * @prop {string} variant | status — variante de couleur
 *   Valeurs : primary | success | danger | warning | info | neutral
 */
const Badge = ({ children, variant, status, className = '' }) => {
  // Accepte variant OU status pour la compatibilité avec l'existant
  const v = variant || status || 'neutral';
  return (
    <span className={`common-badge badge-${v} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
