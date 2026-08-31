/**
 * Prices travel through the API in cents (integers) to avoid carrying
 * floating-point errors. Formatting to a string is the UI's responsibility.
 *
 * The sign is split off before dividing: with `Math.trunc(-50 / 100)` the
 * integer part is `-0`, which prints as `0`, and the result would come out
 * as `$0.50` — the same string as a positive price. Today there are no
 * negative prices in the catalog, but an adjustment or a refund is exactly
 * the kind of data that shows up later and can't silently lose its sign.
 */
export function formatPrice(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const dollars = Math.trunc(absolute / 100).toLocaleString('en-US');
  const remainder = absolute % 100;
  return `${sign}$${dollars}.${String(remainder).padStart(2, '0')}`;
}
