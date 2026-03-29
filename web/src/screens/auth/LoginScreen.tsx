import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRepo } from '../../repositories/UserRepo';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await UserRepo.findByEmail(email.trim().toLowerCase());
      if (!user || user.password !== password) {
        setError('Invalid email or password.');
        return;
      }
      await signIn({
        user_id: user.id!,
        company_id: user.company_id,
        role: user.role,
        name: user.name,
        email: user.email,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.logoArea}>
        <div style={styles.logoIcon}>💸</div>
        <h1 style={styles.appName}>ReimburseFlow</h1>
        <p style={styles.tagline}>Smart explainable approval engine</p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Sign In</h2>
        
        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.divider} />

        <div style={styles.linkRow}>
          <span style={styles.linkText}>Don't have an account? </span>
          <button style={styles.linkAccent} onClick={() => navigate('/signup')}>
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '24px',
    backgroundColor: 'var(--accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    margin: '0 auto 12px auto',
    boxShadow: '0 0 20px rgba(108, 99, 255, 0.4)',
  },
  appName: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
    color: 'var(--text-primary)',
  },
  tagline: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: '4px 0 0 0',
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid var(--border-default)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 24px 0',
  },
  errorBanner: {
    backgroundColor: 'var(--status-error-bg)',
    color: 'var(--status-error)',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  fieldGroup: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    fontWeight: 500,
  },
  input: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    padding: '12px',
    color: 'var(--text-primary)',
    fontSize: '16px',
    outline: 'none',
  },
  submitBtn: {
    backgroundColor: 'var(--accent-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    width: '100%',
    fontSize: '16px',
    fontWeight: 600,
    marginTop: '8px',
    boxShadow: '0 4px 12px rgba(108, 99, 255, 0.4)',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border-subtle)',
    margin: '24px 0',
  },
  linkRow: {
    textAlign: 'center',
  },
  linkText: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  linkAccent: {
    color: 'var(--accent-secondary)',
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '14px',
    fontWeight: 500,
  },
};
