import React, { useState, useEffect, useMemo } from 'react';
import { UserRepo, generatePassword } from '../../repositories/UserRepo';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export default function UserManagement() {
  const { session } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'employee' as UserRole, manager_id: null as number | null });
  const [saving, setSaving] = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ name: string; pw: string } | null>(null);
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const raw = await UserRepo.findByCompany(session.company_id);
      const mgrs = await UserRepo.findManagersByCompany(session.company_id);
      
      const withManagers = raw.map(u => ({
        ...u,
        manager_name: mgrs.find(m => m.id === u.manager_id)?.name || null,
      }));
      setUsers(withManagers);
      setManagers(mgrs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [session]);

  const stats = useMemo(() => {
    const total = users.length;
    const managersCount = users.filter(u => u.role === 'manager').length;
    const employeesCount = users.filter(u => u.role === 'employee').length;
    return { total, managersCount, employeesCount };
  }, [users]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const existing = await UserRepo.findByEmail(form.email.trim().toLowerCase());
      if (existing) {
        setError('Email already in use.');
        return;
      }
      const pw = generatePassword();
      await UserRepo.create({
        company_id: session!.company_id,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: pw,
        role: form.role,
        manager_id: form.manager_id,
      });
      setShowModal(false);
      setForm({ name: '', email: '', role: 'employee', manager_id: null });
      await refresh();
      setPasswordResult({ name: form.name, pw });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendPassword = async (user: any) => {
    const pw = generatePassword();
    await UserRepo.updatePassword(user.id, pw);
    setPasswordResult({ name: user.name, pw });
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Team Members</h2>
          <p style={styles.subtitle}>Manage organization roles, reporting lines, and secure access.</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>+ New User</button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}><span>Total Users</span><strong>{stats.total}</strong></div>
        <div style={styles.statCard}><span>Managers</span><strong>{stats.managersCount}</strong></div>
        <div style={styles.statCard}><span>Employees</span><strong>{stats.employeesCount}</strong></div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : users.length === 0 ? (
        <div style={styles.emptyState}>No users yet. Add your first team member.</div>
      ) : (
        <div style={styles.grid}>
          {users.map(u => (
            <div key={u.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.avatar}>{u.name[0].toUpperCase()}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>{u.name}</strong>
                    <span style={styles.roleBadge(u.role)}>{u.role}</span>
                  </div>
                  <div style={styles.emailText}>{u.email}</div>
                  {u.manager_name && <div style={styles.managerText}>👤 Mgr: {u.manager_name}</div>}
                </div>
              </div>
              <button style={styles.actionBtn} onClick={() => handleSendPassword(u)}>🔑 Reset PW</button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>New User</h3>
              <button style={styles.closeBtn} type="button" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div style={{ color: 'var(--status-error)', marginBottom: '16px' }}>{error}</div>}
            
            <form onSubmit={handleCreate}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <input style={styles.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input type="email" style={styles.input} value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Role</label>
                <select style={styles.input} value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Manager</label>
                <select style={styles.input} value={form.manager_id || ''} onChange={e => setForm({...form, manager_id: e.target.value ? Number(e.target.value) : null})}>
                  <option value="">None</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" style={styles.submitBtn} disabled={saving}>
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {passwordResult && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, textAlign: 'center' }}>
            <h2>🔑 New Password</h2>
            <p>Temporary password for {passwordResult.name}:</p>
            <div style={styles.pwBox}>{passwordResult.pw}</div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Share this with the user. They will need it to login.</p>
            <button type="button" style={styles.submitBtn} onClick={() => setPasswordResult(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  subtitle: { margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' },
  addBtn: { background: 'linear-gradient(135deg, var(--accent-primary), #0ea5e9)', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 20px rgba(11, 94, 215, 0.22)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: '16px' },
  statCard: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-soft)' },
  emptyState: { textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', padding: '40px', border: '1px dashed var(--border-default)', borderRadius: '12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  card: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-soft)' },
  cardTop: { display: 'flex', gap: '12px', alignItems: 'center' },
  avatar: { width: '40px', height: '40px', borderRadius: '20px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 },
  emailText: { fontSize: '13px', color: 'var(--text-secondary)' },
  managerText: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' },
  actionBtn: { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, alignSelf: 'flex-start', cursor: 'pointer' },
  roleBadge: (role: string) => ({
    fontSize: '11px', padding: '2px 8px', borderRadius: '12px', textTransform: 'capitalize', fontWeight: 600,
    backgroundColor: `var(--role-${role}-bg)`, color: `var(--role-${role})`
  }),
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalContent: { backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '420px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-strong)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' },
  field: { marginBottom: '16px', display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' },
  input: { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', padding: '10px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
  submitBtn: { background: 'linear-gradient(135deg, var(--accent-primary), #0ea5e9)', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', width: '100%', fontWeight: 700, marginTop: '8px', cursor: 'pointer' },
  pwBox: { border: '1px solid var(--accent-primary)', backgroundColor: 'var(--accent-light)', padding: '16px', borderRadius: '8px', fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-secondary)', letterSpacing: '2px', margin: '16px 0' },
};

