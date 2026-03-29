import React, { useState, useEffect } from 'react';
import { UserRepo } from '../repositories/UserRepo';
import type { ApprovalRuleWithApprovers } from '../types';

interface SimulatorProps {
  rule: ApprovalRuleWithApprovers;
  onClose: () => void;
}

export default function PolicySimulator({ rule, onClose }: SimulatorProps) {
  const [amount, setAmount] = useState<number>(500);
  const [employee, setEmployee] = useState<any>(null);
  const [manager, setManager] = useState<any>(null);
  const [approvers, setApprovers] = useState<any[]>([]);

  useEffect(() => {
    async function loadVars() {
      // Get the employee
      const users = await UserRepo.findByCompany(rule.company_id);
      const emp = users.find(u => u.id === rule.user_id);
      setEmployee(emp);

      if (rule.manager_is_approver && rule.manager_id) {
        const mgr = users.find(u => u.id === rule.manager_id);
        setManager(mgr);
      }

      // Load specific approvers for this rule
      const ruleApproverDetails = rule.approvers.map(a => {
        const u = users.find(u => u.id === a.user_id);
        return { ...a, name: u?.name || 'Unknown', role: u?.role || 'approver' };
      }).sort((a, b) => a.order_index - b.order_index);

      setApprovers(ruleApproverDetails);
    }
    loadVars();
  }, [rule]);

  if (!employee) return <div style={{ padding: 20 }}>Loading Context...</div>;
  
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{ margin: 0 }}>🔮 Explainable Policy Simulator</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.controls}>
          <div>
            <label style={styles.label}>Test Expense Amount</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, color: 'var(--text-secondary)' }}>$</span>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(Number(e.target.value))}
                style={styles.amountInput}
              />
            </div>
          </div>
          <div style={styles.ruleInfo}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Simulating Rule For:</div>
            <div style={{ fontWeight: 600 }}>👤 {employee.name}</div>
          </div>
        </div>

        <div style={styles.graphContainer}>
          <div style={styles.node}>
            <div style={styles.nodeLabel}>Start</div>
            <div style={styles.nodeBoxSubmit}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>📄 Expense Submitted</div>
              <div>Amount: ${amount}</div>
            </div>
          </div>

          <div style={styles.arrow}>⬇</div>

          {manager && (
            <>
              <div style={styles.node}>
                <div style={styles.nodeLabel}>Step 1: Direct Manager</div>
                <div style={styles.nodeBoxRequired}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>👔 {manager.name}</span>
                    <span style={styles.badgeRequired}>Required</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                    Must approve before it proceeds to additional approvers.
                  </div>
                </div>
              </div>
              <div style={styles.arrow}>⬇</div>
            </>
          )}

          {approvers.length > 0 ? (
            <div style={styles.node}>
              <div style={styles.nodeLabel}>
                Step {manager ? 2 : 1}: {rule.sequential ? 'Sequential Chain' : 'Parallel Evaluation'}
              </div>
              
              <div style={styles.groupContainer(rule.sequential)}>
                {approvers.map((app, idx) => (
                  <React.Fragment key={app.id}>
                    <div style={app.required ? styles.nodeBoxRequired : styles.nodeBoxOptional}>
                      <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>👤 {app.name}</span>
                        {app.required ? (
                          <span style={styles.badgeRequired}>Required</span>
                        ) : (
                          <span style={styles.badgeOptional}>Optional</span>
                        )}
                      </div>
                    </div>
                    {rule.sequential && idx < approvers.length - 1 && (
                      <div style={styles.arrowSmall}>⬇</div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {!rule.sequential && rule.min_approval_percentage < 100 && (
                <div style={styles.summaryBox}>
                  <strong>Approval Condition:</strong> Only requires {rule.min_approval_percentage}% of the above pool to approve (approx {Math.ceil(approvers.length * (rule.min_approval_percentage / 100))} approver{Math.ceil(approvers.length * (rule.min_approval_percentage / 100)) !== 1 ? 's' : ''}).
                </div>
              )}
            </div>
          ) : (
            <div style={styles.node}>
              <div style={styles.nodeBoxOptional}>
                No additional approvers required.
              </div>
            </div>
          )}

          <div style={styles.arrow}>⬇</div>
          
          <div style={styles.node}>
            <div style={styles.nodeLabel}>End</div>
            <div style={styles.nodeBoxSuccess}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>✅ Fully Approved</div>
              <div>Expense is ready for payout.</div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { backgroundColor: 'var(--bg-primary)', width: '100%', maxWidth: 700, maxHeight: '90vh', borderRadius: 16, border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' },
  header: { padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 24, cursor: 'pointer', padding: 0 },
  controls: { padding: '24px', display: 'flex', gap: 32, backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' },
  label: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  amountInput: { backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-default)', padding: '12px 16px', borderRadius: 8, color: 'var(--text-primary)', fontSize: 20, width: 140, fontWeight: 600, outline: 'none' },
  ruleInfo: { flex: 1, backgroundColor: 'var(--bg-card)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-default)' },
  graphContainer: { flex: 1, overflowY: 'auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#0A0A0B' },
  node: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  nodeLabel: { fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, fontWeight: 600 },
  nodeBoxSubmit: { width: '100%', padding: 20, borderRadius: 12, border: '2px dashed var(--text-secondary)', backgroundColor: 'var(--bg-elevated)', textAlign: 'center', color: 'var(--text-primary)' },
  nodeBoxSuccess: { width: '100%', padding: 20, borderRadius: 12, border: '2px solid var(--status-success)', backgroundColor: 'var(--status-success-bg)', textAlign: 'center', color: 'var(--status-success)' },
  nodeBoxRequired: { width: '100%', padding: 16, borderRadius: 12, border: '1px solid var(--accent-primary)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)' },
  nodeBoxOptional: { width: '100%', padding: 16, borderRadius: 12, border: '1px dashed var(--border-default)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' },
  badgeRequired: { backgroundColor: 'var(--accent-light)', color: 'var(--accent-secondary)', fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 700, textTransform: 'uppercase' },
  badgeOptional: { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, textTransform: 'uppercase', border: '1px solid var(--border-default)' },
  groupContainer: (isSequential: boolean) => ({
    width: '100%', padding: isSequential ? 0 : 20, borderRadius: 16, 
    border: isSequential ? 'none' : '1px solid var(--border-default)', 
    backgroundColor: isSequential ? 'transparent' : 'var(--bg-elevated)',
    display: 'flex', flexDirection: isSequential ? 'column' : 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center'
  }),
  summaryBox: { width: '100%', marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)', fontSize: 13, textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.3)' },
  arrow: { fontSize: 24, color: 'var(--text-muted)', margin: '16px 0', opacity: 0.5 },
  arrowSmall: { fontSize: 18, color: 'var(--text-muted)', margin: '8px 0', opacity: 0.5, textAlign: 'center', width: '100%' },
};
