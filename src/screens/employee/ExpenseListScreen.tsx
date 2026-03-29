import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { ExpenseRepo } from '../../repositories/ExpenseRepo';
import { ExpenseWithDetails, ExpenseStatus } from '../../types';

const STATUS_CONFIG: Record<ExpenseStatus, { label: string; color: string; bg: string }> = {
  draft:            { label: 'Draft',            color: Colors.text.muted,         bg: Colors.bg.elevated },
  submitted:        { label: 'Submitted',        color: Colors.status.info,         bg: Colors.status.infoBg },
  waiting_approval: { label: 'Waiting',          color: Colors.status.warning,      bg: Colors.status.warningBg },
  approved:         { label: 'Approved',         color: Colors.status.success,      bg: Colors.status.successBg },
  rejected:         { label: 'Rejected',         color: Colors.status.error,        bg: Colors.status.errorBg },
  pending:          { label: 'Pending',          color: Colors.status.warning,      bg: Colors.status.warningBg },
};

export default function ExpenseListScreen({ navigation }: any) {
  const { session } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [summary, setSummary] = useState({ to_submit: 0, waiting: 0, approved: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await ExpenseRepo.findByEmployee(session.user_id);
      const sum = await ExpenseRepo.getSummaryByEmployee(session.user_id);
      setExpenses(data);
      setSummary(sum);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const currency = session?.role ? '₹' : '$'; // Will be enhanced with company currency

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: Colors.status.warning }]}>
          <Text style={styles.summaryAmount}>{summary.to_submit.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>To Submit</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: Colors.status.info }]}>
          <Text style={styles.summaryAmount}>{summary.waiting.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Waiting</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: Colors.status.success }]}>
          <Text style={styles.summaryAmount}>{summary.approved.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <Text style={styles.sectionTitle}>My Expenses</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('ExpenseForm', { expense: null })}
          activeOpacity={0.8}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={e => String(e.id)}
          contentContainerStyle={{ padding: Spacing[4], paddingTop: 0 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.accent.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptyHint}>Tap "+ New" to create your first expense report.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const status = STATUS_CONFIG[item.status];
            return (
              <TouchableOpacity
                style={styles.expenseCard}
                onPress={() => navigation.navigate('ExpenseForm', { expense: item })}
                activeOpacity={0.85}
              >
                <View style={styles.expenseLeft}>
                  <Text style={styles.categoryIcon}>{item.category_icon ?? '📦'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseDesc} numberOfLines={1}>
                      {item.description || '(No description)'}
                    </Text>
                    <Text style={styles.expenseMeta}>
                      {item.category_name} · {item.expense_date?.slice(0, 10)}
                    </Text>
                  </View>
                </View>
                <View style={styles.expenseRight}>
                  <Text style={styles.expenseAmount}>
                    {item.currency} {item.amount?.toFixed(2)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  summaryRow: { flexDirection: 'row', padding: Spacing[4], gap: Spacing[3] },
  summaryCard: {
    flex: 1, backgroundColor: Colors.bg.card, borderRadius: Radius.lg,
    padding: Spacing[3], alignItems: 'center', borderWidth: 1,
  },
  summaryAmount: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  summaryLabel: { fontSize: Typography.size.xs, color: Colors.text.muted, marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing[4], marginBottom: Spacing[3] },
  sectionTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  newBtn: { backgroundColor: Colors.accent.primary, borderRadius: Radius.md, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] },
  newBtnText: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  expenseCard: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: Spacing[4],
    marginBottom: Spacing[3], borderWidth: 1, borderColor: Colors.border.default,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing[3] },
  categoryIcon: { fontSize: 28 },
  expenseDesc: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  expenseMeta: { fontSize: Typography.size.xs, color: Colors.text.muted, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end', gap: Spacing[1] },
  expenseAmount: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing[3] },
  emptyText: { fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold, color: Colors.text.primary, marginBottom: Spacing[2] },
  emptyHint: { fontSize: Typography.size.sm, color: Colors.text.muted, textAlign: 'center' },
});
