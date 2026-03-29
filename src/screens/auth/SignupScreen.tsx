import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, FlatList, Modal,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { CompanyRepo } from '../../repositories/CompanyRepo';
import { UserRepo } from '../../repositories/UserRepo';
import { useAuth } from '../../context/AuthContext';
import { COUNTRIES } from '../../utils/constants';
import { CurrencyService } from '../../services/CurrencyService';

export default function SignupScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [countries, setCountries] = useState(COUNTRIES);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [country, setCountry] = useState<{ name: string; currency: string; flag: string } | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  React.useEffect(() => {
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const data = await CurrencyService.fetchCountries();
        if (data.length > 0) {
          setCountries(data);
        }
      } catch (e) {
        console.warn('[Signup] Failed to load countries, using static fallback', e);
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleSignup = async () => {
    if (!name || !email || !password || !confirm || !country) {
      Alert.alert('Missing Fields', 'Please fill in all fields and select a country.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const existing = await UserRepo.findByEmail(email.trim().toLowerCase());
      if (existing) {
        Alert.alert('Email Taken', 'An account with this email already exists.');
        return;
      }

      const companyId = await CompanyRepo.create({
        name: `${name}'s Company`,
        country: country.name,
        base_currency: country.currency,
      });

      const userId = await UserRepo.create({
        company_id: companyId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'admin',
      });

      await signIn({ user_id: userId, company_id: companyId, role: 'admin', name: name.trim(), email: email.trim().toLowerCase() });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>1 admin user per company</Text>
        <Text style={styles.title}>Admin (company) Signup</Text>

        {[
          { label: 'Name', value: name, set: setName, placeholder: 'Your full name' },
          { label: 'Email', value: email, set: setEmail, placeholder: 'admin@company.com', keyboard: 'email-address' as const },
          { label: 'Password', value: password, set: setPassword, placeholder: '••••••••', secure: true },
          { label: 'Confirm Password', value: confirm, set: setConfirm, placeholder: '••••••••', secure: true },
        ].map(f => (
          <View key={f.label} style={styles.fieldGroup}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              value={f.value}
              onChangeText={f.set}
              placeholder={f.placeholder}
              placeholderTextColor={Colors.text.muted}
              secureTextEntry={f.secure}
              keyboardType={f.keyboard}
              autoCapitalize="none"
            />
          </View>
        ))}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Country Selection</Text>
          <Text style={styles.hint}>The selected country's currency is set as company's base currency.</Text>
          <TouchableOpacity style={styles.countryBtn} onPress={() => setShowCountryPicker(true)} activeOpacity={0.8}>
            <Text style={country ? styles.countryText : styles.countryPlaceholder}>
              {country ? `${country.flag}  ${country.name} (${country.currency})` : 'Select a country...'}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
        </View>

        {country && (
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>📌 Base currency: <Text style={styles.currencyBold}>{country.currency}</Text></Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkRow}>
          <Text style={styles.linkText}>Already have an account? </Text>
          <Text style={styles.linkAccent}>Login</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="Search countries..."
              placeholderTextColor={Colors.text.muted}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.code}
              ListEmptyComponent={
                loadingCountries ? (
                  <View style={{ paddingVertical: Spacing[5], alignItems: 'center' }}>
                    <ActivityIndicator color={Colors.accent.primary} />
                    <Text style={{ color: Colors.text.muted, marginTop: 8 }}>Loading countries...</Text>
                  </View>
                ) : (
                  <View style={{ paddingVertical: Spacing[5], alignItems: 'center' }}>
                    <Text style={{ color: Colors.text.muted }}>No countries found</Text>
                  </View>
                )
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setCountry(item);
                    setShowCountryPicker(false);
                    setCountrySearch('');
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.countryItemName}>{item.name}</Text>
                    <Text style={styles.countryItemCurrency}>{item.currency} — {item.currency_name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing[6], paddingBottom: Spacing[12] },
  subtitle: { fontSize: Typography.size.xs, color: Colors.status.error, fontWeight: Typography.weight.medium, marginBottom: 4 },
  title: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing[6] },
  fieldGroup: { marginBottom: Spacing[4] },
  label: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginBottom: 6, fontWeight: Typography.weight.medium },
  hint: { fontSize: Typography.size.xs, color: Colors.text.muted, marginBottom: 8 },
  input: {
    backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: Radius.md, padding: Spacing[4], color: Colors.text.primary, fontSize: Typography.size.base,
  },
  countryBtn: {
    backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: Radius.md, padding: Spacing[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  countryText: { fontSize: Typography.size.base, color: Colors.text.primary },
  countryPlaceholder: { fontSize: Typography.size.base, color: Colors.text.muted },
  chevron: { color: Colors.text.muted, fontSize: 12 },
  currencyBadge: {
    backgroundColor: Colors.accent.light, borderRadius: Radius.md, padding: Spacing[3],
    marginBottom: Spacing[4], borderWidth: 1, borderColor: Colors.accent.border,
  },
  currencyBadgeText: { color: Colors.text.accent, fontSize: Typography.size.sm },
  currencyBold: { fontWeight: Typography.weight.bold },
  btn: {
    backgroundColor: Colors.accent.primary, borderRadius: Radius.md, padding: Spacing[4],
    alignItems: 'center', marginTop: Spacing[2], marginBottom: Spacing[4],
    shadowColor: Colors.accent.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  btnText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  linkRow: { flexDirection: 'row', justifyContent: 'center' },
  linkText: { color: Colors.text.secondary, fontSize: Typography.size.sm },
  linkAccent: { color: Colors.accent.secondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  modalOverlay: { flex: 1, backgroundColor: Colors.bg.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing[6], maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] },
  modalTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  modalClose: { fontSize: 18, color: Colors.text.secondary, padding: 4 },
  searchInput: {
    backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: Radius.md, padding: Spacing[3], color: Colors.text.primary,
    fontSize: Typography.size.base, marginBottom: Spacing[3],
  },
  countryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border.subtle, gap: Spacing[3] },
  countryItemFlag: { fontSize: 24 },
  countryItemName: { fontSize: Typography.size.base, color: Colors.text.primary, fontWeight: Typography.weight.medium },
  countryItemCurrency: { fontSize: Typography.size.xs, color: Colors.text.muted },
});
