import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth
import LoginScreen from './screens/auth/LoginScreen';
import SignupScreen from './screens/auth/SignupScreen';

// Dashboards
import AdminDashboard from './screens/admin/AdminDashboard';
import ManagerDashboard from './screens/manager/ManagerDashboard';
import EmployeeDashboard from './screens/employee/EmployeeDashboard';

type ThemeMode = 'light' | 'dark';

const THEME_KEY = '@reimburse_theme';

export default function App() {
  const { session, isLoading } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1000,
          border: '1px solid var(--border-default)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          borderRadius: 999,
          padding: '8px 12px',
          fontSize: 13,
          fontWeight: 700,
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        {theme === 'light' ? 'Dark mode' : 'Light mode'}
      </button>

      <Routes>
        {!session ? (
          <>
            <Route path="/" element={<LoginScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            {session.role === 'admin' && <Route path="/*" element={<AdminDashboard />} />}
            {session.role === 'manager' && <Route path="/*" element={<ManagerDashboard />} />}
            {session.role === 'employee' && <Route path="/*" element={<EmployeeDashboard />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}
