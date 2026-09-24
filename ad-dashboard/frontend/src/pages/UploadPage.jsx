import React, { useState } from 'react';
import { api } from '../api';
import { CATEGORIES } from '../components/CategoryFilter';

export function UploadPage({ user }) {
  const [file, setFile]         = useState(null);
  const [category, setCategory] = useState('reports');
  const [status, setStatus]     = useState(null); // null | 'uploading' | { ok, data }
  const [error, setError]       = useState(null);

  if (user.role !== 'it-admin') {
    return <div style={styles.denied}>⛔ Only IT Admins can upload scripts.</div>;
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return setError('Please select a .ps1 file');

    const form = new FormData();
    form.append('script', file);
    form.append('category', category);

    setStatus('uploading');
    setError(null);

    const res = await api.uploadScript(form);
    if (res.error) {
      setError(res.error);
      setStatus(null);
    } else {
      setStatus({ ok: true, data: res });
    }
  }

  return (
    <div style={styles.page}>
      <h3 style={styles.title}>Upload PowerShell Script</h3>

      <div style={styles.pathInfo}>
        <strong style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Server Storage Path</strong>
        <pre style={styles.pathBox}>{`D:\\ADScripts\\
  user-mgmt\\
  password-unlock\\
  groups\\
  security\\
  reports\\
  compliance\\`}</pre>
        <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
          Scripts are saved to the corresponding category folder on the server filesystem.
          The file is analysed by AI before saving — only the script text is sent to the API.
        </p>
      </div>

      <form onSubmit={handleUpload} style={styles.form}>
        <label style={styles.label}>Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={styles.select}
        >
          {CATEGORIES.filter(c => c.id !== 'all').map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        <label style={styles.label}>Script File (.ps1)</label>
        <input
          type="file"
          accept=".ps1"
          onChange={e => setFile(e.target.files[0] || null)}
          style={{ color: '#e2e8f0', marginBottom: 20 }}
        />

        {error && <div style={styles.errorBox}>{error}</div>}

        <button type="submit" disabled={status === 'uploading'} style={styles.btn}>
          {status === 'uploading' ? '⏳ Uploading & Analysing…' : '☁ Upload & AI Analyse'}
        </button>
      </form>

      {status?.ok && (
        <div style={styles.successBox}>
          <strong>✅ Upload complete</strong>
          <div style={{ marginTop: 8, fontSize: 13, color: '#94a3b8' }}>
            <div><strong>Description:</strong> {status.data.description}</div>
            <div><strong>Risk Level:</strong> {status.data.risk_level}</div>
            <div><strong>Category:</strong> {status.data.category}</div>
            <div><strong>Parameters detected:</strong> {status.data.parameters?.length || 0}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page:       { padding: '16px 24px', maxWidth: 680 },
  denied:     { padding: 40, textAlign: 'center', color: '#ef4444' },
  title:      { color: '#e2e8f0', margin: '0 0 20px' },
  pathInfo:   { background: '#0f172a', borderRadius: 10, padding: 16, marginBottom: 24, border: '1px solid #334155' },
  pathBox:    { background: '#020617', color: '#a3e635', padding: 12, borderRadius: 6, fontSize: 12, fontFamily: 'monospace', margin: '8px 0' },
  form:       { background: '#1e293b', borderRadius: 10, padding: 20, border: '1px solid #334155' },
  label:      { display: 'block', color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  select:     { width: '100%', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', fontSize: 14, marginBottom: 20 },
  errorBox:   { background: '#450a0a', color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12 },
  btn:        { width: '100%', padding: '10px 0', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  successBox: { marginTop: 20, background: '#052e16', border: '1px solid #166534', borderRadius: 8, padding: 16, color: '#86efac' }
};
