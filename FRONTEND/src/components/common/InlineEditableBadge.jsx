/**
 * InlineEditableBadge.jsx
 * ─────────────────────────────────────────────────────────────
 * Badge cliquable qui ouvre un dropdown stylé listant
 * UNIQUEMENT les transitions autorisées depuis le statut actuel.
 *
 * Props :
 *  currentValue  — valeur actuelle (id ou code)
 *  currentCode   — code_statut actuel (ex: 'SOUMIS') pour filtrer les transitions
 *  options       — [{ value, label, code? }] toutes les options possibles
 *  allowedCodes  — tableau de code_statut autorisés (depuis RFC_TRANSITIONS etc.)
 *                  Si absent → toutes les options sont affichées (comportement legacy)
 *  getVariant    — (value) => string — variante Badge
 *  getVariantByCode — (code) => string — variante par code (prioritaire)
 *  onUpdate      — async (newValue) => void
 *  isEditable    — boolean (défaut: true)
 *  label         — libellé actuel affiché (optionnel, sinon cherché dans options)
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Badge from './Badge';

// Couleurs par variante pour le dropdown
const VARIANT_STYLE = {
  success: { color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  danger:  { color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
  warning: { color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  info:    { color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
  primary: { color: '#3730a3', bg: '#e0e7ff', border: '#a5b4fc' },
  neutral: { color: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
  default: { color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' },
};

const InlineEditableBadge = ({
  currentValue,
  currentCode,
  options = [],
  allowedCodes,
  getVariant,
  getVariantByCode,
  onUpdate,
  isEditable = true,
  label,
  dropdownPosition = 'down', // 'down' or 'up'
}) => {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [rect, setRect]       = useState(null);
  const ref = useRef(null);
  const dropdownRef = useRef(null);

  // Fermer en cliquant dehors
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      // Si on clique dans le badge ou dans le dropdown portal, on ignore
      if (ref.current && ref.current.contains(e.target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    // Fermer aussi au scroll pour éviter que le dropdown portal ne se détache visuellement
    document.addEventListener('scroll', handler, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('scroll', handler, true);
    };
  }, [open]);

  // Résoudre le libellé affiché
  const currentOption = options.find(o => String(o.value) === String(currentValue));
  const displayLabel  = label || currentOption?.label || currentValue || '—';

  // Variante du badge actuel
  const currentVariant = getVariantByCode
    ? (getVariantByCode(currentCode) || getVariant?.(currentValue) || 'neutral')
    : (getVariant?.(currentValue) || 'neutral');

  // Filtrer les options selon les transitions autorisées
  const filteredOptions = (() => {
    if (!allowedCodes || !currentCode) return options.filter(o => String(o.value) !== String(currentValue));
    return options.filter(o => {
      const code = o.code || o.code_statut;
      return allowedCodes.includes(code) && code !== currentCode;
    });
  })();

  const handleSelect = async (opt) => {
    if (String(opt.value) === String(currentValue)) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    try {
      await onUpdate(opt.value);
    } catch (err) {
      alert(`Erreur : ${err?.response?.data?.message || err?.message || 'Impossible de modifier'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isEditable) {
    return <Badge variant={currentVariant}>{displayLabel}</Badge>;
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Badge cliquable */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!loading) {
            if (!open && ref.current) {
              setRect(ref.current.getBoundingClientRect());
            }
            setOpen(o => !o);
          }
        }}
        title={filteredOptions.length === 0 ? 'Aucune transition disponible' : 'Cliquer pour changer'}
        style={{ cursor: loading ? 'wait' : filteredOptions.length === 0 ? 'default' : 'pointer' }}
      >
        <Badge variant={currentVariant} className={filteredOptions.length > 0 ? 'editable' : ''}>
          {loading ? '…' : displayLabel}
          {filteredOptions.length > 0 && !loading && (
            <span style={{ marginLeft: '4px', fontSize: '0.6em', opacity: 0.7 }}>▾</span>
          )}
        </Badge>
      </div>

      {/* Dropdown via Portal */}
      {open && filteredOptions.length > 0 && rect && createPortal(
        <div
          ref={dropdownRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: dropdownPosition === 'up' ? 'auto' : rect.bottom + 6,
            bottom: dropdownPosition === 'up' ? (window.innerHeight - rect.top + 6) : 'auto',
            left: rect.left,
            zIndex: 999999,
            minWidth: '180px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            animation: dropdownPosition === 'up' ? 'fadeInUp 0.15s ease' : 'fadeInDown 0.15s ease',
          }}
        >
          {/* En-tête */}
          <div style={{
            padding: '0.5rem 0.75rem',
            fontSize: '0.65rem',
            fontWeight: '700',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid #f1f5f9',
            background: '#fafbfc',
          }}>
            Changer vers →
          </div>

          {/* Options */}
          {filteredOptions.map((opt) => {
            const code    = opt.code || opt.code_statut;
            const variant = getVariantByCode
              ? (getVariantByCode(code) || getVariant?.(opt.value) || 'default')
              : (getVariant?.(opt.value) || 'default');
            const style = VARIANT_STYLE[variant] || VARIANT_STYLE.default;

            return (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt)}
                style={{
                  padding: '0.55rem 0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.15s',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#1e293b',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Pastille colorée */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: style.color,
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  whiteSpace: 'nowrap',
                }}>
                  {opt.label}
                </span>
              </div>
            );
          })}

          {/* Footer info si état final */}
          {filteredOptions.length === 0 && (
            <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
              État final — aucune transition
            </div>
          )}
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .editable { cursor: pointer; }
        .editable:hover { filter: brightness(0.95); }
      `}</style>
    </div>
  );
};

export default InlineEditableBadge;