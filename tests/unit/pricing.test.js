import { describe, it, expect } from 'vitest';
import {
  calc,
  finalCalc,
  plantPrice,
  profitFor,
  commDefault,
  centreName,
  inr,
  q,
  r0,
  M,
} from '../../src/utils/calculations';

describe('Pricing & Reverse Ceiling Calculation Engine', () => {
  it('correctly calculates base ceiling for Maize Grade A at DWL with standard 14% moisture', () => {
    const res = calc('DWL', 'Maize', 'A', 14, 3);
    expect(res.plant).toBe(2550);
    expect(res.profit).toBe(100);
    expect(res.T).toBe(2450);
    expect(res.S).toBe(0.005); // 0.5% shortage
    expect(res.excess).toBe(0);
    expect(res.mDed).toBe(0);
    expect(res.blocked).toBe(false);
    expect(res.ceiling).toBe(2134);
  });

  it('correctly applies weight-based moisture penalty for Maize with excess moisture', () => {
    // 15% moisture = 1% excess above 14% base
    const res = calc('DWL', 'Maize', 'A', 15, 3);
    expect(res.excess).toBe(1);
    expect(res.blocked).toBe(false);
    // 1% weight deduction reduces ceiling by P * 0.01 (~21.34)
    expect(res.ceiling).toBe(2113);
  });

  it('strictly blocks Maize purchases with moisture exceeding maximum 18% limit', () => {
    const res = calc('DWL', 'Maize', 'A', 18.5, 3);
    expect(res.excess).toBe(4.5);
    expect(res.blocked).toBe(true);
  });

  it('correctly applies rupee-based moisture deduction for Chickpea', () => {
    // Chickpea base is 12%, deduction is ₹30/qtl per 1% excess
    const res12 = calc('DWL', 'Chickpea', 'A', 12, 3);
    const res13 = calc('DWL', 'Chickpea', 'A', 13, 3);
    expect(res12.excess).toBe(0);
    expect(res13.excess).toBe(1);
    expect(res13.mDed).toBe(30);
    expect(res12.ceiling - res13.ceiling).toBe(30);
  });

  it('strictly blocks Chickpea purchases exceeding maximum 14% moisture limit', () => {
    const res = calc('DWL', 'Chickpea', 'A', 14.5, 3);
    expect(res.blocked).toBe(true);
  });

  it('increases offering ceiling when authorized field officer reduces commission', () => {
    const standard = calc('DWL', 'Maize', 'A', 14, 3);
    const reduced = calc('DWL', 'Maize', 'A', 14, 1.5);
    // Lower commission reduces expenses, increasing ceiling price
    expect(reduced.ceiling).toBeGreaterThan(standard.ceiling);
    expect(reduced.comm).toBe(1.5);
  });

  it('clamps commission between 0 and default commission', () => {
    const negative = calc('DWL', 'Maize', 'A', 14, -2);
    expect(negative.comm).toBe(0);

    const excessive = calc('DWL', 'Maize', 'A', 14, 10);
    expect(excessive.comm).toBe(3); // clamped to default 3
  });
});

describe('Warehouse Weighbridge Settlement (finalCalc)', () => {
  it('calculates final settlement with no extra moisture penalty', () => {
    const soda = {
      commodity: 'Maize',
      snap: { agreed: 2100, moistEntered: 14 },
    };
    const res = finalCalc(soda, 14, 100);
    expect(res.extra).toBe(0);
    expect(res.rate).toBe(2100);
    expect(res.amount).toBe(210000);
  });

  it('deducts weight penalty when warehouse measured moisture exceeds soda moisture', () => {
    const soda = {
      commodity: 'Maize',
      snap: { agreed: 2000, moistEntered: 14 },
    };
    // Measured 15% moisture at warehouse (1% extra)
    const res = finalCalc(soda, 15, 100);
    expect(res.extra).toBe(1);
    expect(res.rate).toBe(1980); // 1% deduction from 2000
    expect(res.amount).toBe(198000);
  });

  it('deducts price penalty for Chickpea at ₹30/qtl per 1% excess', () => {
    const soda = {
      commodity: 'Chickpea',
      snap: { agreed: 5500, moistEntered: 12 },
    };
    // Measured 13% moisture (1% extra)
    const res = finalCalc(soda, 13, 50);
    expect(res.extra).toBe(1);
    expect(res.rate).toBe(5470); // 5500 - 30
    expect(res.amount).toBe(273500);
  });
});

describe('Formatters and Centre Utilities', () => {
  it('correctly formats Indian Rupees', () => {
    expect(inr(25000)).toBe('₹25,000');
    expect(inr(1234567)).toBe('₹12,34,567');
  });

  it('correctly returns readable centre names', () => {
    expect(centreName('ALL')).toBe('All centres');
    expect(centreName('DWL')).toBe('Diwal');
    expect(centreName('SC2')).toBe('Sample centre 2');
  });
});
