import React, { useState } from 'react';

/**
 * Per-domain credential panel.
 *
 * Credentials live in React state only — never written to localStorage,
 * sessionStorage, or sent anywhere except the /api/scripts/:id/run request.
 * The backend holds them only for the lifetime of the PowerShell process.
 */
export function CredentialPanel({ credentials, onChange }) {
  const [showPass, setShowPass] = useState(false);
  const hasCredentials = credentials.username && credentials.password;

  return (
    <div style={styles.panel}>
      <span style={styles.label}>Run As</span>

      <input
        type="text"
        placeholder="CORP\your.name"
        value={credentials.username}
        onChange={e => onChange({ ...credentials, username: e.target.value })}
        style={styles.input}
        autoComplete="username"
        spellCheck={false}
      />

      <div style={styles.passWrap}>
        <input
          type={showPass ? 'text' : 'password'}
          placeholder="Password"
          value={credentials.password}
          onChange={e => onChange({ ...credentials, password: e.target.value })}
          style={{ ...styles.input, width: 140 }}
          autoComplete="current-password"
        />
        <button
          onClick={() => setShowPass(p => !p)}
          style={styles.eyeBtn}
          type="button"
          title={showPass ? 'Hide' : 'Show'}
        >
          {showPass ? '🙈' : '👁'}
        </button>
      </div>

      <span style={hasCredentials ? styles.ok : styles.warn}>
        {hasCredentials ? '🔐 Credentials set' : '⚠ Enter credentials to run scripts'}
      </span>

      <span style={styles.note}>
        Credentials used only for WinRM — not stored anywhere
      </span>
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#0f172a', borderBottom: '1px solid #1e293b',
    padding: '7px 24px', flexWrap: 'wrap'
  },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' },
  input: {
    background: '#1e293b', color: '#e2e8f0',
    border: '1px solid #334155', borderRadius: 6,
    padding: '5px 10px', fontSize: 13, width: 180
  },
  passWrap: { display: 'flex', alignItems: 'center', gap: 4 },
  eyeBtn:  { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 4px', color: '#64748b' },
  ok:      { color: '#22c55e', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  warn:    { color: '#f59e0b', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  note:    { color: '#334155', fontSize: 11, marginLeft: 'auto', whiteSpace: 'nowrap' }
};
