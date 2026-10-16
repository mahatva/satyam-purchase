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
  it('calculates final settlement with same agreed rate when no price override is provided (moisture is noted only)', () => {
    const soda = {
      commodity: 'Maize',
      snap: { agreed: 2100, moistEntered: 14 },
    };
    // Measured 16% moisture at warehouse (noted only, does not deduct rate)
    const res = finalCalc(soda, 16, 120);
    expect(res.rate).toBe(2100); // considers same old agreed rate
    expect(res.amount).toBe(252000); // 120 qtl * 2100
  });

  it('allows warehouse to override final rate upon arrival when negotiated', () => {
    const soda = {
      commodity: 'Maize',
      snap: { agreed: 2100, moistEntered: 14 },
    };
    // Final rate renegotiated to ₹2050
    const res = finalCalc(soda, 15, 100, 2050);
    expect(res.rate).toBe(2050);
    expect(res.amount).toBe(205000);
  });

  it('correctly calculates settlement payout for Chickpea using agreed rate or override', () => {
    const soda = {
      commodity: 'Chickpea',
      snap: { agreed: 5500, moistEntered: 12 },
    };
    // Measured 13% moisture (noted), no override
    const res = finalCalc(soda, 13, 50);
    expect(res.rate).toBe(5500);
    expect(res.amount).toBe(275000);
  });

  it('supports custom expenses map and grade-specific freights in reverse ceiling calculation', () => {
    const customExpenses = {
      DWL: [
        { n: 'Mandi fee', t: 'pct', v: 2.0 },
        { n: 'Commission', t: 'pct', v: 3.0 },
        { n: 'Local hammali', t: 'fix', v: 25 },
        { n: 'Local transit', t: 'fix', v: 25 },
        { n: 'Loading labour', t: 'fix', v: 35 },
        { n: 'Bags', t: 'fix', v: 45 },
        { n: 'Freight to plant', t: 'fix', vg: { A: 100, B: 95, C: 90 } },
      ],
    };
    const res = calc('DWL', 'Maize', 'A', 14, 3, null, customExpenses);
    expect(res.Fix).toBe(230); // 25 + 25 + 35 + 45 + 100
    expect(res.Pct).toBe(0.05); // 2% + 3%
    expect(res.ceiling).toBeLessThan(2134); // higher expenses lower the ceiling
  });

  it('plantPrice prioritizes latest inserted row by primary key ID', () => {
    const priceList = [
      { id: 1, commodity: 'Maize', grade: 'A', price: 2500, effective_at: '2026-10-15 09:00' },
      { id: 2, commodity: 'Maize', grade: 'A', price: 2600, effective_at: '2026-10-16 05:00' },
    ];
    expect(plantPrice(priceList, 'Maize', 'A')).toBe(2600);
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
