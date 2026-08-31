import {formatPrice} from '../formatPrice';

describe('formatPrice', () => {
  it('formats cents as dollars with two decimals', () => {
    expect(formatPrice(1999)).toBe('$19.99');
  });

  it('pads the cents with a leading zero', () => {
    expect(formatPrice(1905)).toBe('$19.05');
  });

  it('formats an exact price with no cents', () => {
    expect(formatPrice(2000)).toBe('$20.00');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('adds a thousands separator', () => {
    expect(formatPrice(123456)).toBe('$1,234.56');
  });

  // `Math.trunc(-50 / 100)` is `-0`, which prints as `0`: without splitting
  // off the sign, a negative amount under a dollar came out identical to a
  // positive one.
  it('preserves the sign of a negative amount under a dollar', () => {
    expect(formatPrice(-50)).toBe('-$0.50');
  });

  it('preserves the sign of a negative amount over a dollar', () => {
    expect(formatPrice(-123456)).toBe('-$1,234.56');
  });
});
