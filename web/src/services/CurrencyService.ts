import { db } from '../db/database';
import type { ExchangeRates, Country } from '../types';

const CACHE_HOURS = 24;
// Official APIs per problem statement
const EXCHANGE_URL = 'https://api.exchangerate-api.com/v4/latest';
const COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,currencies,cca2,flag';

export const CurrencyService = {
  async getRates(baseCurrency: string): Promise<ExchangeRates> {
    const caches = await db.exchange_rate_cache.where('base_currency').equals(baseCurrency).toArray();
    caches.sort((a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime());
    const cached = caches[0];

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

      await db.exchange_rate_cache.add({
        base_currency: baseCurrency,
        rates_json: JSON.stringify(rates),
        fetched_at: fetchedAt
      });
      
      // Cleanup old cache entries keeping last 3
      const allForBase = await db.exchange_rate_cache.where('base_currency').equals(baseCurrency).toArray();
      allForBase.sort((a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime());
      if (allForBase.length > 3) {
        const toDelete = allForBase.slice(3).map(c => c.id!);
        await db.exchange_rate_cache.bulkDelete(toDelete);
      }

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
    const fromRate = fromCurrency === rates.base ? 1 : rates.rates[fromCurrency];
    const toRate = toCurrency === rates.base ? 1 : rates.rates[toCurrency];
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
