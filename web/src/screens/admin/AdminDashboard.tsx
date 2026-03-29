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
  container: { display: 'flex', height: '100vh', backgroundColor: 'transparent', padding: '16px', gap: '16px' },
  sidebar: { width: '290px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-soft)' },
  logoArea: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' },
  logoIcon: { width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-primary), #0ea5e9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 10px 20px rgba(11, 94, 215, 0.25)' },
  appName: { margin: 0, fontSize: '19px', color: 'var(--text-primary)', letterSpacing: '-0.01em' },
  nav: { display: 'flex', flexDirection: 'column', gap: '8px' },
  navItem: { backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent', padding: '12px 16px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', fontSize: '14px', fontWeight: 600, transition: 'all 0.2s' },
  navItemActive: { backgroundColor: 'var(--accent-light)', color: 'var(--accent-secondary)', border: '1px solid rgba(37, 99, 235, 0.24)', padding: '12px 16px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
  logoutBtn: { backgroundColor: '#fff', color: 'var(--status-error)', border: '1px solid rgba(220, 38, 38, 0.2)', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, marginTop: '20px' },
  content: { flex: 1, overflowY: 'auto', padding: '34px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '18px', boxShadow: 'var(--shadow-soft)' },
};
