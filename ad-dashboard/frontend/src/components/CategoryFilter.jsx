import React from 'react';

export const CATEGORIES = [
  { id: 'all',            label: 'All Scripts',     color: '#64748b', bg: '#1e293b' },
  { id: 'user-mgmt',      label: 'User Management', color: '#5B21B6', bg: '#EDE9FE' },
  { id: 'password-unlock',label: 'Password/Unlock',  color: '#dc2626', bg: '#FEE2E2' },
  { id: 'groups',         label: 'Groups',           color: '#16a34a', bg: '#DCFCE7' },
  { id: 'security',       label: 'Security',         color: '#d97706', bg: '#FEF3C7' },
  { id: 'reports',        label: 'Reports',          color: '#0284c7', bg: '#E0F2FE' },
  { id: 'compliance',     label: 'Compliance',       color: '#BE123C', bg: '#FFF1F2' }
];

export function CategoryChip({ category, size = 'sm' }) {
  const cat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
  const padding = size === 'sm' ? '2px 8px' : '4px 12px';
  return (
    <span style={{
      background: cat.bg, color: cat.color,
      borderRadius: 9999, fontSize: size === 'sm' ? 11 : 13,
      fontWeight: 600, padding, display: 'inline-block', whiteSpace: 'nowrap'
    }}>
      {cat.label}
    </span>
  );
}

export function CategoryFilter({ active, onChange, allowedCategories }) {
  const visible = allowedCategories
    ? CATEGORIES.filter(c => c.id === 'all' || allowedCategories.includes(c.id))
    : CATEGORIES;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 0' }}>
      {visible.map(cat => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          style={{
            background: active === cat.id ? cat.color : cat.bg,
            color: active === cat.id ? '#fff' : cat.color,
            border: `1px solid ${cat.color}`,
            borderRadius: 9999, padding: '5px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
