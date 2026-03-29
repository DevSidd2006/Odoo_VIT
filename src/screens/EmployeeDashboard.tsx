import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';

export default function EmployeeDashboard({ navigation }: any) {
  const { user, logout } = useAuth();
  const { getMyExpenses } = useExpenses();

  const myExpenses = getMyExpenses();
  const pendingCount = myExpenses.filter(e => e.status === 'pending').length;
  const approvedCount = myExpenses.filter(e => e.status === 'approved').length;
  const totalAmount = myExpenses
    .filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name}!</Text>
        <Text style={styles.role}>Employee</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.statNumber}>{approvedCount}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.statNumber}>${totalAmount.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Reimbursed</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('SubmitExpense')}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>Submit Expense</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('MyExpenses')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>My Expenses</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  role: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  logoutButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#C62828',
    fontWeight: '600',
  },
});
