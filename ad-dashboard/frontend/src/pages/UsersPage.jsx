import React, { useState, useEffect } from 'react';
import { api } from '../api';

const ROLES = [
  { id: 'it-admin',        label: 'IT Admin',         desc: 'Full access — all categories, write + destructive' },
  { id: 'helpdesk-l2',     label: 'Helpdesk L2',      desc: 'Password/Unlock, User Mgmt, Groups — write allowed' },
  { id: 'helpdesk-l1',     label: 'Helpdesk L1',      desc: 'Password/Unlock only — read + safe password scripts' },
  { id: 'security-ops',    label: 'Security Ops',     desc: 'Security, Reports, Compliance — write allowed' },
  { id: 'reports-viewer',  label: 'Reports Viewer',   desc: 'Reports only — no write' }
];

export function UsersPage({ user }) {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newUser, setNewUser]     = useState({ username: '', role: 'helpdesk-l1' });
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState(null);

  if (user.role !== 'it-admin') {
    return <div style={styles.denied}>⛔ Only IT Admins can manage user access.</div>;
  }

  useEffect(() => {
    api.users()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newUser.username.trim()) return;
    setSaving(true);
    try {
      const added = await api.addUser(newUser);
      setUsers(prev => [...prev, added]);
      setNewUser({ username: '', role: 'helpdesk-l1' });
      setMsg('✅ User added');
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  async function handleRoleChange(id, role) {
    await api.updateUser(id, { role }).catch(console.error);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  }

  async function handleRemove(id, username) {
    if (!window.confirm(`Remove access for ${username}?`)) return;
    await api.removeUser(id).catch(console.error);
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  return (
    <div style={styles.page}>
      <h3 style={styles.title}>User Access Management</h3>
      <p style={styles.note}>
        Authentication is via Windows Auth (Kerberos/NTLM) — no separate password.
        Users must exist in Active Directory; role assignment here controls what they can do.
      </p>

      {/* Add user */}
      <form onSubmit={handleAdd} style={styles.addForm}>
        <input
          placeholder="CORP\\username or username"
          value={newUser.username}
          onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
          style={styles.input}
        />
        <select
          value={newUser.role}
          onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
          style={styles.select}
        >
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <button type="submit" disabled={saving} style={styles.addBtn}>
          {saving ? '…' : '+ Add'}
        </button>
      </form>

      {msg && <div style={styles.msg}>{msg}</div>}

      {/* Role legend */}
      <div style={styles.legend}>
        {ROLES.map(r => (
          <div key={r.id} style={styles.legendRow}>
            <strong style={{ color: '#e2e8f0', fontSize: 13 }}>{r.label}</strong>
            <span style={{ color: '#64748b', fontSize: 12 }}>{r.desc}</span>
          </div>
        ))}
      </div>

      {/* User list */}
      {loading ? <div style={{ color: '#64748b' }}>Loading…</div> : (
        <table style={styles.table}>
          <thead>
            <tr>{['Username','Role','Granted By','Added',''].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={styles.tr}>
                <td style={styles.td}>{u.username}</td>
                <td style={styles.td}>
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    style={{ ...styles.select, width: 'auto', margin: 0 }}
                    disabled={u.username === user.username}
                  >
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </td>
                <td style={styles.td}>{u.granted_by || '—'}</td>
                <td style={{ ...styles.td, fontSize: 12, color: '#64748b' }}>{new Date(u.granted_at).toLocaleDateString()}</td>
                <td style={styles.td}>
                  {u.username !== user.username && (
                    <button
                      onClick={() => handleRemove(u.id, u.username)}
                      style={styles.removeBtn}
                    >Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  page:    { padding: '16px 24px' },
  denied:  { padding: 40, textAlign: 'center', color: '#ef4444' },
  title:   { color: '#e2e8f0', margin: '0 0 8px' },
  note:    { color: '#64748b', fontSize: 13, marginBottom: 20 },
  addForm: { display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  input:   { flex: 1, minWidth: 180, background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px', fontSize: 13 },
  select:  { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px', fontSize: 13, marginBottom: 0 },
  addBtn:  { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  msg:     { padding: '8px 14px', background: '#1e293b', borderRadius: 6, marginBottom: 12, color: '#e2e8f0', fontSize: 13 },
  legend:  { background: '#0f172a', borderRadius: 8, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 },
  legendRow: { display: 'flex', gap: 12 },
  table:   { width: '100%', borderCollapse: 'collapse' },
  th:      { padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #334155' },
  tr:      { borderBottom: '1px solid #1e293b' },
  td:      { padding: '10px 12px', fontSize: 13, color: '#cbd5e1' },
  removeBtn: { background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: 4, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }
};
