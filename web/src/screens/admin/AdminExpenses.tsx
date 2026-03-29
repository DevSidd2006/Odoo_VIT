import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ExpenseRepo } from '../../repositories/ExpenseRepo';
import { ApprovalService } from '../../services/ApprovalService';
import { CompanyRepo } from '../../repositories/CompanyRepo';
import { CurrencyService } from '../../services/CurrencyService';

export default function AdminExpenses() {
  const { session } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState('USD');

  const refresh = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [company, data] = await Promise.all([
        CompanyRepo.findById(session.company_id),
        ExpenseRepo.findByCompany(session.company_id),
      ]);
      const companyBase = company?.base_currency || 'USD';
      const rates = await CurrencyService.getRates(companyBase);
      const mapped = data.map((expense) => {
        const sourceAmount = Number(expense.amount || 0);
        const sourceCurrency = expense.currency || companyBase;
        const convertedAmount = CurrencyService.convert(sourceAmount, sourceCurrency, companyBase, rates);
        return {
          ...expense,
          sourceLabel: CurrencyService.format(sourceAmount, sourceCurrency),
          convertedLabel: CurrencyService.format(convertedAmount, companyBase),
        };
      });

      setBaseCurrency(companyBase);
      setExpenses(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [session]);

  const forceApprove = async (id: number) => {
    if (window.confirm("🚨 ADMIN COMMAND: Force approve this expense overriding all workflows?")) {
      const reason = window.prompt('Optional override reason for audit trail:', '') ?? '';
      await ApprovalService.adminOverrideExpense(id, 'approved', reason);
      refresh();
    }
  };

  const forceReject = async (id: number) => {
    if (window.confirm("🚨 ADMIN COMMAND: Force reject this expense overriding all workflows?")) {
      const reason = window.prompt('Optional override reason for audit trail:', '') ?? '';
      await ApprovalService.adminOverrideExpense(id, 'rejected', reason);
      refresh();
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Global Expenses Console</h2>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)' }}>
            View all expenses across the company and execute admin overrides.
          </p>
        </div>
      </div>

      <div style={styles.listCard}>
        {loading ? <p>Loading global expenses...</p> : expenses.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No expenses recorded.</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.headCell}>Employee</th>
                  <th style={styles.headCell}>Merchant & Details</th>
                  <th style={styles.headCell}>Date</th>
                  <th style={styles.headCell}>Amount</th>
                  <th style={styles.headCell}>Status</th>
                  <th style={styles.headCell}>Admin Override</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td style={styles.bodyCell}>
                      <div style={{ fontWeight: 600 }}>{exp.employee_name}</div>
                    </td>
                    <td style={styles.bodyCell}>
                      <div style={{ fontWeight: 600 }}>{exp.merchant || 'N/A Merchant'}</div>
                      <div style={{ fontSize: 13 }}>{exp.description}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp.category_name}</div>
                    </td>
                    <td style={styles.bodyCell}>{exp.expense_date}</td>
                    <td style={{ ...styles.bodyCell, fontWeight: 600 }}>
                      <div>{exp.convertedLabel || `${exp.currency} ${Number(exp.amount).toFixed(2)}`}</div>
                      {exp.sourceLabel && exp.sourceLabel !== exp.convertedLabel ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Original: {exp.sourceLabel}</div>
                      ) : null}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Base: {baseCurrency}</div>
                    </td>
                    <td style={styles.bodyCell}><span style={styles.statusBadge(exp.status)}>{exp.status}</span></td>
                    <td style={styles.bodyCell}>
                      {exp.status !== 'approved' && exp.status !== 'rejected' && exp.status !== 'draft' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            style={styles.overrideApproveBtn} 
                            onClick={() => forceApprove(Number(exp.id))}
                          >
                            Force Approve
                          </button>
                          <button 
                            style={styles.overrideRejectBtn} 
                            onClick={() => forceReject(Number(exp.id))}
                          >
                            Force Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No overrides available</span>
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
  );
}

const styles: Record<string, any> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  listCard: { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 24 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  headCell: { padding: '12px 10px', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-default)' },
  bodyCell: { padding: '14px 10px', borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'top' },
  overrideApproveBtn: { background: 'var(--status-success-bg)', color: 'var(--status-success)', border: '1px solid var(--status-success)', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  overrideRejectBtn: { background: 'var(--status-error-bg)', color: 'var(--status-error)', border: '1px outset var(--status-error)', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  statusBadge: (status: string) => ({
    fontSize: 12,
    textTransform: 'capitalize',
    padding: '4px 8px',
    borderRadius: 999,
    fontWeight: 600,
    background: status === 'approved' ? 'var(--status-success-bg)' : status === 'rejected' ? 'var(--status-error-bg)' : 'var(--status-warning-bg)',
    color: status === 'approved' ? 'var(--status-success)' : status === 'rejected' ? 'var(--status-error)' : 'var(--status-warning)',
  }),
};
