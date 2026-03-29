import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useExpenses } from '../context/ExpenseContext';
import { Expense } from '../types';

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    pending: '#FF9800',
    approved: '#4CAF50',
    rejected: '#F44336',
  };

  return (
    <View style={[styles.badge, { backgroundColor: colors[status] + '20' }]}>
      <Text style={[styles.badgeText, { color: colors[status] }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
};

const ExpenseItem = ({ expense }: { expense: Expense }) => (
  <View style={styles.expenseCard}>
    <View style={styles.expenseHeader}>
      <Text style={styles.category}>{expense.category}</Text>
      <StatusBadge status={expense.status} />
    </View>
    <Text style={styles.description}>{expense.description}</Text>
    <View style={styles.expenseFooter}>
      <Text style={styles.amount}>
        {expense.currency} {expense.amount.toFixed(2)}
      </Text>
      <Text style={styles.date}>{expense.date}</Text>
    </View>
    {expense.rejectionReason && (
      <Text style={styles.rejectionText}>
        Reason: {expense.rejectionReason}
      </Text>
    )}
  </View>
);

export default function MyExpensesScreen() {
  const { getMyExpenses } = useExpenses();
  const expenses = getMyExpenses();

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExpenseItem expense={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Submit your first expense to get started</Text>
          </View>
        }
      />
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
  expenseCard: {
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
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  rejectionText: {
    marginTop: 8,
    fontSize: 13,
    color: '#F44336',
    fontStyle: 'italic',
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
});
