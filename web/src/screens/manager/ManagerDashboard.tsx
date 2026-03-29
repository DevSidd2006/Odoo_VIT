import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApprovalRequestRepo } from '../../repositories/ApprovalRepo';
import { ApprovalService } from '../../services/ApprovalService';
import { CurrencyService } from '../../services/CurrencyService';

export default function ManagerDashboard() {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const currentTab = location.pathname.includes('/approvals') ? 'approvals' : 'dashboard';

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>💸</div>
          <h2 style={styles.appName}>ReimburseFlow</h2>
        </div>

        <nav style={styles.nav}>
          <button
            style={currentTab === 'dashboard' ? styles.navItemActive : styles.navItem}
            onClick={() => navigate('/dashboard')}
          >
            📊 Overview
          </button>
          <button
            style={currentTab === 'approvals' ? styles.navItemActive : styles.navItem}
            onClick={() => navigate('/approvals')}
          >
            ✓ Pending Approvals
          </button>
        </nav>

        <div style={{ flex: 1 }} />
        
        <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Logged in as: <br /><strong>{session?.name}</strong> (Manager)
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div style={styles.content}>
        <Routes>
          <Route path="/dashboard" element={<Overview />} />
          <Route path="/approvals" element={<PendingApprovals />} />
          <Route path="*" element={<Overview />} />
        </Routes>
      </div>
    </div>
  );
}

function Overview() {
  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Dashboard Overview</h2>
      <div style={styles.card}>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome to your manager dashboard. Check pending approvals to review expenses.</p>
      </div>
    </div>
  );
}

function PendingApprovals() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  const refresh = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const pending = await ApprovalRequestRepo.findPendingByApprover(session.user_id);
      const ratesByBase = new Map<string, Awaited<ReturnType<typeof CurrencyService.getRates>>>();

      const mapped = [];
      for (const req of pending) {
        const baseCurrency = req.company_base_currency || req.expense_currency || 'USD';
        const sourceCurrency = req.expense_currency || baseCurrency;
        const sourceAmount = req.expense_amount || 0;

        let convertedAmount = sourceAmount;
        if (sourceCurrency !== baseCurrency) {
          if (!ratesByBase.has(baseCurrency)) {
            ratesByBase.set(baseCurrency, await CurrencyService.getRates(baseCurrency));
          }
          convertedAmount = CurrencyService.convert(
            sourceAmount,
            sourceCurrency,
            baseCurrency,
            ratesByBase.get(baseCurrency)!
          );
        }

        mapped.push({
          ...req,
          sourceLabel: CurrencyService.format(sourceAmount, sourceCurrency),
          convertedLabel: CurrencyService.format(convertedAmount, baseCurrency),
        });
      }

      setRequests(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [session]);

  const handleDecision = async (requestId: number, expenseId: number, ruleId: number, decision: 'approved' | 'rejected') => {
    const comment = window.prompt(
      decision === 'rejected'
        ? 'Please provide a rejection reason:'
        : 'Optional approval comment:',
      ''
    );
    if (comment === null) return;
    if (decision === 'rejected' && !comment.trim()) {
      alert('Rejection requires a comment.');
      return;
    }
    
    setActing(requestId);
    try {
      await ApprovalService.processDecision(requestId, decision, expenseId, ruleId, comment);
      await refresh();
    } catch (e) {
      console.error(e);
      alert('Error processing approval');
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Pending Approvals</h2>
      {loading ? <p>Loading...</p> : requests.length === 0 ? (
        <div style={styles.emptyState}>No pending requests right now. 🎉</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map(r => (
            <div key={r.id} style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{r.expense_description}</h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <strong>Employee:</strong> {r.employee_name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <strong>Amount:</strong> {r.convertedLabel}
                    {r.sourceLabel !== r.convertedLabel ? ` (original: ${r.sourceLabel})` : ''}
                  </div>
                </div>

                <div style={styles.actionRow}>
                  <button 
                    style={{ ...styles.approveBtn, opacity: acting ? 0.5 : 1 }} 
                    disabled={!!acting}
                    onClick={() => handleDecision(r.id!, r.expense_id, r.rule_id, 'approved')}
                  >
                    ✓ Approve
                  </button>
                  <button 
                    style={{ ...styles.rejectBtn, opacity: acting ? 0.5 : 1 }}
                    disabled={!!acting}
                    onClick={() => handleDecision(r.id!, r.expense_id, r.rule_id, 'rejected')}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: '100vh', backgroundColor: 'var(--bg-primary)' },
  sidebar: { width: '280px', backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border-default)', padding: '24px', display: 'flex', flexDirection: 'column' },
  logoArea: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' },
  logoIcon: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' },
  appName: { margin: 0, fontSize: '18px', color: 'var(--text-primary)' },
  nav: { display: 'flex', flexDirection: 'column', gap: '8px' },
  navItem: { backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', padding: '12px 16px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '15px', fontWeight: 500, transition: 'all 0.2s' },
  navItemActive: { backgroundColor: 'var(--accent-light)', color: 'var(--accent-secondary)', border: 'none', padding: '12px 16px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '15px', fontWeight: 600 },
  logoutBtn: { backgroundColor: 'transparent', color: 'var(--status-error)', border: '1px solid var(--status-error-bg)', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  content: { flex: 1, overflowY: 'auto', padding: '40px' },
  card: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '20px' },
  emptyState: { textAlign: 'center', color: 'var(--text-muted)', padding: '40px', border: '1px dashed var(--border-default)', borderRadius: '12px' },
  actionRow: { display: 'flex', gap: '8px' },
  approveBtn: { backgroundColor: 'var(--status-success)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' },
  rejectBtn: { backgroundColor: 'transparent', color: 'var(--status-error)', border: '1px solid var(--status-error)', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' },
};
