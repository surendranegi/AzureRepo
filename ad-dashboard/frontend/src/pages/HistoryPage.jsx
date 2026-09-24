import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { CategoryChip } from '../components/CategoryFilter';
import { RiskBadge } from '../components/RiskBadge';

const STATUS_STYLE = {
  success: { color: '#22c55e', label: '✅ Success' },
  error:   { color: '#ef4444', label: '❌ Error' },
  running: { color: '#f59e0b', label: '⏳ Running' },
  timeout: { color: '#ef4444', label: '⏱ Timeout' }
};

export function HistoryPage({ user }) {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [detail, setDetail]     = useState(null);

  useEffect(() => {
    api.history()
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function openDetail(id) {
    const d = await api.historyItem(id).catch(() => null);
    if (d) setDetail(d);
  }

  if (loading) return <div style={styles.placeholder}>Loading history…</div>;

  return (
    <div style={styles.page}>
      <h3 style={styles.title}>Run History</h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Script', 'Category', 'Risk', 'DC Target', 'Run By', 'Status', 'Duration', 'Time'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const st = STATUS_STYLE[row.status] || STATUS_STYLE.error;
              return (
                <tr key={row.id} style={styles.tr} onClick={() => openDetail(row.id)}>
                  <td style={styles.td}>{row.script_name}</td>
                  <td style={styles.td}><CategoryChip category={row.category} /></td>
                  <td style={styles.td}><RiskBadge level={row.risk_level} /></td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{row.dc_target.split('.')[0]}</td>
                  <td style={styles.td}>{row.run_by}</td>
                  <td style={{ ...styles.td, color: st.color, fontWeight: 700 }}>{st.label}</td>
                  <td style={styles.td}>{row.duration_ms != null ? `${row.duration_ms}ms` : '—'}</td>
                  <td style={{ ...styles.td, fontSize: 12, color: '#64748b' }}>{new Date(row.started_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <div style={styles.placeholder}>No runs yet.</div>}

      {/* Detail modal */}
      {detail && (
        <div style={styles.overlay} onClick={() => setDetail(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ color: '#e2e8f0' }}>{detail.script_name}</strong>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 8px' }}>
              {detail.dc_target} · {detail.run_by} · {new Date(detail.started_at).toLocaleString()}
            </p>
            <pre style={styles.output}>{detail.output || detail.error || '(no output)'}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page:        { padding: '16px 24px' },
  title:       { color: '#e2e8f0', margin: '0 0 16px' },
  placeholder: { padding: 40, textAlign: 'center', color: '#64748b' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #334155' },
  tr:          { cursor: 'pointer', borderBottom: '1px solid #1e293b' },
  td:          { padding: '10px 12px', fontSize: 13, color: '#cbd5e1' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:       { background: '#1e293b', borderRadius: 10, width: 680, maxWidth: '95vw', padding: 20, border: '1px solid #334155' },
  output:      { background: '#0f172a', color: '#a3e635', padding: 14, borderRadius: 8, fontSize: 12, fontFamily: 'Consolas, monospace', whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto', margin: 0 }
};
