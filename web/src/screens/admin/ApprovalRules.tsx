import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApprovalRuleRepo } from '../../repositories/ApprovalRepo';
import { UserRepo } from '../../repositories/UserRepo';
import type { ApprovalRuleWithApprovers } from '../../types';
import PolicySimulator from '../../components/PolicySimulator';

export default function ApprovalRules() {
  const { session } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [simulateRule, setSimulateRule] = useState<ApprovalRuleWithApprovers | null>(null);
  const [form, setForm] = useState({
    user_id: 0,
    description: '',
    manager_is_approver: true,
    override_manager_id: null as number | null,
    specific_approver_id: null as number | null,
    sequential: true,
    min_approval_percentage: 100,
    approvers: [] as { user_id: number; required: boolean; order_index: number }[]
  });

  const employeeUsers = users.filter(u => u.role === 'employee');
  const approverCandidates = users.filter(u => u.role !== 'employee');

  const policyHealth = useMemo(() => {
    const selectedUser = employeeUsers.find(u => u.id === form.user_id);
    const managerId = selectedUser?.manager_id || 0;
    const effectiveManagerId = form.override_manager_id || managerId;
    const hasManagerPath = !form.manager_is_approver || Boolean(effectiveManagerId);
    const hasAnyApprover = form.manager_is_approver || form.approvers.length > 0;

    if (!form.user_id || !form.description.trim() || !hasAnyApprover || !hasManagerPath) {
      return {
        status: 'red',
        label: 'Red',
        message: 'Rule is incomplete. Add required fields and a valid approver path before saving.',
      };
    }

    if (form.min_approval_percentage < 100 || !form.sequential || form.approvers.some(a => !a.required)) {
      return {
        status: 'amber',
        label: 'Amber',
        message: 'Rule is valid but permissive. Review thresholds and required approvers carefully.',
      };
    }

    return {
      status: 'green',
      label: 'Green',
      message: 'Rule is strict and fully defined.',
    };
  }, [employeeUsers, form]);

  const refresh = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await ApprovalRuleRepo.findByCompany(session.company_id);
      const allUsers = await UserRepo.findByCompany(session.company_id);
      setRules(data);
      setUsers(allUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [session]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this rule?')) {
      await ApprovalRuleRepo.delete(id);
      refresh();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id || !form.description) return;

    // We do not have manager_id in form directly, we fetch from the user selected
    const selectedUser = employeeUsers.find(u => u.id === form.user_id);
    if (!selectedUser) {
      alert('Please select a valid employee.');
      return;
    }

    const dedupedApprovers = Array.from(
      new Map(form.approvers.map(a => [a.user_id, a])).values()
    ).map((a, index) => ({ ...a, order_index: index }));

    const managerId = selectedUser?.manager_id || 0;

    if (form.manager_is_approver && !form.override_manager_id && !managerId) {
      alert('Selected employee has no manager assigned. Either select an override manager or uncheck manager approver.');
      return;
    }
    
    const effectiveManagerId = form.override_manager_id || managerId;
    const effectiveSpecificApproverId = form.specific_approver_id;

    const specificApproverInPath =
      !effectiveSpecificApproverId
      || (form.manager_is_approver && effectiveSpecificApproverId === effectiveManagerId)
      || dedupedApprovers.some(a => a.user_id === effectiveSpecificApproverId);

    if (!specificApproverInPath) {
      alert('Specific approver must be part of the approval path (manager or additional approver).');
      return;
    }

    const ruleId = await ApprovalRuleRepo.create({
      company_id: session!.company_id,
      user_id: form.user_id,
      description: form.description,
      manager_id: effectiveManagerId,
      manager_is_approver: form.manager_is_approver,
      specific_approver_id: effectiveSpecificApproverId,
      sequential: form.sequential,
      min_approval_percentage: form.min_approval_percentage,
    });

    for (const a of dedupedApprovers) {
      await ApprovalRuleRepo.addApprover({
        rule_id: ruleId,
        user_id: a.user_id,
        order_index: a.order_index,
        required: a.required
      });
    }

    setForm({
      user_id: 0,
      description: '',
      manager_is_approver: true,
      override_manager_id: null,
      specific_approver_id: null,
      sequential: true,
      min_approval_percentage: 100,
      approvers: [],
    });
    setShowForm(false);
    refresh();
  };

  const addApproverToForm = (userId: number) => {
    if (!userId) return;
    if (form.approvers.some(a => a.user_id === userId)) {
      return;
    }
    setForm(prev => ({
      ...prev,
      approvers: [...prev.approvers, { user_id: userId, required: false, order_index: prev.approvers.length }]
    }));
  };

  const removeApproverFromForm = (index: number) => {
    setForm(prev => ({
      ...prev,
      approvers: prev.approvers
        .filter((_, i) => i !== index)
        .map((a, i) => ({ ...a, order_index: i }))
    }));
  };

  const toggleApproverRequired = (index: number) => {
    setForm(prev => {
      const newApprovers = [...prev.approvers];
      newApprovers[index].required = !newApprovers[index].required;
      return { ...prev, approvers: newApprovers };
    });
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2>Policy & Rules</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Configure explainable approval paths for employees.</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowForm(true)}>+ New Policy</button>
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={styles.grid}>
          {rules.map(r => (
            <div key={r.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.ruleTitle}>{r.description}</div>
                  <div style={styles.ruleUser}>Applies to: {r.user_name}</div>
                </div>
                <button style={styles.deleteBtn} onClick={() => handleDelete(r.id)}>🗑️</button>
              </div>

              <div style={styles.tags}>
                <span style={styles.tag}>{r.sequential ? '📋 Sequential' : '⚡ Parallel'}</span>
                {r.manager_is_approver && <span style={styles.tag}>👔 Direct Manager First</span>}
                {r.specific_approver_id ? (
                  <span style={styles.tag}>⭐ Specific approver enabled</span>
                ) : null}
                {r.min_approval_percentage < 100 && (
                  <span style={styles.tagWarning}>⚖️ {r.min_approval_percentage}% Threshold</span>
                )}
              </div>
              
              <div style={styles.simulatorBtn} onClick={() => setSimulateRule(r)}>
                🔮 Run Policy Simulator
              </div>
            </div>
          ))}
        </div>
      )}

      {simulateRule && (
        <PolicySimulator rule={simulateRule} onClose={() => setSimulateRule(null)} />
      )}

      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Create Policy Rule</h3>
              <button style={styles.closeBtn} type="button" onClick={() => setShowForm(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div style={styles.field}>
                <label style={styles.label}>Policy Name</label>
                <input style={styles.input} required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Standard Travel Rule" />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Applies To (Employee)</label>
                <select style={styles.input} required value={form.user_id || ''} onChange={e => setForm({...form, user_id: Number(e.target.value)})}>
                  <option value="">Select an employee...</option>
                  {employeeUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div style={styles.row}>
                <label style={styles.checkbox}>
                  <input type="checkbox" checked={form.sequential} onChange={e => setForm({...form, sequential: e.target.checked})} />
                  Sequential Routing (One by One)
                </label>
                <label style={styles.checkbox}>
                  <input type="checkbox" checked={form.manager_is_approver} onChange={e => setForm({...form, manager_is_approver: e.target.checked})} />
                  Direct Manager Must Approve First
                </label>
              </div>

              {form.manager_is_approver && (
                <div style={styles.field}>
                  <label style={styles.label}>Manager Override (Default runs from user profile)</label>
                  <select style={styles.input} value={form.override_manager_id || ''} onChange={e => setForm({...form, override_manager_id: e.target.value ? Number(e.target.value) : null})}>
                    <option value="">Use Default Direct Manager</option>
                    {approverCandidates.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Specific Approver Auto-Approve (Optional)</label>
                <select
                  style={styles.input}
                  value={form.specific_approver_id || ''}
                  onChange={e => setForm({
                    ...form,
                    specific_approver_id: e.target.value ? Number(e.target.value) : null,
                  })}
                >
                  <option value="">None</option>
                  {approverCandidates.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  If selected approver approves, expense is auto-approved immediately.
                </span>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Approval Threshold (%)</label>
                <input type="number" min="1" max="100" style={styles.input} value={form.min_approval_percentage} onChange={e => setForm({...form, min_approval_percentage: Number(e.target.value)})} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Set &lt; 100 to allow partial approvals (e.g., 50% = 1 out of 2 approvers).</span>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Additional Approvers</label>
                {form.approvers.map((a, i) => {
                  const u = users.find(x => x.id === a.user_id);
                  return (
                    <div key={i} style={styles.approverRow}>
                      <span style={{ flex: 1 }}>{u?.name}</span>
                      <label style={styles.checkbox}>
                        <input type="checkbox" checked={a.required} onChange={() => toggleApproverRequired(i)} /> Required
                      </label>
                      <button type="button" style={styles.removeBtn} onClick={() => removeApproverFromForm(i)}>✕</button>
                    </div>
                  );
                })}
                <select 
                  style={{ ...styles.input, marginTop: '8px' }} 
                  value="" 
                  onChange={e => addApproverToForm(Number(e.target.value))}
                >
                  <option value="">+ Add an approver...</option>
                  {approverCandidates.filter(u => u.id !== form.user_id).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.healthBox(policyHealth.status)}>
                <div style={styles.healthTop}>
                  <strong>Policy Health</strong>
                  <span style={styles.healthBadge(policyHealth.status)}>{policyHealth.label}</span>
                </div>
                <div style={styles.healthText}>{policyHealth.message}</div>
              </div>

              <button type="submit" style={styles.submitBtn}>Save Policy</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  addBtn: { background: 'linear-gradient(135deg, var(--accent-primary), #0ea5e9)', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 20px rgba(11, 94, 215, 0.22)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-soft)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  ruleTitle: { fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' },
  ruleUser: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' },
  deleteBtn: { background: 'var(--status-error-bg)', border: '1px solid rgba(220, 38, 38, 0.2)', cursor: 'pointer', fontSize: '14px', borderRadius: 8, padding: '4px 8px' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' },
  tag: { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)' },
  tagWarning: { backgroundColor: 'var(--status-warning-bg)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', color: 'var(--status-warning)' },
  simulatorBtn: { backgroundColor: 'var(--accent-light)', color: 'var(--accent-secondary)', border: '1px solid rgba(37, 99, 235, 0.2)', padding: '10px', borderRadius: '10px', textAlign: 'center', fontWeight: 700, cursor: 'pointer', fontSize: '14px', marginTop: 'auto' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalContent: { backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '540px', border: '1px solid var(--border-default)', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-strong)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' },
  field: { marginBottom: '20px', display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 },
  input: { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', padding: '10px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
  row: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-default)' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer' },
  approverRow: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '6px', marginBottom: '8px', border: '1px solid var(--border-default)' },
  removeBtn: { background: 'none', border: 'none', color: 'var(--status-error)', cursor: 'pointer' },
  healthBox: (status: 'green' | 'amber' | 'red') => ({
    border: '1px solid var(--border-default)',
    backgroundColor: status === 'green' ? 'var(--status-success-bg)' : status === 'amber' ? 'var(--status-warning-bg)' : 'var(--status-error-bg)',
    borderRadius: '10px',
    padding: '10px 12px',
    marginBottom: '8px',
  }),
  healthTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  healthBadge: (status: 'green' | 'amber' | 'red') => ({
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: 999,
    padding: '2px 8px',
    color: status === 'green' ? 'var(--status-success)' : status === 'amber' ? 'var(--status-warning)' : 'var(--status-error)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
  }),
  healthText: { fontSize: '12px', color: 'var(--text-secondary)' },
  submitBtn: { background: 'linear-gradient(135deg, var(--accent-primary), #0ea5e9)', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', width: '100%', fontWeight: 700, marginTop: '8px', cursor: 'pointer' },
};
