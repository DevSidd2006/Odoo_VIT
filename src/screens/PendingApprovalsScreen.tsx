import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { Expense } from '../types';

export default function PendingApprovalsScreen() {
  const { user } = useAuth();
  const { getPendingForApproval, approveExpense, rejectExpense } = useExpenses();
  const pending = getPendingForApproval();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (expense: Expense) => {
    Alert.alert(
      'Approve Expense',
      `Approve ${expense.employeeName}'s expense of ${expense.currency} ${expense.amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
             await approveExpense(String(expense.id), user?.name || '');
            Alert.alert('Success', 'Expense approved');
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    await rejectExpense(rejectingId, rejectReason);
    setRejectingId(null);
    setRejectReason('');
    Alert.alert('Success', 'Expense rejected');
  };

  const ExpenseCard = ({ expense }: { expense: Expense }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.employee}>{expense.employeeName}</Text>
          <Text style={styles.category}>{expense.category}</Text>
        </View>
        <Text style={styles.amount}>
          {expense.currency} {expense.amount.toFixed(2)}
        </Text>
      </View>

      <Text style={styles.description}>{expense.description}</Text>
      <Text style={styles.date}>Submitted: {expense.date}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.rejectButton]}
           onPress={() => setRejectingId(String(expense.id))}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.approveButton]}
          onPress={() => handleApprove(expense)}
        >
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={pending}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>No pending expenses</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        }
      />

      <Modal
        visible={!!rejectingId}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Reject Expense</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => {
                  setRejectingId(null);
                  setRejectReason('');
                }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalReject]}
                onPress={handleReject}
                disabled={!rejectReason.trim()}
              >
                <Text style={styles.modalRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  employee: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  category: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  approveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  rejectButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: '#f5f5f5',
  },
  modalReject: {
    backgroundColor: '#F44336',
  },
  modalRejectText: {
    color: 'white',
    fontWeight: '600',
  },
});
