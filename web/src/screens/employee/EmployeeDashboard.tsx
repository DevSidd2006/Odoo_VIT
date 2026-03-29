import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ExpenseRepo } from '../../repositories/ExpenseRepo';
import { ApprovalService } from '../../services/ApprovalService';
import { CompanyRepo } from '../../repositories/CompanyRepo';
import { CATEGORIES, CURRENCIES } from '../../utils/constants';

type ExpenseForm = {
  description: string;
  expense_date: string;
  category_id: number;
  paid_by: string;
  currency: string;
  amount: string;
  remarks: string;
};

const defaultForm: ExpenseForm = {
  description: '',
  expense_date: new Date().toISOString().slice(0, 10),
  category_id: CATEGORIES[0].id,
  paid_by: 'Self',
  currency: 'USD',
  amount: '',
  remarks: '',
};

export default function EmployeeDashboard() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [companyCurrency, setCompanyCurrency] = useState('USD');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState({ to_submit: 0, waiting: 0, approved: 0 });
  const [form, setForm] = useState<ExpenseForm>(defaultForm);

  const amountNumber = useMemo(() => Number.parseFloat(form.amount || '0'), [form.amount]);

  const refresh = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [company, employeeExpenses, employeeSummary] = await Promise.all([
        CompanyRepo.findById(session.company_id),
        ExpenseRepo.findByEmployee(session.user_id),
        ExpenseRepo.getSummaryByEmployee(session.user_id),
      ]);
      const baseCurrency = company?.base_currency || 'USD';
      setCompanyCurrency(baseCurrency);
      setForm(prev => ({ ...prev, currency: prev.currency || baseCurrency }));
      setExpenses(employeeExpenses);
      setSummary(employeeSummary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [session]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const createDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!form.description.trim()) {
      alert('Description is required.');
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      alert('Amount must be greater than 0.');
      return;
    }

    setSaving(true);
    try {
      await ExpenseRepo.create({
        company_id: session.company_id,
        employee_id: session.user_id,
        description: form.description.trim(),
        expense_date: form.expense_date,
        category_id: form.category_id,
        paid_by: form.paid_by,
        currency: form.currency,
        amount: amountNumber,
        remarks: form.remarks.trim(),
      });
      setForm({ ...defaultForm, currency: companyCurrency });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const submitExpense = async (expenseId: number) => {
    if (!session) return;
    setSubmittingId(expenseId);
    try {
      await ApprovalService.submitExpense(expenseId, session.user_id);
      await refresh();
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Employee Dashboard</h2>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)' }}>
            Submit expenses and track approval progress.
          </p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}><span>To Submit</span><strong>{summary.to_submit.toFixed(2)}</strong></div>
        <div style={styles.summaryCard}><span>Waiting Approval</span><strong>{summary.waiting.toFixed(2)}</strong></div>
        <div style={styles.summaryCard}><span>Approved</span><strong>{summary.approved.toFixed(2)}</strong></div>
      </div>

      <div style={styles.layout}>
        <form style={styles.formCard} onSubmit={createDraft}>
          <h3 style={{ marginTop: 0 }}>New Expense</h3>

          <label style={styles.label}>Description</label>
          <input style={styles.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

          <label style={styles.label}>Expense Date</label>
          <input type="date" style={styles.input} value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />

          <label style={styles.label}>Category</label>
          <select style={styles.input} value={form.category_id} onChange={e => setForm({ ...form, category_id: Number(e.target.value) })}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          <label style={styles.label}>Paid By</label>
          <input style={styles.input} value={form.paid_by} onChange={e => setForm({ ...form, paid_by: e.target.value })} />

          <label style={styles.label}>Currency</label>
          <select style={styles.input} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label style={styles.label}>Amount</label>
          <input type="number" min="0" step="0.01" style={styles.input} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />

          <label style={styles.label}>Remarks</label>
          <textarea style={styles.input} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={3} />

          <button type="submit" style={styles.primaryBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </form>

        <div style={styles.listCard}>
          <h3 style={{ marginTop: 0 }}>My Expenses</h3>
          {loading ? <p>Loading...</p> : expenses.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No expenses yet.</p> : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td>{exp.description}</td>
                      <td>{exp.expense_date}</td>
                      <td>{exp.category_name}</td>
                      <td>{exp.currency} {Number(exp.amount).toFixed(2)}</td>
                      <td><span style={styles.statusBadge(exp.status)}>{exp.status}</span></td>
                      <td>
                        {exp.status === 'draft' ? (
                          <button
                            style={styles.secondaryBtn}
                            onClick={() => submitExpense(Number(exp.id))}
                            disabled={submittingId === Number(exp.id)}
                          >
                            {submittingId === Number(exp.id) ? 'Submitting...' : 'Submit'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  container: { padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoutBtn: { background: 'transparent', border: '1px solid var(--status-error-bg)', color: 'var(--status-error)', padding: '10px 14px', borderRadius: 8 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 20 },
  summaryCard: { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between' },
  layout: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, alignItems: 'start' },
  formCard: { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  listCard: { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 16 },
  label: { fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 },
  input: { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 8, padding: 10, fontSize: 14 },
  primaryBtn: { background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: 12, marginTop: 8, fontWeight: 600 },
  secondaryBtn: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '6px 10px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  statusBadge: (status: string) => ({
    fontSize: 12,
    textTransform: 'capitalize',
    padding: '2px 8px',
    borderRadius: 999,
    background: status === 'approved' ? 'var(--status-success-bg)' : status === 'rejected' ? 'var(--status-error-bg)' : 'var(--status-warning-bg)',
    color: status === 'approved' ? 'var(--status-success)' : status === 'rejected' ? 'var(--status-error)' : 'var(--status-warning)',
  }),
};
