import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { UserRepo } from '../../repositories/UserRepo';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await UserRepo.findByEmail(email.trim().toLowerCase());
      if (!user || user.password !== password) {
        Alert.alert('Login Failed', 'Invalid email or password.');
        return;
      }
      await signIn({
        user_id: user.id,
        company_id: user.company_id,
        role: user.role,
        name: user.name,
        email: user.email,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>💸</Text>
          </View>
          <Text style={styles.appName}>ReimburseFlow</Text>
          <Text style={styles.tagline}>Smart expense management</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor={Colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.text.muted}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.loginBtnText}>Login</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.linkRow}>
            <Text style={styles.linkText}>Don't have an account? </Text>
            <Text style={styles.linkAccent}>Sign up</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.linkRow}>
            <Text style={styles.linkAccent}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { flexGrow: 1, padding: Spacing[6], justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: Spacing[8] },
  logoIcon: {
    width: 80, height: 80, borderRadius: Radius.xl,
    backgroundColor: Colors.accent.light, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing[3],
    shadowColor: Colors.accent.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20,
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: Colors.text.primary },
  tagline: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginTop: 4 },
  card: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.xl,
    padding: Spacing[6], borderWidth: 1, borderColor: Colors.border.default,
  },
  cardTitle: {
    fontSize: Typography.size.xl, fontWeight: Typography.weight.bold,
    color: Colors.text.primary, marginBottom: Spacing[5],
  },
  fieldGroup: { marginBottom: Spacing[4] },
  label: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginBottom: 6, fontWeight: Typography.weight.medium },
  input: {
    backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: Radius.md, padding: Spacing[4], color: Colors.text.primary,
    fontSize: Typography.size.base,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: Spacing[3] },
  eyeText: { fontSize: 18 },
  loginBtn: {
    backgroundColor: Colors.accent.primary, borderRadius: Radius.md,
    padding: Spacing[4], alignItems: 'center', marginTop: Spacing[2],
    shadowColor: Colors.accent.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  divider: { height: 1, backgroundColor: Colors.border.subtle, marginVertical: Spacing[4] },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing[2] },
  linkText: { color: Colors.text.secondary, fontSize: Typography.size.sm },
  linkAccent: { color: Colors.accent.secondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
});
