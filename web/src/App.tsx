import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth
import LoginScreen from './screens/auth/LoginScreen';
import SignupScreen from './screens/auth/SignupScreen';

// Dashboards
import AdminDashboard from './screens/admin/AdminDashboard';
import ManagerDashboard from './screens/manager/ManagerDashboard';
import EmployeeDashboard from './screens/employee/EmployeeDashboard';

export default function App() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
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
  );
}
