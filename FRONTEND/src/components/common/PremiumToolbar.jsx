import React from 'react';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';

/**
 * PremiumToolbar - Un composant réutilisable pour les barres de recherche et filtres.
 * 
 * Props:
 * - searchProps: { value: string, onChange: function, placeholder: string }
 * - filters: Array of { value: any, onChange: function, options: Array<{value, label}>, placeholder: string }
 * - extraContent: ReactNode (pour des inputs spécifiques comme les dates)
 * - onReset: function (facultatif, si fourni affiche le bouton réinitialiser si des filtres sont actifs)
 * - showReset: boolean (force l'affichage ou le calcul du bouton reset)
 */
const PremiumToolbar = ({ 
  searchProps, 
  filters = [], 
  extraContent = null, 
  onReset = null,
  showReset = false,
  className = ""
}) => {
  return (
    <div className={`premium-toolbar ${className}`}>
      {/* Recherche principale */}
      {searchProps && (
        <div className="premium-toolbar-search">
          <FiSearch className="premium-toolbar-icon" />
          <input
            type="text"
            className="premium-toolbar-input"
            value={searchProps.value}
            onChange={searchProps.onChange}
            placeholder={searchProps.placeholder || "Rechercher..."}
          />
        </div>
      )}

      {/* Filtres dynamiques */}
      {filters.map((filter, index) => (
        <div key={index} className="premium-toolbar-filter">
          <select
            className="premium-toolbar-select"
            value={filter.value}
            onChange={filter.onChange}
          >
            {filter.placeholder && <option value="">{filter.placeholder}</option>}
            {filter.options.map((opt, optIdx) => (
              <option key={optIdx} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Contenu supplémentaire (ex: DatePickers) */}
      {extraContent}

      {/* Bouton Réinitialiser */}
      {onReset && showReset && (
        <button onClick={onReset} className="reset-filters-btn-cab">
          <FiRefreshCw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Réinitialiser
        </button>
      )}
    </div>
  );
};

export default PremiumToolbar;
