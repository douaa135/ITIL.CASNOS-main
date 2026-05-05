import React from 'react';
import { FiUser } from 'react-icons/fi';

const AVATAR_COLORS = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#d1fae5', color: '#065f46' },
  { bg: '#fef3c7', color: '#92400e' },
  { bg: '#ede9fe', color: '#5b21b6' },
  { bg: '#fce7f3', color: '#9d174d' },
  { bg: '#e0f2fe', color: '#0369a1' },
];

/**
 * Avatar component displaying user initials with a consistent background color.
 */
const Avatar = ({ prenom = '', nom = '', size = 34, radius = '10px' }) => {
  const p = prenom || '';
  const n = nom || '';
  const initiales = `${p.charAt(0)}${n.charAt(0)}`.toUpperCase();
  const palette = AVATAR_COLORS[(p.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  if (!initiales) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        background: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FiUser size={size * 0.4} color="#94a3b8" />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: palette.bg, color: palette.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.35}px`, fontWeight: 700, letterSpacing: '0.03em',
    }}>
      {initiales}
    </div>
  );
};

export default Avatar;
