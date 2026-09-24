import React from 'react';

const DC_MAP = {
  nam:  ['DC01-NewYork.corp.abg.com',   'DC02-Chicago.corp.abg.com',    'DC03-Dallas.corp.abg.com'],
  emea: ['DC01-London.corp.abg.com',    'DC02-Frankfurt.corp.abg.com',   'DC03-Dubai.corp.abg.com'],
  apac: ['DC01-Singapore.corp.abg.com', 'DC02-Sydney.corp.abg.com',     'DC03-Tokyo.corp.abg.com'],
  dr:   ['DC01-DR.corp.abg.com',        'DC02-DR.corp.abg.com']
};

const REGION_LABELS = {
  nam:  '🌎 NAM — North America',
  emea: '🌍 EMEA — Europe / ME / Africa',
  apac: '🌏 APAC — Asia Pacific',
  dr:   '🔄 DR — Disaster Recovery'
};

export function DcSelector({ region, dc, onRegionChange, onDcChange }) {
  const dcs = DC_MAP[region] || DC_MAP.nam;

  function handleRegionChange(e) {
    const newRegion = e.target.value;
    onRegionChange(newRegion);
    onDcChange(DC_MAP[newRegion][0]);
  }

  return (
    <div style={styles.bar}>
      <span style={styles.label}>Target DC</span>

      <select value={region} onChange={handleRegionChange} style={styles.select}>
        {Object.entries(REGION_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>

      <select value={dc} onChange={e => onDcChange(e.target.value)} style={styles.select}>
        {dcs.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      <span style={styles.status}>● Connected</span>
      <span style={styles.note}>Script will run against this DC via WinRM</span>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#1e293b', borderBottom: '1px solid #334155',
    padding: '8px 24px', flexWrap: 'wrap'
  },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 },
  select: {
    background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155',
    borderRadius: 6, padding: '5px 10px', fontSize: 13, cursor: 'pointer'
  },
  status: { color: '#22c55e', fontSize: 13, fontWeight: 600 },
  note:   { color: '#64748b', fontSize: 12, marginLeft: 'auto' }
};
