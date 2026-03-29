import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (!success) {
      Alert.alert('Error', 'Invalid credentials. Try:\nadmin@company.com\nmanager@company.com\nemployee@company.com');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expense Reimbursement</Text>
      <Text style={styles.subtitle}>Login to your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>

      <View style={styles.demoBox}>
        <Text style={styles.demoTitle}>Demo Accounts:</Text>
        <Text style={styles.demoText}>admin@company.com</Text>
        <Text style={styles.demoText}>manager@company.com</Text>
        <Text style={styles.demoText}>employee@company.com</Text>
        <Text style={styles.demoHint}>(Any password works)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  demoBox: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#e8f4f8',
    borderRadius: 12,
  },
  demoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0066cc',
  },
  demoText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  demoHint: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
