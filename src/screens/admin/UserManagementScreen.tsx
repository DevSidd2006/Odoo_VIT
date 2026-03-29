import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { UserRepo, generatePassword } from '../../repositories/UserRepo';
import { UserWithManager, UserRole } from '../../types';

const ROLES: UserRole[] = ['employee', 'manager', 'admin'];

export default function UserManagementScreen({ navigation }: any) {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserWithManager[]>([]);
  const [managers, setManagers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'employee' as UserRole, manager_id: null as number | null });
  const [saving, setSaving] = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ name: string; pw: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const raw = await UserRepo.findByCompany(session.company_id);
      const mgrs = await UserRepo.findManagersByCompany(session.company_id);
      const withManagers: UserWithManager[] = raw.map(u => ({
        ...u,
        manager_name: mgrs.find(m => m.id === u.manager_id)?.name ?? null,
      }));
      setUsers(withManagers);
      setManagers(mgrs.map(m => ({ id: m.id, name: m.name })));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert('Required', 'Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      const pw = generatePassword();
      await UserRepo.create({
        company_id: session!.company_id,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: pw,
        role: form.role,
        manager_id: form.manager_id,
      });
      setShowModal(false);
      setForm({ name: '', email: '', role: 'employee', manager_id: null });
      await refresh();
      Alert.alert('User Created', `Password for ${form.name}: ${pw}\n\nSave this — it won't be shown again.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendPassword = async (user: UserWithManager) => {
    const pw = generatePassword();
    await UserRepo.updatePassword(user.id, pw);
    setPasswordResult({ name: user.name, pw });
  };

  const roleColor = (role: UserRole) => {
    if (role === 'admin') return Colors.role.admin;
    if (role === 'manager') return Colors.role.manager;
    return Colors.role.employee;
  };
  const roleBg = (role: UserRole) => {
    if (role === 'admin') return Colors.role.adminBg;
    if (role === 'manager') return Colors.role.managerBg;
    return Colors.role.employeeBg;
  };

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Team Members</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ New User</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => String(u.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.accent.primary} />}
          contentContainerStyle={{ padding: Spacing[4] }}
          ListEmptyComponent={<Text style={styles.empty}>No users yet. Add your first team member.</Text>}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userCardLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: roleBg(item.role) }]}>
                      <Text style={[styles.roleText, { color: roleColor(item.role) }]}>{item.role}</Text>
                    </View>
                  </View>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  {item.manager_name && (
                    <Text style={styles.managerText}>👤 Manager: {item.manager_name}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.sendPwBtn}
                onPress={() => handleSendPassword(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.sendPwText}>🔑 Send PW</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Create User Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New User</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {[
              { label: 'Full Name', key: 'name', placeholder: 'e.g. John Doe' },
              { label: 'Email', key: 'email', placeholder: 'john@company.com', keyboard: 'email-address' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.text.muted}
                  keyboardType={f.keyboard as any}
                  autoCapitalize="none"
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.roleRow}>
                {ROLES.filter(r => r !== 'admin').map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleOption, form.role === r && styles.roleOptionActive]}
                    onPress={() => setForm(p => ({ ...p, role: r }))}
                  >
                    <Text style={[styles.roleOptionText, form.role === r && styles.roleOptionTextActive]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Manager</Text>
              <View style={styles.managerOptions}>
                <TouchableOpacity
                  style={[styles.roleOption, !form.manager_id && styles.roleOptionActive]}
                  onPress={() => setForm(p => ({ ...p, manager_id: null }))}
                >
                  <Text style={[styles.roleOptionText, !form.manager_id && styles.roleOptionTextActive]}>None</Text>
                </TouchableOpacity>
                {managers.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.roleOption, form.manager_id === m.id && styles.roleOptionActive]}
                    onPress={() => setForm(p => ({ ...p, manager_id: m.id }))}
                  >
                    <Text style={[styles.roleOptionText, form.manager_id === m.id && styles.roleOptionTextActive]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createBtn, saving && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.createBtnText}>Create User</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Result Modal */}
      <Modal visible={!!passwordResult} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔑 New Password</Text>
            <Text style={styles.pwResultName}>{passwordResult?.name}</Text>
            <View style={styles.pwBox}>
              <Text style={styles.pwText}>{passwordResult?.pw}</Text>
            </View>
            <Text style={styles.pwHint}>Share this password with the user. They should log in and note it down.</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => setPasswordResult(null)} activeOpacity={0.85}>
              <Text style={styles.createBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing[4], paddingBottom: 0 },
  pageTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  addBtn: { backgroundColor: Colors.accent.primary, borderRadius: Radius.md, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] },
  addBtnText: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  empty: { color: Colors.text.muted, textAlign: 'center', marginTop: 40, fontSize: Typography.size.base },
  userCard: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: Spacing[4],
    marginBottom: Spacing[3], borderWidth: 1, borderColor: Colors.border.default,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing[3] },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent.light, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: Typography.weight.bold, color: Colors.accent.secondary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: 3 },
  userName: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  roleBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  roleText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, textTransform: 'capitalize' },
  userEmail: { fontSize: Typography.size.sm, color: Colors.text.secondary },
  managerText: { fontSize: Typography.size.xs, color: Colors.text.muted, marginTop: 2 },
  sendPwBtn: {
    backgroundColor: Colors.bg.elevated, borderRadius: Radius.md,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderWidth: 1, borderColor: Colors.border.default,
  },
  sendPwText: { fontSize: Typography.size.xs, color: Colors.text.accent, fontWeight: Typography.weight.medium },
  overlay: { flex: 1, backgroundColor: Colors.bg.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'],
    padding: Spacing[6], paddingBottom: Spacing[8],
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[5] },
  modalTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  closeBtn: { fontSize: 18, color: Colors.text.secondary, padding: 4 },
  field: { marginBottom: Spacing[4] },
  fieldLabel: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginBottom: 6, fontWeight: Typography.weight.medium },
  input: {
    backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: Radius.md, padding: Spacing[4], color: Colors.text.primary, fontSize: Typography.size.base,
  },
  roleRow: { flexDirection: 'row', gap: Spacing[2] },
  managerOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  roleOption: {
    borderWidth: 1, borderColor: Colors.border.default, borderRadius: Radius.md,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
  },
  roleOptionActive: { borderColor: Colors.accent.primary, backgroundColor: Colors.accent.light },
  roleOptionText: { fontSize: Typography.size.sm, color: Colors.text.secondary },
  roleOptionTextActive: { color: Colors.accent.secondary, fontWeight: Typography.weight.semibold },
  createBtn: {
    backgroundColor: Colors.accent.primary, borderRadius: Radius.md, padding: Spacing[4],
    alignItems: 'center', marginTop: Spacing[2],
  },
  createBtnText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  pwResultName: { fontSize: Typography.size.base, color: Colors.text.secondary, marginBottom: Spacing[3] },
  pwBox: {
    backgroundColor: Colors.bg.elevated, borderRadius: Radius.md, padding: Spacing[4],
    alignItems: 'center', marginBottom: Spacing[3], borderWidth: 1, borderColor: Colors.accent.border,
  },
  pwText: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.accent.secondary, letterSpacing: 3 },
  pwHint: { fontSize: Typography.size.xs, color: Colors.text.muted, lineHeight: 18, marginBottom: Spacing[4] },
});
