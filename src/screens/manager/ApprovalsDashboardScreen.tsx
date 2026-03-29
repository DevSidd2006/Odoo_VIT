import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { ApprovalRequestWithDetails } from '../../types';
import { ApprovalRequestRepo } from '../../repositories/ApprovalRepo';
import { CurrencyService } from '../../services/CurrencyService';
import { ApprovalService } from '../../services/ApprovalService';

type DashboardRow = ApprovalRequestWithDetails & {
  convertedAmount: number;
  convertedLabel: string;
  sourceLabel: string;
  fxMetaLabel: string;
  decisionInsight?: string;
};

export default function ApprovalsDashboardScreen() {
  const { session } = useAuth();
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [decisionTarget, setDecisionTarget] = useState<DashboardRow | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');
  const [decisionComment, setDecisionComment] = useState('');
  const [acting, setActing] = useState(false);

  const pendingCount = useMemo(() => rows.length, [rows]);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
        const pending = await ApprovalRequestRepo.findPendingByApprover(session.user_id);
        const ratesByBase = new Map<string, Awaited<ReturnType<typeof CurrencyService.getRates>>>();

      const normalized: DashboardRow[] = [];
      for (const request of pending) {
        const baseCurrency = request.company_base_currency ?? request.expense_currency ?? 'USD';
        const sourceCurrency = request.expense_currency ?? baseCurrency;
        const sourceAmount = request.expense_amount ?? 0;

          let convertedAmount = sourceAmount;
          let fxMetaLabel = 'FX parity';
          if (sourceCurrency !== baseCurrency) {
            if (!ratesByBase.has(baseCurrency)) {
              ratesByBase.set(baseCurrency, await CurrencyService.getRates(baseCurrency));
            }
            const rates = ratesByBase.get(baseCurrency)!;
            convertedAmount = CurrencyService.convert(sourceAmount, sourceCurrency, baseCurrency, rates);
            const source = rates.source === 'live_api' ? 'live' : rates.is_stale ? 'stale cache' : 'cache';
            fxMetaLabel = `${rates.provider ?? 'FX'} • ${new Date(rates.fetched_at).toLocaleString()} • ${source}`;
          }

          const trail = await ApprovalService.getExpenseDecisionTrail(request.expense_id);
          const insight = trail.explanation
            ? `${Math.round(trail.explanation.approvalPercent)}% approvals • ${trail.explanation.reason}`
            : undefined;

          normalized.push({
            ...request,
            convertedAmount,
            convertedLabel: CurrencyService.format(convertedAmount, baseCurrency),
            sourceLabel: CurrencyService.format(sourceAmount, sourceCurrency),
            fxMetaLabel,
            decisionInsight: insight,
          });
        }

      setRows(normalized);
    } catch (error: any) {
      Alert.alert('Load failed', error?.message ?? 'Unable to load pending approvals.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const openDecisionModal = (row: DashboardRow, type: 'approved' | 'rejected') => {
    setDecisionTarget(row);
    setDecisionType(type);
    setDecisionComment('');
  };

  const submitDecision = async () => {
    if (!decisionTarget) return;
    if (decisionType === 'rejected' && !decisionComment.trim()) {
      Alert.alert('Comment required', 'Add a rejection comment for audit trail.');
      return;
    }

    setActing(true);
    try {
      await ApprovalService.processDecision(
        decisionTarget.id,
        decisionType,
        decisionTarget.expense_id,
        decisionTarget.rule_id,
        decisionComment
      );

      setDecisionTarget(null);
      setDecisionComment('');
      await refresh();
    } catch (error: any) {
      Alert.alert('Action failed', error?.message ?? 'Could not apply approval decision.');
    } finally {
      setActing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Pending approvals</Text>
        <Text style={styles.headerCount}>{pendingCount}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing[8] }} color={Colors.accent.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.accent.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>No pending approvals</Text>
              <Text style={styles.emptyHint}>All requests assigned to you are complete.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.employeeName}>{item.employee_name ?? 'Employee'}</Text>
                  <Text style={styles.metaText}>{item.category_name ?? 'Uncategorized'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amountText}>{item.convertedLabel}</Text>
                  {item.sourceLabel !== item.convertedLabel ? <Text style={styles.sourceAmount}>{item.sourceLabel}</Text> : null}
                </View>
              </View>

                <Text style={styles.descriptionText}>{item.expense_description || '(No description)'}</Text>
                <Text style={styles.infoText}>{item.fxMetaLabel}</Text>
                {item.decisionInsight ? <Text style={styles.infoText}>{item.decisionInsight}</Text> : null}

                <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => openDecisionModal(item, 'rejected')}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => openDecisionModal(item, 'approved')}
                >
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={Boolean(decisionTarget)} transparent animationType="slide" onRequestClose={() => setDecisionTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{decisionType === 'approved' ? 'Approve Request' : 'Reject Request'}</Text>
            <Text style={styles.modalHint}>Comment is persisted in approval audit trail.</Text>
            <TextInput
              style={styles.commentInput}
              value={decisionComment}
              onChangeText={setDecisionComment}
              placeholder={decisionType === 'approved' ? 'Optional comment' : 'Reason for rejection'}
              placeholderTextColor={Colors.text.muted}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => {
                  if (acting) return;
                  setDecisionTarget(null);
                  setDecisionComment('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, decisionType === 'approved' ? styles.approveBtn : styles.rejectBtn, acting && styles.disabled]}
                onPress={submitDecision}
                disabled={acting}
              >
                <Text style={decisionType === 'approved' ? styles.approveText : styles.rejectText}>
                  {acting ? 'Saving...' : decisionType === 'approved' ? 'Approve' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  headerCard: {
    margin: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
    padding: Spacing[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: Colors.text.secondary, fontSize: Typography.size.sm },
  headerCount: { color: Colors.text.primary, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold },
  listContent: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[8] },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing[3] },
  employeeName: { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold },
  metaText: { color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 2 },
  amountText: { color: Colors.accent.secondary, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  sourceAmount: { color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 2 },
  descriptionText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    marginTop: Spacing[3],
    marginBottom: Spacing[2],
  },
  infoText: { color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: 4 },
  buttonRow: { flexDirection: 'row', gap: Spacing[2] },
  actionBtn: { flex: 1, alignItems: 'center', borderRadius: Radius.md, paddingVertical: Spacing[3] },
  approveBtn: { backgroundColor: Colors.status.successBg, borderWidth: 1, borderColor: Colors.status.success },
  rejectBtn: { backgroundColor: Colors.status.errorBg, borderWidth: 1, borderColor: Colors.status.error },
  approveText: { color: Colors.status.success, fontWeight: Typography.weight.semibold, fontSize: Typography.size.sm },
  rejectText: { color: Colors.status.error, fontWeight: Typography.weight.semibold, fontSize: Typography.size.sm },
  emptyState: { alignItems: 'center', marginTop: Spacing[10] },
  emptyIcon: { fontSize: 42, marginBottom: Spacing[2] },
  emptyTitle: { color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold },
  emptyHint: { color: Colors.text.muted, fontSize: Typography.size.sm, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: Colors.bg.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: Spacing[4],
  },
  modalTitle: { color: Colors.text.primary, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  modalHint: { color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 4, marginBottom: Spacing[3] },
  commentInput: {
    borderColor: Colors.border.default,
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.elevated,
    color: Colors.text.primary,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    minHeight: 96,
    textAlignVertical: 'top',
    marginBottom: Spacing[3],
  },
  modalActions: { flexDirection: 'row', gap: Spacing[2] },
  modalBtn: { flex: 1, alignItems: 'center', borderRadius: Radius.md, paddingVertical: Spacing[3] },
  modalCancel: { backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.default },
  modalCancelText: { color: Colors.text.secondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  disabled: { opacity: 0.6 },
});
