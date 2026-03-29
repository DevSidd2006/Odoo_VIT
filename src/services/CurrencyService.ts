import { getDb } from '../db/database';
import { ExchangeRates, Country } from '../types';

const CACHE_HOURS = 24;
// Official APIs per problem statement
const EXCHANGE_URL = 'https://api.exchangerate-api.com/v4/latest';
const COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,currencies,cca2,flag';

export const CurrencyService = {
  async getRates(baseCurrency: string): Promise<ExchangeRates> {
    const db = getDb();
    const cached = await db.getFirstAsync<{ rates_json: string; fetched_at: string }>(
      `SELECT rates_json, fetched_at FROM exchange_rate_cache
       WHERE base_currency = ? ORDER BY fetched_at DESC LIMIT 1`,
      [baseCurrency]
    );

    if (cached) {
      const ageHours = (Date.now() - new Date(cached.fetched_at).getTime()) / 3_600_000;
      if (ageHours < CACHE_HOURS) {
        return { base: baseCurrency, rates: JSON.parse(cached.rates_json), fetched_at: cached.fetched_at };
      }
    }

    try {
      // exchangerate-api.com/v4 returns { base, date, rates: {...} }
      const resp = await fetch(`${EXCHANGE_URL}/${baseCurrency}`, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const rates: Record<string, number> = data.rates ?? {};
      const fetchedAt = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO exchange_rate_cache (base_currency, rates_json, fetched_at) VALUES (?, ?, ?)`,
        [baseCurrency, JSON.stringify(rates), fetchedAt]
      );
      await db.runAsync(
        `DELETE FROM exchange_rate_cache WHERE base_currency = ? AND id NOT IN
         (SELECT id FROM exchange_rate_cache WHERE base_currency = ? ORDER BY fetched_at DESC LIMIT 3)`,
        [baseCurrency, baseCurrency]
      );

      return { base: baseCurrency, rates, fetched_at: fetchedAt };
    } catch (err) {
      if (cached) {
        console.warn('[Currency] Using stale cache:', err);
        return { base: baseCurrency, rates: JSON.parse(cached.rates_json), fetched_at: cached.fetched_at };
      }
      throw new Error(`No exchange rates available: ${err}`);
    }
  },

  /**
   * Fetch all countries + currencies from restcountries.com.
   * Falls back to bundled static list if API fails.
   */
  async fetchCountries(): Promise<Country[]> {
    try {
      const resp = await fetch(COUNTRIES_URL, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: any[] = await resp.json();
      const countries: Country[] = data
        .filter(c => c.currencies && Object.keys(c.currencies).length > 0)
        .map(c => {
          const currencyCode = Object.keys(c.currencies)[0];
          const currency = c.currencies[currencyCode];
          return {
            name: c.name.common,
            code: c.cca2 ?? '',
            currency: currencyCode,
            currency_name: currency?.name ?? currencyCode,
            flag: c.flag ?? '',
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      return countries;
    } catch (err) {
      console.warn('[Countries] API failed, using static fallback:', err);
      const { COUNTRIES } = await import('../utils/constants');
      return COUNTRIES;
    }
  },

  convert(amount: number, fromCurrency: string, toCurrency: string, rates: ExchangeRates): number {
    if (fromCurrency === toCurrency) return amount;
    // rates[X] = how many X per 1 base currency unit
    const fromRate = rates.rates[fromCurrency];
    const toRate = rates.rates[toCurrency];
    if (!fromRate || !toRate) return amount;
    return (amount / fromRate) * toRate;
  },

  format(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  },
};
