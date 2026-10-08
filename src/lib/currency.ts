export const COMMON_CURRENCIES = ['GBP', 'USD', 'EUR', 'JPY', 'AED', 'SGD', 'AUD', 'CAD', 'CHF', 'HKD', 'CNY', 'INR'] as const;

/** The common list, plus the entry's own currency if it isn't in it. */
export function currencyOptions(current: string): string[] {
  return COMMON_CURRENCIES.includes(current as (typeof COMMON_CURRENCIES)[number])
    ? [...COMMON_CURRENCIES]
    : [current, ...COMMON_CURRENCIES];
}
