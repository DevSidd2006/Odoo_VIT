const API_URL = 'https://api.exchangerate-api.com/v4/latest/';

export async function getExchangeRate(base: string, target: string): Promise<number | null> {
  try {
    const response = await fetch(`${API_URL}${base}`);
    const data = await response.json();
    return data.rates[target] || null;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    return null;
  }
}

export function convertCurrency(amount: number, rate: number): number {
  return amount * rate;
}

// Mock country currency data for demo
export const COUNTRY_CURRENCIES: Record<string, string> = {
  'US': 'USD',
  'GB': 'GBP',
  'EU': 'EUR',
  'JP': 'JPY',
  'CA': 'CAD',
  'AU': 'AUD',
  'IN': 'INR',
};
