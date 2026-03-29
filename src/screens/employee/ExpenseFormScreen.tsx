import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES, CURRENCIES } from '../../utils/constants';
import { OCRService, ExtractedReceiptData } from '../../services/OCRService';
import { ExpenseRepo } from '../../repositories/ExpenseRepo';
import { ApprovalService } from '../../services/ApprovalService';
import { ExpenseWithDetails } from '../../types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const guessCategoryFromOCR = (data: ExtractedReceiptData): number | null => {
  const text = `${data.merchant ?? ''} ${data.description ?? ''}`.toLowerCase();
  if (!text) return null;

  if (text.includes('uber') || text.includes('taxi') || text.includes('ride') || text.includes('transport')) {
    return 2;
  }
  if (text.includes('hotel') || text.includes('stay') || text.includes('lodging')) {
    return 3;
  }
  if (text.includes('coffee') || text.includes('restaurant') || text.includes('meal') || text.includes('food')) {
    return 1;
  }
  if (text.includes('office') || text.includes('stationery') || text.includes('paper')) {
    return 4;
  }
  return null;
};

export default function ExpenseFormScreen({ navigation, route }: any) {
  const { session } = useAuth();
  const editingExpense: ExpenseWithDetails | null = route.params?.expense ?? null;

  const [amount, setAmount] = useState(editingExpense?.amount ? String(editingExpense.amount) : '');
  const [currency, setCurrency] = useState(editingExpense?.currency ?? 'USD');
  const [categoryId, setCategoryId] = useState<number>(editingExpense?.category_id ?? CATEGORIES[0].id);
  const [description, setDescription] = useState(editingExpense?.description ?? '');
  const [expenseDate, setExpenseDate] = useState(
    editingExpense?.expense_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  );
  const [receiptUri, setReceiptUri] = useState(editingExpense?.receipt_uri ?? '');
  const [ocrData, setOcrData] = useState<ExtractedReceiptData | null>(null);

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [decisionEvents, setDecisionEvents] = useState<{ id: number; message: string; created_at: string }[]>([]);
  const [loadingDecisionTrail, setLoadingDecisionTrail] = useState(false);

  const selectedCategory = useMemo(
    () => CATEGORIES.find(c => c.id === categoryId) ?? CATEGORIES[0],
    [categoryId]
  );

  const loadDecisionTrail = useCallback(async () => {
    if (!editingExpense?.id) return;
    const expenseId = Number(editingExpense.id);
    if (!Number.isFinite(expenseId)) return;
    setLoadingDecisionTrail(true);
    try {
      const trail = await ApprovalService.getExpenseDecisionTrail(expenseId);
      setDecisionReason(trail.explanation?.reason ?? 'Awaiting routing and approvals.');
      setDecisionEvents(
        trail.events.map(e => ({
          id: e.id,
          message: e.message,
          created_at: e.created_at,
        }))
      );
    } finally {
      setLoadingDecisionTrail(false);
    }
  }, [editingExpense?.id]);

  useEffect(() => {
    loadDecisionTrail();
  }, [loadDecisionTrail]);

  const applyOCRData = (data: ExtractedReceiptData) => {
    if (data.amount && data.confidence >= 25) {
      setAmount(prev => (prev.trim() ? prev : data.amount!.toFixed(2)));
    }

    if (data.currency && CURRENCIES.includes(data.currency)) {
      setCurrency(data.currency);
    }

    if (data.date && DATE_REGEX.test(data.date)) {
      setExpenseDate(data.date);
    }

    if (data.description) {
      setDescription(prev => (prev.trim() ? prev : data.description!));
    }

    const guessed = guessCategoryFromOCR(data);
    if (guessed) {
      setCategoryId(guessed);
    }
  };

  const pickReceipt = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Photo library permission is needed to attach receipts.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const selected = result.assets[0];
    setReceiptUri(selected.uri);
    setScanning(true);

    try {
      const extracted = await OCRService.scanReceipt(selected.uri);
      setOcrData(extracted);
      applyOCRData(extracted);

      const source = extracted.source === 'remote' ? 'remote OCR' : 'local fallback OCR';
      const lines = [
        `Source: ${source}`,
        extracted.amount ? `Amount: ${extracted.currency ?? currency} ${extracted.amount.toFixed(2)}` : 'Amount: not detected',
        extracted.date ? `Date: ${extracted.date}` : 'Date: not detected',
        `Confidence: ${extracted.confidence}%`,
      ];
      if (extracted.fallbackReason) {
        lines.push(`Fallback: ${extracted.fallbackReason}`);
      }

      Alert.alert('Receipt processed', lines.join('\n'));
    } catch (error) {
      Alert.alert('OCR Error', 'Could not read this receipt. You can still fill details manually.');
    } finally {
      setScanning(false);
    }
  };

  const validate = (): number | null => {
    if (!session) {
      Alert.alert('Session Error', 'Sign in again and retry.');
      return null;
    }

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Enter an amount greater than 0.');
      return null;
    }

    if (!currency.trim()) {
      Alert.alert('Currency Required', 'Select a currency.');
      return null;
    }

    if (!description.trim()) {
      Alert.alert('Description Required', 'Enter a short expense description.');
      return null;
    }

    if (!DATE_REGEX.test(expenseDate)) {
      Alert.alert('Invalid Date', 'Use date format YYYY-MM-DD.');
      return null;
    }

    return parsedAmount;
  };

  const handleSubmit = async (): Promise<void> => {
    const parsedAmount = validate();
    if (!parsedAmount || !session) return;

    setSubmitting(true);
    try {
      const expenseId = await ExpenseRepo.create({
        company_id: session.company_id,
        employee_id: session.user_id,
        description: description.trim(),
        expense_date: expenseDate,
        category_id: selectedCategory.id,
        paid_by: session.name,
        currency,
        amount: parsedAmount,
        remarks: ocrData ? `OCR(${ocrData.source}) confidence=${ocrData.confidence}` : '',
      });

      await ExpenseRepo.updateStatus(expenseId, 'submitted');

      if (receiptUri) {
        await ExpenseRepo.updateReceiptUri(expenseId, receiptUri, JSON.stringify(ocrData ?? {}));
      }

      await ApprovalService.submitExpense(expenseId, session.user_id);

      Alert.alert('Expense submitted', 'Your reimbursement request was routed for approval.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Submit failed', error?.message ?? 'Something went wrong while submitting expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {editingExpense ? (
            <Text style={styles.editHint}>Opened from history. Submitting creates a new request.</Text>
          ) : null}

          <Text style={styles.label}>Amount *</Text>
          <View style={styles.amountRow}>
            <TouchableOpacity style={styles.currencySelector} onPress={() => setShowCurrencyPicker(true)} activeOpacity={0.85}>
              <Text style={styles.currencySelectorText}>{currency}</Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.text.muted}
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={styles.label}>Date *</Text>
          <TextInput
            style={styles.input}
            value={expenseDate}
            onChangeText={setExpenseDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.text.muted}
          />

          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryWrap}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, cat.id === categoryId && styles.categoryChipActive]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryText, cat.id === categoryId && styles.categoryTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="What was this expense for?"
            placeholderTextColor={Colors.text.muted}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Receipt (optional)</Text>
          <TouchableOpacity style={styles.receiptBox} onPress={pickReceipt} disabled={scanning} activeOpacity={0.85}>
            {scanning ? (
              <View style={styles.scanningState}>
                <ActivityIndicator color={Colors.accent.primary} />
                <Text style={styles.scanningText}>Reading receipt with OCR...</Text>
              </View>
            ) : receiptUri ? (
              <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
            ) : (
              <>
                <Text style={styles.receiptIcon}>📷</Text>
                <Text style={styles.receiptTitle}>Attach receipt image</Text>
                <Text style={styles.receiptHint}>Detected fields are auto-filled and can be edited.</Text>
              </>
            )}
          </TouchableOpacity>

          {ocrData ? (
            <View style={styles.ocrCard}>
              <Text style={styles.ocrTitle}>OCR Result</Text>
              <Text style={styles.ocrText}>Source: {ocrData.source}</Text>
              <Text style={styles.ocrText}>Confidence: {ocrData.confidence}%</Text>
              {ocrData.fallbackReason ? <Text style={styles.ocrWarning}>Fallback used: {ocrData.fallbackReason}</Text> : null}
            </View>
          ) : null}

          {editingExpense?.id ? (
            <View style={styles.auditCard}>
              <Text style={styles.auditTitle}>Explainable Approval Graph</Text>
              {loadingDecisionTrail ? (
                <ActivityIndicator color={Colors.accent.primary} />
              ) : (
                <>
                  <Text style={styles.auditReason}>{decisionReason || 'Awaiting routing and approvals.'}</Text>
                  {decisionEvents.length === 0 ? (
                    <Text style={styles.auditEvent}>No approval events yet.</Text>
                  ) : (
                    decisionEvents.map(event => (
                      <Text key={event.id} style={styles.auditEvent}>
                        • {new Date(event.created_at).toLocaleString()} — {event.message}
                      </Text>
                    ))
                  )}
                </>
              )}
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Expense'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showCurrencyPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.currencyItem}
                  onPress={() => {
                    setCurrency(item);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={styles.currencyItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing[4], paddingBottom: Spacing[10] },
  card: {
    backgroundColor: Colors.bg.card,
    borderColor: Colors.border.default,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[4],
  },
  editHint: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginBottom: Spacing[2],
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    marginTop: Spacing[3],
    marginBottom: Spacing[2],
  },
  amountRow: { flexDirection: 'row', gap: Spacing[2] },
  currencySelector: {
    minWidth: 98,
    borderColor: Colors.border.default,
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.elevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[3],
  },
  currencySelectorText: { color: Colors.text.primary, fontWeight: Typography.weight.semibold },
  chevron: { color: Colors.text.muted, fontSize: 11 },
  amountInput: {
    flex: 1,
    borderColor: Colors.border.default,
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.elevated,
    color: Colors.text.primary,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontSize: Typography.size.base,
  },
  input: {
    borderColor: Colors.border.default,
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.elevated,
    color: Colors.text.primary,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontSize: Typography.size.base,
  },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.elevated,
  },
  categoryChipActive: {
    borderColor: Colors.accent.primary,
    backgroundColor: Colors.accent.light,
  },
  categoryIcon: { fontSize: Typography.size.sm },
  categoryText: { color: Colors.text.secondary, fontSize: Typography.size.xs },
  categoryTextActive: { color: Colors.text.primary, fontWeight: Typography.weight.semibold },
  textArea: {
    borderColor: Colors.border.default,
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.elevated,
    color: Colors.text.primary,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontSize: Typography.size.base,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  receiptBox: {
    marginTop: Spacing[1],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.elevated,
    padding: Spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  receiptIcon: { fontSize: 28, marginBottom: Spacing[2] },
  receiptTitle: { color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold },
  receiptHint: { color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 4, textAlign: 'center' },
  receiptPreview: { width: '100%', height: 180, borderRadius: Radius.md, resizeMode: 'cover' },
  scanningState: { alignItems: 'center', gap: Spacing[2] },
  scanningText: { color: Colors.text.secondary, fontSize: Typography.size.sm },
  ocrCard: {
    marginTop: Spacing[3],
    backgroundColor: Colors.bg.elevated,
    borderColor: Colors.border.default,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[3],
  },
  ocrTitle: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, marginBottom: 4 },
  ocrText: { color: Colors.text.secondary, fontSize: Typography.size.xs },
  ocrWarning: { color: Colors.status.warning, fontSize: Typography.size.xs, marginTop: 4 },
  auditCard: {
    marginTop: Spacing[3],
    backgroundColor: Colors.bg.elevated,
    borderColor: Colors.border.default,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[3],
  },
  auditTitle: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, marginBottom: 6 },
  auditReason: { color: Colors.accent.secondary, fontSize: Typography.size.xs, marginBottom: 6 },
  auditEvent: { color: Colors.text.secondary, fontSize: Typography.size.xs, marginBottom: 4 },
  submitBtn: {
    marginTop: Spacing[4],
    backgroundColor: Colors.accent.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  modalOverlay: { flex: 1, backgroundColor: Colors.bg.overlay, justifyContent: 'flex-end' },
  modalCard: {
    maxHeight: '70%',
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: Spacing[4],
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[3] },
  modalTitle: { color: Colors.text.primary, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  closeText: { color: Colors.accent.secondary, fontSize: Typography.size.sm },
  currencyItem: {
    borderBottomColor: Colors.border.subtle,
    borderBottomWidth: 1,
    paddingVertical: Spacing[3],
  },
  currencyItemText: { color: Colors.text.primary, fontSize: Typography.size.base },
});
