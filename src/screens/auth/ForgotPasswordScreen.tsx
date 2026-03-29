import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { UserRepo, generatePassword } from '../../repositories/UserRepo';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string; newPassword: string } | null>(null);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const user = await UserRepo.findByEmail(email.trim().toLowerCase());
      if (!user) {
        Alert.alert('Not Found', 'No account found with that email.');
        return;
      }
      const newPassword = generatePassword();
      await UserRepo.updatePassword(user.id, newPassword);
      setResult({ name: user.name, newPassword });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <View style={styles.card}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.cardTitle}>Password Reset</Text>
          <Text style={styles.successText}>Hi {result.name}! Your new temporary password is:</Text>
          <View style={styles.passwordBox}>
            <Text style={styles.passwordText}>{result.newPassword}</Text>
          </View>
          <Text style={styles.hintText}>
            Please copy this password and use it to log in. You can change it later from your profile.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={styles.btnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll generate a new temporary password for you.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor={Colors.text.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Send New Password</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkRow}>
          <Text style={styles.linkAccent}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { flexGrow: 1, padding: Spacing[6], justifyContent: 'center' },
  card: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.xl,
    padding: Spacing[6], borderWidth: 1, borderColor: Colors.border.default,
  },
  successIcon: { fontSize: 48, textAlign: 'center', marginBottom: Spacing[3] },
  cardTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing[3] },
  subtitle: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginBottom: Spacing[5], lineHeight: 20 },
  fieldGroup: { marginBottom: Spacing[4] },
  label: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginBottom: 6, fontWeight: Typography.weight.medium },
  input: {
    backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: Radius.md, padding: Spacing[4], color: Colors.text.primary, fontSize: Typography.size.base,
  },
  btn: {
    backgroundColor: Colors.accent.primary, borderRadius: Radius.md, padding: Spacing[4],
    alignItems: 'center', marginTop: Spacing[2], marginBottom: Spacing[4],
    shadowColor: Colors.accent.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  btnText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  linkRow: { alignItems: 'center' },
  linkAccent: { color: Colors.accent.secondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  successText: { color: Colors.text.secondary, fontSize: Typography.size.sm, marginBottom: Spacing[4], lineHeight: 20 },
  passwordBox: {
    backgroundColor: Colors.bg.elevated, borderRadius: Radius.md, padding: Spacing[4],
    borderWidth: 1, borderColor: Colors.accent.border, alignItems: 'center', marginBottom: Spacing[4],
  },
  passwordText: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.accent.secondary, letterSpacing: 2 },
  hintText: { fontSize: Typography.size.xs, color: Colors.text.muted, lineHeight: 18, marginBottom: Spacing[4] },
});
