import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { OCRService, ExtractedReceiptData } from '../services/OCRService';

const CATEGORIES = [
  'Meals',
  'Transportation',
  'Office Supplies',
  'Travel',
  'Entertainment',
  'Other',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'CNY'];

export default function SubmitExpenseScreen({ navigation }: any) {
  const { user } = useAuth();
  const { submitExpense } = useExpenses();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [ocrData, setOcrData] = useState<ExtractedReceiptData | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setReceiptUri(uri);

      // Trigger OCR scan
      setScanning(true);
      try {
        const extractedData = await OCRService.scanReceipt(uri);
        setOcrData(extractedData);

        // Auto-fill fields if extraction was successful
        if (extractedData.amount) {
          setAmount(extractedData.amount.toString());
        }
        if (extractedData.currency && CURRENCIES.includes(extractedData.currency)) {
          setCurrency(extractedData.currency);
        }
        if (extractedData.date) {
          // Auto-filled but not shown in this simple form
        }
        if (extractedData.description) {
          setDescription(extractedData.description);
        }
        if (extractedData.merchant) {
          // Try to guess category from merchant name
          const merchantLower = extractedData.merchant.toLowerCase();
          if (merchantLower.includes('restaurant') || merchantLower.includes('cafe') || merchantLower.includes('food')) {
            setCategory('Meals');
          } else if (merchantLower.includes('hotel') || merchantLower.includes('travel')) {
            setCategory('Travel');
          } else if (merchantLower.includes('uber') || merchantLower.includes('taxi') || merchantLower.includes('transport')) {
            setCategory('Transportation');
          }
        }

        // Show feedback to user
        Alert.alert(
          'Receipt Scanned',
          `Extracted:\n• Amount: ${extractedData.currency || 'USD'} ${extractedData.amount?.toFixed(2) || 'N/A'}\n• Merchant: ${extractedData.merchant || 'N/A'}\n\nConfidence: ${extractedData.confidence}%`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        Alert.alert('OCR Error', 'Failed to extract data from receipt. Please enter manually.');
      } finally {
        setScanning(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!amount || !category || !description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    await submitExpense({
      employeeId: user?.id || '',
      employeeName: user?.name || '',
      amount: parsedAmount,
      currency,
      category,
      description,
      date: new Date().toISOString().split('T')[0],
      receiptUri: receiptUri || undefined,
    });
    setSubmitting(false);

    Alert.alert('Success', 'Expense submitted for approval!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Amount *</Text>
        <View style={styles.amountRow}>
          <TouchableOpacity style={styles.currencyPicker}>
            <Text>{currency} ▼</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                category === cat && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Enter expense description..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Receipt</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage} disabled={scanning}>
          {scanning ? (
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.scanningText}>Scanning receipt...</Text>
              <Text style={styles.scanningSubtext}>Extracting details with OCR</Text>
            </View>
          ) : receiptUri ? (
            <Image source={{ uri: receiptUri }} style={styles.receiptImage} />
          ) : (
            <>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>Tap to upload receipt</Text>
              <Text style={styles.uploadHint}>
                OCR will auto-extract details
              </Text>
            </>
          )}
        </TouchableOpacity>

        {ocrData && (
          <View style={styles.ocrResultBox}>
            <Text style={styles.ocrResultTitle}>✓ OCR Extracted Data</Text>
            <Text style={styles.ocrResultText}>
              Amount: {ocrData.currency} {ocrData.amount?.toFixed(2)}{'\n'}
              Merchant: {ocrData.merchant}{'\n'}
              Confidence: {ocrData.confidence}%
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Submitting...' : 'Submit Expense'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyPicker: {
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 80,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
  },
  categoryTextActive: {
    color: 'white',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  uploadHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  scanningContainer: {
    alignItems: 'center',
    padding: 20,
  },
  scanningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 12,
  },
  scanningSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  ocrResultBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  ocrResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  ocrResultText: {
    fontSize: 13,
    color: '#1B5E20',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
