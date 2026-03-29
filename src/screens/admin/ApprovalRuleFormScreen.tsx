import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Switch, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { UserRepo } from '../../repositories/UserRepo';
import { ApprovalRuleRepo } from '../../repositories/ApprovalRepo';
import { User } from '../../types';

interface ApproverEntry {
  user_id: number;
  name: string;
  required: boolean;
}

export default function ApprovalRuleFormScreen({ navigation, route }: any) {
  const { session } = useAuth();
  const existingRule = route.params?.rule ?? null;

  const [users, setUsers] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [description, setDescription] = useState('');
  const [selectedManager, setSelectedManager] = useState<User | null>(null);
  const [managerIsApprover, setManagerIsApprover] = useState(false);
  const [sequential, setSequential] = useState(true);
  const [minApprovalPct, setMinApprovalPct] = useState('100');
  const [approvers, setApprovers] = useState<ApproverEntry[]>([]);

  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showManagerPicker, setShowManagerPicker] = useState(false);
  const [showApproverPicker, setShowApproverPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!session) return;
      const all = await UserRepo.findByCompany(session.company_id);
      setUsers(all.filter(u => u.role !== 'admin'));
      setManagers(all.filter(u => u.role !== 'employee'));
    };
    load();
  }, [session]);

  const addApprover = (user: User) => {
    if (approvers.some(a => a.user_id === user.id)) {
      Alert.alert('Already Added', 'This user is already in the approvers list.');
      return;
    }
    setApprovers(prev => [...prev, { user_id: user.id, name: user.name, required: false }]);
    setShowApproverPicker(false);
  };

  const removeApprover = (userId: number) => {
    setApprovers(prev => prev.filter(a => a.user_id !== userId));
  };

  const toggleRequired = (userId: number) => {
    setApprovers(prev => prev.map(a => a.user_id === userId ? { ...a, required: !a.required } : a));
  };

  const handleSave = async () => {
    if (!selectedUser) { Alert.alert('Required', 'Select the employee this rule applies to.'); return; }
    if (!selectedManager) { Alert.alert('Required', 'Select a manager for this rule.'); return; }
    const pct = parseFloat(minApprovalPct);
    if (isNaN(pct) || pct < 0 || pct > 100) { Alert.alert('Invalid', 'Minimum approval % must be between 0–100.'); return; }

    setSaving(true);
    try {
      const ruleId = await ApprovalRuleRepo.create({
        company_id: session!.company_id,
        user_id: selectedUser.id,
        description: description.trim() || `Approval rule for ${selectedUser.name}`,
        manager_id: selectedManager.id,
        manager_is_approver: managerIsApprover,
        sequential,
        min_approval_percentage: pct,
      });

      for (let i = 0; i < approvers.length; i++) {
        await ApprovalRuleRepo.addApprover({
          rule_id: ruleId,
          user_id: approvers[i].user_id,
          order_index: i,
          required: approvers[i].required,
        });
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const UserPickerModal = ({ visible, onClose, onSelect, data, title }: any) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(u: User) => String(u.id)}
            renderItem={({ item }: { item: User }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => { onSelect(item); onClose(); }}>
                <View style={styles.pickerAvatar}>
                  <Text style={styles.pickerAvatarText}>{item.name[0].toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  <Text style={styles.pickerItemSub}>{item.email} · {item.role}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rule Details</Text>

          <Text style={styles.label}>Employee (this rule applies to)</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setShowUserPicker(true)} activeOpacity={0.8}>
            <Text style={selectedUser ? styles.selectorValue : styles.selectorPlaceholder}>
              {selectedUser ? `${selectedUser.name} — ${selectedUser.email}` : 'Select employee...'}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Approval rule for travel expenses"
            placeholderTextColor={Colors.text.muted}
          />

          <Text style={styles.label}>Manager (dynamic — overrides user's default)</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setShowManagerPicker(true)} activeOpacity={0.8}>
            <Text style={selectedManager ? styles.selectorValue : styles.selectorPlaceholder}>
              {selectedManager ? selectedManager.name : 'Select manager...'}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Approvers</Text>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.label}>Is Manager an Approver?</Text>
              <Text style={styles.hint}>If on, request goes to manager first before other approvers.</Text>
            </View>
            <Switch
              value={managerIsApprover}
              onValueChange={setManagerIsApprover}
              trackColor={{ true: Colors.accent.primary, false: Colors.border.default }}
              thumbColor={Colors.white}
            />
          </View>

          <Text style={styles.label}>Additional Approvers</Text>
          {approvers.map((a, i) => (
            <View key={a.user_id} style={styles.approverRow}>
              <View style={styles.approverIndex}>
                <Text style={styles.approverIndexText}>{i + 1}</Text>
              </View>
              <Text style={styles.approverName}>{a.name}</Text>
              <View style={styles.approverRight}>
                <Text style={styles.requiredLabel}>Required</Text>
                <Switch
                  value={a.required}
                  onValueChange={() => toggleRequired(a.user_id)}
                  trackColor={{ true: Colors.status.error, false: Colors.border.default }}
                  thumbColor={Colors.white}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
                <TouchableOpacity onPress={() => removeApprover(a.user_id)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addApproverBtn} onPress={() => setShowApproverPicker(true)} activeOpacity={0.8}>
            <Text style={styles.addApproverText}>+ Add Approver</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Approval Logic</Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Approvers Sequence</Text>
              <Text style={styles.hint}>
                {sequential
                  ? 'Sequential: next approver only notified after current one acts.'
                  : 'Parallel: all approvers notified at the same time.'}
              </Text>
            </View>
            <Switch
              value={sequential}
              onValueChange={setSequential}
              trackColor={{ true: Colors.accent.primary, false: Colors.border.default }}
              thumbColor={Colors.white}
            />
          </View>

          <Text style={styles.label}>Minimum Approval Percentage</Text>
          <Text style={styles.hint}>
            E.g. 60 means 60% of approvers must approve. 100 = all must approve. 0 = any single approval suffices.
          </Text>
          <View style={styles.pctRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={minApprovalPct}
              onChangeText={setMinApprovalPct}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={Colors.text.muted}
            />
            <Text style={styles.pctSign}>%</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Save Rule</Text>}
        </TouchableOpacity>
      </ScrollView>

      <UserPickerModal visible={showUserPicker} title="Select Employee" data={users}
        onClose={() => setShowUserPicker(false)} onSelect={(u: User) => setSelectedUser(u)} />
      <UserPickerModal visible={showManagerPicker} title="Select Manager" data={managers}
        onClose={() => setShowManagerPicker(false)} onSelect={(u: User) => setSelectedManager(u)} />
      <UserPickerModal visible={showApproverPicker} title="Add Approver" data={users}
        onClose={() => setShowApproverPicker(false)} onSelect={addApprover} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing[4], paddingBottom: Spacing[10] },
  section: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: Spacing[4],
    marginBottom: Spacing[4], borderWidth: 1, borderColor: Colors.border.default,
  },
  sectionTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing[4] },
  label: { fontSize: Typography.size.sm, color: Colors.text.secondary, fontWeight: Typography.weight.medium, marginBottom: 6 },
  hint: { fontSize: Typography.size.xs, color: Colors.text.muted, marginBottom: Spacing[3], lineHeight: 16 },
  input: {
    backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: Radius.md, padding: Spacing[3], color: Colors.text.primary, fontSize: Typography.size.base,
    marginBottom: Spacing[4],
  },
  selector: {
    backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: Radius.md, padding: Spacing[3], flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing[4],
  },
  selectorValue: { fontSize: Typography.size.base, color: Colors.text.primary, flex: 1 },
  selectorPlaceholder: { fontSize: Typography.size.base, color: Colors.text.muted, flex: 1 },
  chevron: { color: Colors.text.muted, fontSize: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] },
  approverRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg.elevated,
    borderRadius: Radius.md, padding: Spacing[3], marginBottom: Spacing[2], gap: Spacing[2],
  },
  approverIndex: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.accent.light,
    alignItems: 'center', justifyContent: 'center',
  },
  approverIndexText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.accent.secondary },
  approverName: { flex: 1, fontSize: Typography.size.base, color: Colors.text.primary },
  approverRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  requiredLabel: { fontSize: Typography.size.xs, color: Colors.text.muted },
  removeBtn: { padding: 4 },
  removeBtnText: { color: Colors.status.error, fontSize: 14, fontWeight: Typography.weight.bold },
  addApproverBtn: {
    borderWidth: 1, borderColor: Colors.accent.border, borderRadius: Radius.md,
    padding: Spacing[3], alignItems: 'center', borderStyle: 'dashed',
  },
  addApproverText: { color: Colors.accent.secondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  pctSign: { fontSize: Typography.size.xl, color: Colors.text.secondary, fontWeight: Typography.weight.bold },
  saveBtn: {
    backgroundColor: Colors.accent.primary, borderRadius: Radius.md, padding: Spacing[4],
    alignItems: 'center', marginTop: Spacing[2],
    shadowColor: Colors.accent.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  saveBtnText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  overlay: { flex: 1, backgroundColor: Colors.bg.overlay, justifyContent: 'flex-end' },
  pickerCard: { backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing[5], maxHeight: '70%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] },
  pickerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  closeBtn: { fontSize: 18, color: Colors.text.secondary },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border.subtle, gap: Spacing[3] },
  pickerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accent.light, alignItems: 'center', justifyContent: 'center' },
  pickerAvatarText: { fontWeight: Typography.weight.bold, color: Colors.accent.secondary },
  pickerItemName: { fontSize: Typography.size.base, color: Colors.text.primary, fontWeight: Typography.weight.medium },
  pickerItemSub: { fontSize: Typography.size.xs, color: Colors.text.muted },
});
