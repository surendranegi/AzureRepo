import React from 'react';

const RISK = {
  Read:        { color: '#16a34a', bg: '#DCFCE7', icon: '👁' },
  Write:       { color: '#d97706', bg: '#FEF3C7', icon: '✏️' },
  Destructive: { color: '#dc2626', bg: '#FEE2E2', icon: '⚠️' }
};

export function RiskBadge({ level }) {
  const r = RISK[level] || RISK.Read;
  return (
    <span style={{
      background: r.bg, color: r.color,
      borderRadius: 6, padding: '2px 8px',
      fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4
    }}>
      {r.icon} {level}
    </span>
  );
}
