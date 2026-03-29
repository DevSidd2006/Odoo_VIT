import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { ApprovalRuleRepo } from '../../repositories/ApprovalRepo';
import { UserRepo } from '../../repositories/UserRepo';

export default function ApprovalRulesScreen({ navigation }: any) {
  const { session } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await ApprovalRuleRepo.findByCompany(session.company_id);
      setRules(data);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleDelete = (id: number) => {
    Alert.alert('Delete Rule', 'Are you sure you want to delete this approval rule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await ApprovalRuleRepo.delete(id);
          refresh();
        }
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Approval Rules</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('ApprovalRuleForm', { rule: null })}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ New Rule</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rules}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={{ padding: Spacing[4] }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.accent.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚙️</Text>
              <Text style={styles.emptyText}>No approval rules yet.</Text>
              <Text style={styles.emptyHint}>Create rules to define who approves expenses for each employee.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <View>
                  <Text style={styles.ruleName}>{item.description || 'Approval Rule'}</Text>
                  <Text style={styles.ruleUser}>👤 For: {item.user_name}</Text>
                </View>
                <View style={styles.ruleActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('ApprovalRuleForm', { rule: item })}
                  >
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.ruleTags}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.sequential ? '📋 Sequential' : '⚡ Parallel'}</Text>
                </View>
                {item.manager_is_approver ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>👔 Manager First</Text>
                  </View>
                ) : null}
                {item.min_approval_percentage < 100 ? (
                  <View style={[styles.tag, { backgroundColor: Colors.status.warningBg }]}> 
                    <Text style={[styles.tagText, { color: Colors.status.warning }]}> 
                      {item.min_approval_percentage}% threshold
                    </Text>
                  </View>
                ) : null}
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    {item.condition_mode === 'percentage'
                      ? '📊 Percentage'
                      : item.condition_mode === 'specific_approver'
                        ? '🎯 Specific approver'
                        : '🧠 Hybrid'}
                  </Text>
                </View>
                {item.specific_approver_name ? (
                  <View style={[styles.tag, { backgroundColor: Colors.accent.light }]}> 
                    <Text style={[styles.tagText, { color: Colors.accent.secondary }]}> 
                      👤 {item.specific_approver_name}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing[4], paddingBottom: 0 },
  pageTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  addBtn: { backgroundColor: Colors.accent.primary, borderRadius: Radius.md, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] },
  addBtnText: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  ruleCard: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: Spacing[4],
    marginBottom: Spacing[3], borderWidth: 1, borderColor: Colors.border.default,
  },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing[3] },
  ruleName: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  ruleUser: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginTop: 2 },
  ruleActions: { flexDirection: 'row', gap: Spacing[2], alignItems: 'center' },
  editBtn: { backgroundColor: Colors.accent.light, borderRadius: Radius.sm, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] },
  editBtnText: { fontSize: Typography.size.sm, color: Colors.accent.secondary, fontWeight: Typography.weight.medium },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 16 },
  ruleTags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  tag: { backgroundColor: Colors.bg.elevated, borderRadius: Radius.sm, paddingHorizontal: Spacing[2], paddingVertical: 3 },
  tagText: { fontSize: Typography.size.xs, color: Colors.text.secondary },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: Spacing[3] },
  emptyText: { fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold, color: Colors.text.primary, marginBottom: Spacing[2] },
  emptyHint: { fontSize: Typography.size.sm, color: Colors.text.muted, textAlign: 'center', paddingHorizontal: Spacing[8] },
});
