import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ExpenseRepo } from '../../repositories/ExpenseRepo';
import { ApprovalService } from '../../services/ApprovalService';
import { CompanyRepo } from '../../repositories/CompanyRepo';
import { ApprovalRequestRepo } from '../../repositories/ApprovalRepo';
import { CurrencyService } from '../../services/CurrencyService';
import { CATEGORIES, CURRENCIES } from '../../utils/constants';
import type { ExpenseStatus } from '../../types';
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

const editableStatuses: ExpenseStatus[] = ['draft'];

const toCsvValue = (value: string | number | null | undefined): string => {
  const safe = String(value ?? '');
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ExpenseStatus>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [detailForm, setDetailForm] = useState<ExpenseForm>(defaultForm);
  const [trail, setTrail] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);

  const amountNumber = useMemo(() => Number.parseFloat(form.amount || '0'), [form.amount]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesSearch =
        !search.trim()
        || String(exp.description || '').toLowerCase().includes(search.toLowerCase())
        || String(exp.merchant || '').toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;

      const date = String(exp.expense_date || '');
      const matchesFrom = !fromDate || date >= fromDate;
      const matchesTo = !toDate || date <= toDate;

      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }, [expenses, search, statusFilter, fromDate, toDate]);

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
      const rates = await CurrencyService.getRates(baseCurrency);
      const mappedExpenses = employeeExpenses.map((expense) => {
        const sourceAmount = Number(expense.amount || 0);
        const sourceCurrency = expense.currency || baseCurrency;
        const convertedAmount = CurrencyService.convert(sourceAmount, sourceCurrency, baseCurrency, rates);
        return {
          ...expense,
          sourceLabel: CurrencyService.format(sourceAmount, sourceCurrency),
          convertedLabel: CurrencyService.format(convertedAmount, baseCurrency),
        };
      });

      setCompanyCurrency(baseCurrency);
      setForm((prev) => ({ ...prev, currency: prev.currency || baseCurrency }));
      setExpenses(mappedExpenses);
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

  const resetDraftForm = () => {
    setForm({ ...defaultForm, currency: companyCurrency, expense_date: new Date().toISOString().slice(0, 10) });
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
      resetDraftForm();
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
    } catch (err: any) {
      alert(err?.message || 'Failed to submit expense for approval.');
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

      const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
      if (lines.length > 0) {
        newMerchant = lines[0];
      }

      const amountRegex = /(?:Total|Amount|Sum|Due).*?\$?\s*([0-9]+[\.,][0-9]{2})/i;
      const amountMatch = text.match(amountRegex) || text.match(/\$ *([0-9]+[\.,][0-9]{2})/);
      if (amountMatch && amountMatch[1]) {
        newAmount = amountMatch[1].replace(',', '.');
      }

      const dateRegex = /([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/;
      const dateMatch = text.match(dateRegex);
      if (dateMatch && dateMatch[1]) {
        const parts = dateMatch[1].replace(/\./g, '/').replace(/\-/g, '/').split('/');
        if (parts.length === 3) {
          const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          const m = parts[0].padStart(2, '0');
          const d = parts[1].padStart(2, '0');
          newDate = `${y}-${m}-${d}`;
        }
      }

      if (text.toLowerCase().includes('uber') || text.toLowerCase().includes('lyft')) {
        newDesc = 'Ride Sharing';
        setForm((f) => ({ ...f, category_id: CATEGORIES.find((c) => c.name === 'Transport')?.id || f.category_id }));
      } else if (text.toLowerCase().includes('restaurant') || text.toLowerCase().includes('cafe')) {
        newDesc = 'Business Meal';
        setForm((f) => ({ ...f, category_id: CATEGORIES.find((c) => c.name === 'Food & Dining')?.id || f.category_id }));
      }

      setForm((prev) => ({
        ...prev,
        amount: newAmount,
        expense_date: newDate.length === 10 ? newDate : prev.expense_date,
        merchant: newMerchant || prev.merchant,
        description: prev.description || newDesc || 'Scanned Receipt',
        remarks: `OCR Text:\n${text.slice(0, 150)}...`,
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to scan image. Please enter details manually.');
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openExpenseDetail = async (expense: any) => {
    setSelectedExpense(expense);
    setDetailForm({
      merchant: expense.merchant || '',
      description: expense.description || '',
      expense_date: expense.expense_date || defaultForm.expense_date,
      category_id: expense.category_id || CATEGORIES[0].id,
      paid_by: expense.paid_by || 'Self',
      currency: expense.currency || companyCurrency,
      amount: String(expense.amount ?? ''),
      remarks: expense.remarks || '',
    });

    setDetailLoading(true);
    try {
      const requests = await ApprovalRequestRepo.findByExpense(Number(expense.id));
      setTrail(requests);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeExpenseDetail = () => {
    setSelectedExpense(null);
    setTrail([]);
  };

  const canEditSelected = selectedExpense && editableStatuses.includes(selectedExpense.status);

  const saveExpenseDetail = async () => {
    if (!selectedExpense || !canEditSelected) return;
    const parsedAmount = Number.parseFloat(detailForm.amount || '0');
    if (!detailForm.description.trim()) {
      alert('Description is required.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('Amount must be greater than 0.');
      return;
    }

    setDetailSaving(true);
    try {
      await ExpenseRepo.update(Number(selectedExpense.id), {
        merchant: detailForm.merchant.trim(),
        description: detailForm.description.trim(),
        expense_date: detailForm.expense_date,
        category_id: detailForm.category_id,
        paid_by: detailForm.paid_by,
        currency: detailForm.currency,
        amount: parsedAmount,
        remarks: detailForm.remarks.trim(),
      });
      await refresh();
      closeExpenseDetail();
    } finally {
      setDetailSaving(false);
    }
  };

  const deleteExpenseDetail = async () => {
    if (!selectedExpense || !canEditSelected) return;
    if (!window.confirm('Delete this draft expense?')) return;
    await ExpenseRepo.delete(Number(selectedExpense.id));
    await refresh();
    closeExpenseDetail();
  };

  const exportCsv = () => {
    const header = ['Merchant', 'Description', 'Date', 'Category', 'Currency', 'Amount', 'Converted Amount', 'Status'];
    const rows = filteredExpenses.map((exp) => [
      exp.merchant || '',
      exp.description || '',
      exp.expense_date || '',
      exp.category_name || '',
      exp.currency || '',
      Number(exp.amount || 0).toFixed(2),
      exp.convertedLabel || '',
      exp.status || '',
    ]);

    const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div style={styles.headerActions}>
          <button style={styles.secondaryBtn} onClick={resetDraftForm}>+ New Draft</button>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
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
          <input style={styles.input} value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} />

          <label style={styles.label}>Description</label>
          <input style={styles.input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <label style={styles.label}>Expense Date</label>
          <input type="date" style={styles.input} value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />

          <label style={styles.label}>Category</label>
          <select style={styles.input} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          <label style={styles.label}>Paid By</label>
          <input style={styles.input} value={form.paid_by} onChange={(e) => setForm({ ...form, paid_by: e.target.value })} />

          <label style={styles.label}>Currency</label>
          <select style={styles.input} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label style={styles.label}>Amount</label>
          <input type="number" min="0" step="0.01" style={styles.input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />

          <label style={styles.label}>Remarks</label>
          <textarea style={styles.input} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={3} />

          <button type="submit" style={styles.primaryBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </form>

        <div style={styles.listCard}>
          <div style={styles.listTopRow}>
            <h3 style={{ margin: 0 }}>My Expenses</h3>
            <button style={styles.secondaryBtn} onClick={exportCsv}>Export CSV</button>
          </div>

          <div style={styles.filtersRow}>
            <input
              style={styles.input}
              placeholder="Search description or merchant"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select style={styles.input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="waiting_approval">Waiting Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <input type="date" style={styles.input} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" style={styles.input} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          {loading ? <p>Loading...</p> : filteredExpenses.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No expenses found.</p> : (
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
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} style={styles.clickableRow} onClick={() => openExpenseDetail(exp)}>
                      <td style={{ fontWeight: 600 }}>{exp.merchant || '-'}</td>
                      <td>{exp.description}</td>
                      <td>{exp.expense_date}</td>
                      <td>{exp.category_name}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{exp.convertedLabel || `${exp.currency} ${Number(exp.amount).toFixed(2)}`}</div>
                        {exp.sourceLabel && exp.sourceLabel !== exp.convertedLabel ? (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Original: {exp.sourceLabel}</div>
                        ) : null}
                      </td>
                      <td><span style={styles.statusBadge(exp.status)}>{exp.status}</span></td>
                      <td>
                        {exp.status === 'draft' ? (
                          <button
                            style={styles.secondaryBtn}
                            onClick={(event) => {
                              event.stopPropagation();
                              submitExpense(Number(exp.id));
                            }}
                            disabled={submittingId === Number(exp.id)}
                          >
                            {submittingId === Number(exp.id) ? 'Submitting...' : 'Submit'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Open</span>
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

      {selectedExpense ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Expense Detail</h3>
              <button style={styles.closeBtn} onClick={closeExpenseDetail}>✕</button>
            </div>

            <div style={styles.detailStatusRow}>
              <span style={styles.statusBadge(selectedExpense.status)}>{selectedExpense.status}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {canEditSelected ? 'Editable draft' : 'Read-only after submission'}
              </span>
            </div>

            <div style={styles.detailGrid}>
              <label style={styles.label}>Merchant</label>
              <input style={styles.input} disabled={!canEditSelected} value={detailForm.merchant} onChange={(e) => setDetailForm({ ...detailForm, merchant: e.target.value })} />

              <label style={styles.label}>Description</label>
              <input style={styles.input} disabled={!canEditSelected} value={detailForm.description} onChange={(e) => setDetailForm({ ...detailForm, description: e.target.value })} />

              <label style={styles.label}>Expense Date</label>
              <input type="date" style={styles.input} disabled={!canEditSelected} value={detailForm.expense_date} onChange={(e) => setDetailForm({ ...detailForm, expense_date: e.target.value })} />

              <label style={styles.label}>Category</label>
              <select style={styles.input} disabled={!canEditSelected} value={detailForm.category_id} onChange={(e) => setDetailForm({ ...detailForm, category_id: Number(e.target.value) })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>

              <label style={styles.label}>Paid By</label>
              <input style={styles.input} disabled={!canEditSelected} value={detailForm.paid_by} onChange={(e) => setDetailForm({ ...detailForm, paid_by: e.target.value })} />

              <label style={styles.label}>Currency</label>
              <select style={styles.input} disabled={!canEditSelected} value={detailForm.currency} onChange={(e) => setDetailForm({ ...detailForm, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <label style={styles.label}>Amount</label>
              <input type="number" min="0" step="0.01" style={styles.input} disabled={!canEditSelected} value={detailForm.amount} onChange={(e) => setDetailForm({ ...detailForm, amount: e.target.value })} />
              {!canEditSelected && selectedExpense?.convertedLabel ? (
                <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-secondary)' }}>
                  Converted: {selectedExpense.convertedLabel}
                  {selectedExpense.sourceLabel && selectedExpense.sourceLabel !== selectedExpense.convertedLabel ? ` (Original: ${selectedExpense.sourceLabel})` : ''}
                </div>
              ) : null}

              <label style={styles.label}>Remarks</label>
              <textarea style={styles.input} rows={3} disabled={!canEditSelected} value={detailForm.remarks} onChange={(e) => setDetailForm({ ...detailForm, remarks: e.target.value })} />
            </div>

            <h4 style={{ marginBottom: 8 }}>Audit Trail</h4>
            {detailLoading ? <p>Loading trail...</p> : trail.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>No approval actions yet.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Approver</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trail.map((row) => (
                      <tr key={row.id}>
                        <td>{row.approver_name}</td>
                        <td><span style={styles.statusBadge(row.status)}>{row.status}</span></td>
                        <td>{row.acted_at || row.created_at || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={styles.modalActions}>
              {canEditSelected ? (
                <>
                  <button style={styles.deleteBtn} onClick={deleteExpenseDetail}>Delete Draft</button>
                  <button style={styles.primaryBtn} onClick={saveExpenseDetail} disabled={detailSaving}>
                    {detailSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button style={styles.secondaryBtn} onClick={closeExpenseDetail}>Close</button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, any> = {
  container: { padding: 24, maxWidth: 1440, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerActions: { display: 'flex', gap: 8 },
  logoutBtn: { background: '#fff', border: '1px solid rgba(220, 38, 38, 0.2)', color: 'var(--status-error)', padding: '10px 14px', borderRadius: 10, fontWeight: 700 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 20 },
  summaryCard: { background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', boxShadow: 'var(--shadow-soft)' },
  layout: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, alignItems: 'start' },
  formCard: { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: 'var(--shadow-soft)' },
  listCard: { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow-soft)' },
  listTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filtersRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 },
  ocrBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--accent-primary)', marginBottom: 8 },
  ocrInfo: { display: 'flex', flexDirection: 'column' },
  scanBtn: { background: 'var(--accent-light)', color: 'var(--accent-primary)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  label: { fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 },
  input: { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 8, padding: 10, fontSize: 14 },
  primaryBtn: { background: 'linear-gradient(135deg, var(--accent-primary), #0ea5e9)', color: '#fff', border: 'none', borderRadius: 10, padding: 12, marginTop: 8, fontWeight: 700, boxShadow: '0 10px 24px rgba(11, 94, 215, 0.24)' },
  secondaryBtn: { background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 10px', fontWeight: 600 },
  deleteBtn: { background: 'transparent', color: 'var(--status-error)', border: '1px solid var(--status-error)', borderRadius: 10, padding: '10px 12px', fontWeight: 700 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  clickableRow: { cursor: 'pointer' },
  statusBadge: (status: string) => ({
    fontSize: 12,
    textTransform: 'capitalize',
    padding: '2px 8px',
    borderRadius: 999,
    background: status === 'approved' ? 'var(--status-success-bg)' : status === 'rejected' ? 'var(--status-error-bg)' : 'var(--status-warning-bg)',
    color: status === 'approved' ? 'var(--status-success)' : status === 'rejected' ? 'var(--status-error)' : 'var(--status-warning)',
  }),
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'var(--bg-overlay)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1500 },
  modalCard: { width: 'min(860px, 96vw)', maxHeight: '92vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 14, padding: 20 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 20 },
  detailStatusRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
};
