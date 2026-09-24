import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { CategoryFilter, CategoryChip } from '../components/CategoryFilter';
import { RiskBadge } from '../components/RiskBadge';
import { ScriptRunner } from '../components/ScriptRunner';

export function ScriptsPage({ user, dcTarget }) {
  const [scripts, setScripts]           = useState([]);
  const [category, setCategory]         = useState('all');
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [selectedScript, setSelected]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.scripts(category)
      .then(setScripts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const filtered = scripts.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <input
          placeholder="Search scripts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.search}
        />
        {user.role === 'it-admin' && (
          <a href="#/upload" style={styles.uploadBtn}>+ Upload Script</a>
        )}
      </div>

      <CategoryFilter
        active={category}
        onChange={setCategory}
        allowedCategories={user.categoryAccess}
      />

      {loading ? (
        <div style={styles.placeholder}>Loading scripts…</div>
      ) : filtered.length === 0 ? (
        <div style={styles.placeholder}>No scripts found.</div>
      ) : (
        <div style={styles.grid}>
          {filtered.map(script => (
            <ScriptCard
              key={script.id}
              script={script}
              onClick={() => setSelected(script)}
            />
          ))}
        </div>
      )}

      {selectedScript && (
        <ScriptRunner
          script={selectedScript}
          dcTarget={dcTarget}
          userWriteAccess={user.writeAccess}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ScriptCard({ script, onClick }) {
  return (
    <div style={styles.card} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <CategoryChip category={script.category} />
        <RiskBadge level={script.risk_level} />
      </div>
      <h3 style={styles.cardTitle}>{script.name}</h3>
      <p style={styles.cardDesc}>{script.description || 'No description.'}</p>
      <div style={styles.cardFooter}>
        <span style={{ color: '#64748b', fontSize: 11 }}>
          {script.parameters?.length || 0} param{script.parameters?.length !== 1 ? 's' : ''}
        </span>
        {script.ai_analyzed ? (
          <span style={{ color: '#8b5cf6', fontSize: 11 }}>✨ AI analysed</span>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  page:        { padding: '0 24px 24px' },
  toolbar:     { display: 'flex', gap: 12, alignItems: 'center', paddingTop: 16 },
  search:      {
    flex: 1, background: '#1e293b', color: '#e2e8f0',
    border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', fontSize: 14
  },
  uploadBtn:   {
    background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff',
    borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none'
  },
  placeholder: { padding: 40, textAlign: 'center', color: '#64748b' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 8 },
  card:        {
    background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
    padding: 18, cursor: 'pointer', transition: 'border-color 0.15s',
    ':hover': { borderColor: '#3b82f6' }
  },
  cardTitle:   { margin: '0 0 6px', color: '#e2e8f0', fontSize: 15, fontWeight: 700 },
  cardDesc:    { margin: '0 0 12px', color: '#94a3b8', fontSize: 13, lineHeight: 1.5 },
  cardFooter:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
};
