import React, { useState } from 'react';
import { api } from '../api';
import { RiskBadge } from './RiskBadge';
import { CategoryChip } from './CategoryFilter';

export function ScriptRunner({ script, dcTarget, userWriteAccess, onClose }) {
  const [paramValues, setParamValues]   = useState({});
  const [running, setRunning]           = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState(null);

  const canRun = !['Write','Destructive'].includes(script.risk_level)
    || userWriteAccess.includes(script.category);

  function setParam(name, value) {
    setParamValues(prev => ({ ...prev, [name]: value }));
  }

  async function handleRun() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.runScript(script.id, { dcTarget, params: paramValues });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CategoryChip category={script.category} size="md" />
              <RiskBadge level={script.risk_level} />
            </div>
            <h2 style={{ margin: '8px 0 4px', color: '#e2e8f0' }}>{script.name}</h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>{script.description}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* DC target */}
        <div style={styles.dcInfo}>
          <span style={{ color: '#64748b', fontSize: 13 }}>Running against:</span>
          <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: 13 }}>{dcTarget}</span>
        </div>

        {/* Parameters */}
        {script.parameters && script.parameters.length > 0 && (
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Parameters</h4>
            {script.parameters.map(param => (
              <div key={param.name} style={styles.paramRow}>
                <label style={styles.paramLabel}>
                  {param.label || param.name}
                  {param.required && <span style={{ color: '#ef4444' }}> *</span>}
                </label>
                {param.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={!!paramValues[param.name]}
                    onChange={e => setParam(param.name, e.target.checked)}
                  />
                ) : param.type === 'choice' ? (
                  <select
                    value={paramValues[param.name] || ''}
                    onChange={e => setParam(param.name, e.target.value)}
                    style={styles.input}
                  >
                    <option value="">— select —</option>
                    {(param.choices || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input
                    type={param.type === 'number' ? 'number' : 'text'}
                    value={paramValues[param.name] || ''}
                    onChange={e => setParam(param.name, e.target.value)}
                    placeholder={param.label || param.name}
                    style={styles.input}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Run button */}
        {canRun ? (
          <button
            onClick={handleRun}
            disabled={running}
            style={{ ...styles.runBtn, opacity: running ? 0.6 : 1 }}
          >
            {running ? '⏳ Running…' : `▶ Run on ${dcTarget.split('.')[0]}`}
          </button>
        ) : (
          <div style={styles.noAccess}>
            ⛔ Your role does not allow running {script.risk_level} scripts in this category.
          </div>
        )}

        {/* Output */}
        {result && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: result.status === 'success' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                {result.status === 'success' ? '✅ Success' : '❌ Error'} — {result.durationMs}ms
              </span>
            </div>
            <pre style={styles.output}>{result.output || result.error || '(no output)'}</pre>
          </div>
        )}

        {error && (
          <div style={{ ...styles.noAccess, marginTop: 12 }}>❌ {error}</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: {
    background: '#1e293b', borderRadius: 12, width: 640, maxWidth: '95vw',
    maxHeight: '85vh', overflowY: 'auto',
    border: '1px solid #334155', padding: 24
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottom: '1px solid #334155', paddingBottom: 16, marginBottom: 16
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', padding: 4
  },
  dcInfo: {
    background: '#0f172a', borderRadius: 8, padding: '8px 14px',
    display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16
  },
  section: { marginBottom: 16 },
  sectionTitle: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' },
  paramRow: { marginBottom: 12 },
  paramLabel: { display: 'block', color: '#cbd5e1', fontSize: 13, marginBottom: 4, fontWeight: 600 },
  input: {
    width: '100%', background: '#0f172a', color: '#e2e8f0',
    border: '1px solid #334155', borderRadius: 6, padding: '7px 10px', fontSize: 14, boxSizing: 'border-box'
  },
  runBtn: {
    width: '100%', padding: '10px 0', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
    color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer'
  },
  noAccess: {
    background: '#450a0a', color: '#fca5a5', borderRadius: 8,
    padding: '10px 14px', fontSize: 13
  },
  output: {
    background: '#0f172a', color: '#a3e635', padding: 14, borderRadius: 8,
    fontSize: 12, fontFamily: 'Consolas, monospace', whiteSpace: 'pre-wrap',
    maxHeight: 300, overflowY: 'auto', margin: 0
  }
};
