import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CompanyRepo } from '../../repositories/CompanyRepo';
import { UserRepo } from '../../repositories/UserRepo';
import { CurrencyService } from '../../services/CurrencyService';
import { Country } from '../../types';

export default function SignupScreen() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [country, setCountry] = useState<Country | null>(null);
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    CurrencyService.fetchCountries().then(setCountries).catch(console.error);
  }, []);

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirm || !country) {
      setError('Please fill in all fields and select a country.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const existing = await UserRepo.findByEmail(email.trim().toLowerCase());
      if (existing) {
        setError('An account with this email already exists.');
        return;
      }

      const companyId = await CompanyRepo.create({
        name: `${name}'s Company`,
        country: country.name,
        base_currency: country.currency,
      });

      const userId = await UserRepo.create({
        company_id: companyId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'admin',
      });

      await signIn({
        user_id: userId,
        company_id: companyId,
        role: 'admin',
        name: name.trim(),
        email: email.trim().toLowerCase()
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
        <h1 style={styles.brandName}>ReimburseFlow</h1>
        <p style={styles.brandTagline}>Set up your company workspace</p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Admin (Company) Signup</h2>
        <p style={{ color: 'var(--status-error)', fontSize: '13px', margin: '4px 0 24px 0' }}>1 admin user per company</p>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSignup}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Name</label>
            <input type="text" style={styles.input} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input type="email" style={styles.input} value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input type="password" style={styles.input} value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input type="password" style={styles.input} value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Country</label>
            <div style={styles.hint}>Sets base currency</div>
            <button
              type="button"
              style={styles.countryBtn}
              onClick={() => setShowCountryPicker(true)}
            >
              {country ? `${country.flag} ${country.name} (${country.currency})` : 'Select a country...'}
              <span>▼</span>
            </button>
          </div>

          {country && (
            <div style={styles.currencyBadge}>
              📌 Base currency: <strong>{country.currency}</strong>
            </div>
          )}

          <button
            type="submit"
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>

        <div style={styles.linkRow}>
          <span style={styles.linkText}>Already have an account? </span>
          <button style={styles.linkAccent} onClick={() => navigate('/')}>Login</button>
        </div>
      </div>

      {showCountryPicker && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Select Country</h3>
              <button style={styles.closeBtn} onClick={() => setShowCountryPicker(false)}>✕</button>
            </div>
            <input
              type="text"
              style={{ ...styles.input, marginBottom: '16px' }}
              placeholder="Search..."
              value={countrySearch}
              onChange={e => setCountrySearch(e.target.value)}
            />
            <div style={styles.countryList}>
              {filteredCountries.map(c => (
                <div
                  key={c.code}
                  style={styles.countryItem}
                  onClick={() => { setCountry(c); setShowCountryPicker(false); setCountrySearch(''); }}
                >
                  <span style={{ fontSize: '24px' }}>{c.flag}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.currency} — {c.currency_name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // reusing some styles from Login...
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  logoArea: { textAlign: 'center', marginBottom: '22px' },
  logoIcon: { width: '76px', height: '76px', borderRadius: '22px', margin: '0 auto 10px auto', background: 'linear-gradient(135deg, var(--accent-primary), #0ea5e9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, boxShadow: 'var(--shadow-strong)' },
  brandName: { margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' },
  brandTagline: { margin: '6px 0 0 0', fontSize: 14, color: 'var(--text-secondary)' },
  card: { backgroundColor: 'var(--bg-card)', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '430px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-soft)' },
  cardTitle: { fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' },
  errorBanner: { backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' },
  fieldGroup: { marginBottom: '16px', display: 'flex', flexDirection: 'column' },
  label: { fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 },
  hint: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' },
  input: { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', fontSize: '16px', outline: 'none' },
  countryBtn: { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', fontSize: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' },
  currencyBadge: { backgroundColor: 'var(--accent-light)', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: 'var(--accent-secondary)', fontSize: '14px', border: '1px solid rgba(108, 99, 255, 0.3)' },
  submitBtn: { background: 'linear-gradient(135deg, var(--accent-primary), #0ea5e9)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', width: '100%', fontSize: '16px', fontWeight: 700, marginTop: '8px', marginBottom: '20px', boxShadow: '0 10px 24px rgba(11, 94, 215, 0.28)' },
  linkRow: { textAlign: 'center' },
  linkText: { color: 'var(--text-secondary)', fontSize: '14px' },
  linkAccent: { color: 'var(--accent-secondary)', background: 'none', border: 'none', padding: 0, fontSize: '14px', fontWeight: 700 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-overlay)', display: 'flex', alignItems: 'flex-end', zIndex: 100 },
  modalCard: { backgroundColor: 'var(--bg-card)', width: '100%', maxWidth: '480px', margin: '0 auto', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', height: '80vh', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-secondary)' },
  countryList: { flex: 1, overflowY: 'auto' },
  countryItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' },
};
