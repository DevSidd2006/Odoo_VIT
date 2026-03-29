import * as FileSystem from 'expo-file-system';

export interface ExtractedReceiptData {
  amount?: number;
  currency?: string;
  date?: string;
  merchant?: string;
  description?: string;
  confidence: number;
  source: 'remote' | 'mock';
  fallbackReason?: string;
}

const REMOTE_OCR_URL = process.env.EXPO_PUBLIC_OCR_URL?.trim() ?? '';
const REMOTE_OCR_API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY?.trim() ?? '';

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const OCRService = {
  async processReceiptText(text: string): Promise<ExtractedReceiptData> {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const result: ExtractedReceiptData = {
      confidence: 0,
      source: 'mock',
    };

    const amountPatterns = [
      /(?:Total|Amount|Grand Total|Sum)[:\s]*[$€£¥]?\s*([\d,]+\.?\d*)/i,
      /[$€£¥]\s*([\d,]+\.?\d{0,2})/,
      /([\d,]+\.?\d{0,2})\s*(?:USD|EUR|GBP|JPY|CAD|AUD|INR|CNY)/i,
      /₹\s*([\d,]+\.?\d{0,2})/,
    ];

    for (const pattern of amountPatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (!match) continue;
        const amount = Number.parseFloat(match[1].replace(/,/g, ''));
        if (!Number.isNaN(amount) && amount > 0) {
          result.amount = amount;
          result.confidence += 30;
          break;
        }
      }
      if (result.amount) break;
    }

    const currencySymbols: Record<string, string> = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      '₹': 'INR',
    };

    for (const line of lines) {
      const knownCode = line.match(/\b(USD|EUR|GBP|JPY|CAD|AUD|INR|CNY)\b/i)?.[1]?.toUpperCase();
      if (knownCode) {
        result.currency = knownCode;
        result.confidence += 20;
        break;
      }

      for (const [symbol, code] of Object.entries(currencySymbols)) {
        if (line.includes(symbol)) {
          result.currency = code;
          result.confidence += 15;
          break;
        }
      }
      if (result.currency) break;
    }

    const datePatterns = [
      /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
      /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i,
    ];

    for (const pattern of datePatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (!match) continue;
        const parsed = new Date(match[0]);
        if (!Number.isNaN(parsed.getTime())) {
          result.date = parsed.toISOString().slice(0, 10);
          result.confidence += 20;
          break;
        }
      }
      if (result.date) break;
    }

    const merchantIndicators = ['restaurant', 'cafe', 'hotel', 'store', 'shop', 'market', 'inc', 'ltd', 'llc', 'corp'];
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      if (line.length <= 2 || lower.includes('tel') || lower.includes('fax')) continue;
      const looksLikeMerchant = merchantIndicators.some(ind => lower.includes(ind)) || /^[A-Za-z\s&']+$/.test(line);
      if (looksLikeMerchant) {
        result.merchant = line;
        result.confidence += 15;
        break;
      }
    }

    if (!result.merchant && lines.length > 0) {
      result.merchant = lines[0];
      result.confidence += 5;
    }

    const descriptionParts: string[] = [];
    if (result.merchant) descriptionParts.push(result.merchant);
    if (result.amount) {
      const symbol = result.currency ?? 'USD';
      descriptionParts.push(`${symbol} ${result.amount.toFixed(2)}`);
    }
    result.description = descriptionParts.join(' - ');
    result.confidence = Math.min(result.confidence, 100);

    return result;
  },

  generateMockOCRText(): string {
    const templates = [
      `STARBUCKS COFFEE\n123 Main Street\nDate: ${new Date().toLocaleDateString()}\nTOTAL $9.47`,
      `UBER RIDE RECEIPT\nDate: ${new Date().toLocaleDateString()}\nTotal USD 16.00`,
      `OFFICE DEPOT\nDate: ${new Date().toLocaleDateString()}\nGrand Total $57.23`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  },

  async scanReceipt(imageUri: string): Promise<ExtractedReceiptData> {
    try {
      const remote = await this.scanWithRemoteOCR(imageUri);
      return remote;
    } catch (error) {
      await sleep(900);
      const fallback = await this.processReceiptText(this.generateMockOCRText());
      return {
        ...fallback,
        source: 'mock',
        fallbackReason: error instanceof Error ? error.message : 'Remote OCR unavailable',
      };
    }
  },

  async scanWithRemoteOCR(imageUri: string): Promise<ExtractedReceiptData> {
    if (!REMOTE_OCR_URL) {
      throw new Error('Remote OCR is not configured');
    }

    const imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(REMOTE_OCR_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(REMOTE_OCR_API_KEY ? { Authorization: `Bearer ${REMOTE_OCR_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          imageBase64,
          imageUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Remote OCR failed: HTTP ${response.status}`);
      }

      const payload = await response.json();
      const normalized: ExtractedReceiptData = {
        amount: typeof payload.amount === 'number' ? payload.amount : undefined,
        currency: typeof payload.currency === 'string' ? payload.currency.toUpperCase() : undefined,
        date: typeof payload.date === 'string' ? payload.date : undefined,
        merchant: typeof payload.merchant === 'string' ? payload.merchant : undefined,
        description: typeof payload.description === 'string' ? payload.description : undefined,
        confidence: typeof payload.confidence === 'number' ? Math.max(0, Math.min(100, payload.confidence)) : 0,
        source: 'remote',
      };

      if (!normalized.amount && typeof payload.text === 'string') {
        const parsed = await this.processReceiptText(payload.text);
        return {
          ...parsed,
          source: 'remote',
          fallbackReason: 'Remote OCR returned raw text only',
        };
      }

      return normalized;
    } finally {
      clearTimeout(timeout);
    }
  },
};
