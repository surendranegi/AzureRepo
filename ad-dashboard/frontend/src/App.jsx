import React, { useState } from 'react';
import { useCurrentUser } from './hooks/useCurrentUser';
import { DcSelector } from './components/DcSelector';
import { ScriptsPage } from './pages/ScriptsPage';
import { HistoryPage } from './pages/HistoryPage';
import { UploadPage } from './pages/UploadPage';
import { UsersPage } from './pages/UsersPage';

const TABS = [
  { id: 'scripts',  label: '📋 Scripts' },
  { id: 'history',  label: '📜 History' },
  { id: 'upload',   label: '☁ Upload',  adminOnly: true },
  { id: 'users',    label: '👥 Users',   adminOnly: true }
];

export default function App() {
  const { user, loading, error } = useCurrentUser();
  const [tab, setTab]             = useState('scripts');
  const [region, setRegion]       = useState('nam');
  const [dc, setDc]               = useState('DC01-NewYork.corp.abg.com');

  if (loading) return <FullPage>Loading…</FullPage>;
  if (error)   return <FullPage style={{ color: '#ef4444' }}>
    {error.status === 403 ? `Access denied: ${error.message}` : `Error: ${error.message}`}
  </FullPage>;

  const visibleTabs = TABS.filter(t => !t.adminOnly || user.role === 'it-admin');

  function renderTab() {
    switch (tab) {
      case 'scripts': return <ScriptsPage user={user} dcTarget={dc} />;
      case 'history': return <HistoryPage user={user} />;
      case 'upload':  return <UploadPage  user={user} />;
      case 'users':   return <UsersPage   user={user} />;
      default:        return null;
    }
  }

  return (
    <div style={styles.app}>
      {/* Top bar */}
      <header style={styles.topbar}>
        <div style={styles.brand}>
          <span style={styles.logo}>⚡</span>
          <div>
            <div style={styles.brandName}>AD Command Center</div>
            <div style={styles.brandSub}>Avis Budget Group · Active Directory</div>
          </div>
        </div>
        <div style={styles.userInfo}>
          <span style={{ color: '#64748b', fontSize: 12 }}>Signed in as</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{user.username}</span>
          <span style={styles.roleBadge}>{user.role.replace('-', ' ').toUpperCase()}</span>
        </div>
      </header>

      {/* DC selector */}
      <DcSelector region={region} dc={dc} onRegionChange={setRegion} onDcChange={setDc} />

      {/* Tabs */}
      <nav style={styles.nav}>
        {visibleTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ ...styles.tabBtn, ...(tab === t.id ? styles.tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Page */}
      <main style={styles.main}>
        {renderTab()}
      </main>
    </div>
  );
}

function FullPage({ children, style }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#94a3b8', ...style }}>
      {children}
    </div>
  );
}

const styles = {
  app:       { minHeight: '100vh', background: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif', color: '#e2e8f0' },
  topbar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, background: '#0f172a', borderBottom: '1px solid #1e293b' },
  brand:     { display: 'flex', alignItems: 'center', gap: 12 },
  logo:      { fontSize: 24 },
  brandName: { fontWeight: 800, fontSize: 16, color: '#e2e8f0', letterSpacing: -0.5 },
  brandSub:  { fontSize: 11, color: '#64748b' },
  userInfo:  { display: 'flex', alignItems: 'center', gap: 8 },
  roleBadge: { background: '#1e293b', color: '#7dd3fc', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  nav:       { display: 'flex', borderBottom: '1px solid #1e293b', padding: '0 16px', background: '#0f172a' },
  tabBtn:    { background: 'none', border: 'none', color: '#94a3b8', padding: '12px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderBottom: '2px solid transparent', transition: 'all 0.15s' },
  tabActive: { color: '#3b82f6', borderBottomColor: '#3b82f6' },
  main:      { flex: 1 }
};
