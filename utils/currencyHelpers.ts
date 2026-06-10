/**
 * Currency Helper Utilities
 * Provides dynamic currency support based on user's country
 */

import { COUNTRY_CONFIGS, EXCHANGE_RATES } from '../services/paystackService';

export type SupportedCurrency = 'KES' | 'UGX' | 'TZS' | 'USD';

export interface CurrencyInfo {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  exchangeRateFromUSD: number;
}

export const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  'Kenya': {
    code: 'KES',
    symbol: 'KSH',
    name: 'Kenyan Shilling',
    exchangeRateFromUSD: EXCHANGE_RATES.USD.KES
  },
  'Uganda': {
    code: 'UGX',
    symbol: 'UGX',
    name: 'Ugandan Shilling',
    exchangeRateFromUSD: EXCHANGE_RATES.USD.UGX
  },
  'Tanzania': {
    code: 'TZS',
    symbol: 'TSh',
    name: 'Tanzanian Shilling',
    exchangeRateFromUSD: EXCHANGE_RATES.USD.TZS
  },
  'DEFAULT': {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    exchangeRateFromUSD: 1
  }
};

export const getUserCurrency = (userCountry?: string): CurrencyInfo => {
  if (!userCountry) {
    return CURRENCY_MAP['DEFAULT'];
  }
  
  return CURRENCY_MAP[userCountry] || CURRENCY_MAP['DEFAULT'];
};

export const formatCurrency = (
  amount: number,
  userCountry?: string,
  options?: { includeDecimals?: boolean; compact?: boolean }
): string => {
  const currencyInfo = getUserCurrency(userCountry);
  const { includeDecimals = false, compact = false } = options || {};
  
  if (compact && amount >= 1000000) {
    return `${currencyInfo.symbol} ${(amount / 1000000).toFixed(1)}M`;
  }
  
  if (compact && amount >= 1000) {
    return `${currencyInfo.symbol} ${(amount / 1000).toFixed(1)}K`;
  }
  
  const formatted = includeDecimals 
    ? amount.toFixed(2)
    : Math.round(amount).toLocaleString();
  
  return `${currencyInfo.symbol} ${formatted}`;
};

export const convertCurrency = (
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): number => {
  if (fromCurrency === toCurrency) return amount;
  
  const fromCountry = Object.entries(CURRENCY_MAP).find(
    ([_, info]) => info.code === fromCurrency
  )?.[1];
  
  const toCountry = Object.entries(CURRENCY_MAP).find(
    ([_, info]) => info.code === toCurrency
  )?.[1];
  
  if (!fromCountry || !toCountry) return amount;
  
  const usdAmount = amount / fromCountry.exchangeRateFromUSD;
  return usdAmount * toCountry.exchangeRateFromUSD;
};

export const getCurrencySymbol = (userCountry?: string): string => {
  return getUserCurrency(userCountry).symbol;
};

export const getCurrencyCode = (userCountry?: string): SupportedCurrency => {
  return getUserCurrency(userCountry).code;
};
