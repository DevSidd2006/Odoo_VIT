import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserManagement from './UserManagement';
import ApprovalRules from './ApprovalRules';

import AdminExpenses from './AdminExpenses';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const currentTab = location.pathname.includes('/rules') ? 'rules' : location.pathname.includes('/expenses') ? 'expenses' : 'users';

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>💸</div>
          <h2 style={styles.appName}>ReimburseFlow</h2>
        </div>

        <nav style={styles.nav}>
          <button
            style={currentTab === 'users' ? styles.navItemActive : styles.navItem}
            onClick={() => navigate('/users')}
          >
            👥 Team Members
          </button>
          <button
            style={currentTab === 'rules' ? styles.navItemActive : styles.navItem}
            onClick={() => navigate('/rules')}
          >
            🛡️ Policy & Rules
          </button>
          <button
            style={currentTab === 'expenses' ? styles.navItemActive : styles.navItem}
            onClick={() => navigate('/expenses')}
          >
            📊 Global Expenses
          </button>
        </nav>

        <div style={{ flex: 1 }} />
        
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div style={styles.content}>
        <Routes>
          <Route path="/users" element={<UserManagement />} />
          <Route path="/rules" element={<ApprovalRules />} />
          <Route path="/expenses" element={<AdminExpenses />} />
          <Route path="*" element={<UserManagement />} />
        </Routes>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  container: { display: 'flex', height: '100vh', backgroundColor: 'var(--bg-primary)' },
  sidebar: { width: '280px', backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border-default)', padding: '24px', display: 'flex', flexDirection: 'column' },
  logoArea: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' },
  logoIcon: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' },
  appName: { margin: 0, fontSize: '18px', color: 'var(--text-primary)' },
  nav: { display: 'flex', flexDirection: 'column', gap: '8px' },
  navItem: { backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', padding: '12px 16px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '15px', fontWeight: 500, transition: 'all 0.2s' },
  navItemActive: { backgroundColor: 'var(--accent-light)', color: 'var(--accent-secondary)', border: 'none', padding: '12px 16px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '15px', fontWeight: 600 },
  logoutBtn: { backgroundColor: 'transparent', color: 'var(--status-error)', border: '1px solid var(--status-error-bg)', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '20px' },
  content: { flex: 1, overflowY: 'auto', padding: '40px' },
};
