import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ExpenseRepo } from '../../repositories/ExpenseRepo';
import { ApprovalService } from '../../services/ApprovalService';
import { CompanyRepo } from '../../repositories/CompanyRepo';
import { CATEGORIES, CURRENCIES } from '../../utils/constants';
import Tesseract from 'tesseract.js';

type ExpenseForm = {
  merchant: string;
  description: string;
  expense_date: string;
  category_id: number;
  paid_by: string;
  currency: string;
  amount: string;
  remarks: string;
};

const defaultForm: ExpenseForm = {
  merchant: '',
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
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
        merchant: form.merchant.trim(),
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

  const scanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      
      let newAmount = form.amount;
      let newDesc = form.description;
      let newDate = form.expense_date;
      let newMerchant = form.merchant;

      // Extract obvious merchants based on keywords or top lines
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        newMerchant = lines[0]; // first line is often the merchant
      }

      // Extremely basic extraction logic for demo
      const amountRegex = /(?:Total|Amount|Sum|Due).*?\$?\s*([0-9]+[\.\,][0-9]{2})/i;
      const amountMatch = text.match(amountRegex) || text.match(/\$ *([0-9]+[\.\,][0-9]{2})/);
      if (amountMatch && amountMatch[1]) {
        newAmount = amountMatch[1].replace(',', '.');
      }

      const dateRegex = /([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/;
      const dateMatch = text.match(dateRegex);
      if (dateMatch && dateMatch[1]) {
        // Try to parse basic dates
        const parts = dateMatch[1].replace(/\./g, '/').replace(/\-/g, '/').split('/');
        if (parts.length === 3) {
           let y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
           let m = parts[0].padStart(2, '0');
           let d = parts[1].padStart(2, '0');
           newDate = `${y}-${m}-${d}`;
        }
      }

      if (text.toLowerCase().includes('uber') || text.toLowerCase().includes('lyft')) {
        newDesc = 'Ride Sharing';
        setForm(f => ({ ...f, category_id: CATEGORIES.find(c => c.name === 'Transport')?.id || f.category_id }));
      } else if (text.toLowerCase().includes('restaurant') || text.toLowerCase().includes('cafe')) {
        newDesc = 'Business Meal';
          setForm(f => ({ ...f, category_id: CATEGORIES.find(c => c.name === 'Food & Dining')?.id || f.category_id }));
      }

      setForm(prev => ({
        ...prev,
        amount: newAmount,
        expense_date: newDate.length === 10 ? newDate : prev.expense_date,
        merchant: newMerchant || prev.merchant,
        description: prev.description || newDesc || 'Scanned Receipt',
        remarks: `OCR Text:\n${text.slice(0, 150)}...`
      }));

    } catch (err) {
      console.error(err);
      alert('Failed to scan image. Please enter details manually.');
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

          <div style={styles.ocrBox}>
            <div style={styles.ocrInfo}>
              <strong>📷 Smart Scan Receipt</strong>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Auto-fill amount, date, and category</span>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={scanReceipt}
            />
            <button 
              type="button" 
              style={styles.scanBtn} 
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
            >
              {scanning ? 'Scanning...' : 'Upload Image'}
            </button>
          </div>

          <label style={styles.label}>Merchant</label>
          <input style={styles.input} value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} />

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
                    <th>Merchant</th>
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
                      <td style={{ fontWeight: 600 }}>{exp.merchant || '-'}</td>
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
  ocrBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--accent-primary)', marginBottom: 8 },
  ocrInfo: { display: 'flex', flexDirection: 'column' },
  scanBtn: { background: 'var(--accent-light)', color: 'var(--accent-primary)', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 600, cursor: 'pointer' },
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
