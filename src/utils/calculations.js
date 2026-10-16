// Business masters and calculations for Satyam Purchase

export const TODAY = new Date(2026, 9, 15, 10, 30);

export const YYMMDD = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return (
    String(date.getFullYear()).slice(2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
  );
};

export const ISO = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
};

export const DAYS = [0, 1, 2, 3].map((i) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + i);
  return {
    iso: ISO(d),
    label:
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  };
});

export const M = {
  centres: [
    { code: 'DWL', name: 'Diwal', shortage: 0.005, profitOverride: null },
    { code: 'SC2', name: 'Sample centre 2', shortage: 0.005, profitOverride: null },
    { code: 'SC3', name: 'Sample centre 3', shortage: 0.004, profitOverride: 80 },
    { code: 'SC4', name: 'Sample centre 4', shortage: 0.005, profitOverride: null },
    { code: 'SC5', name: 'Sample centre 5', shortage: 0.006, profitOverride: null },
  ],
  commodities: { Maize: 'मक्का', Chickpea: 'चना' },
  profit: 100,
  prices: [
    { c: 'Maize', g: 'A', v: 2550, at: '2026-10-15 09:00' },
    { c: 'Maize', g: 'B', v: 2450, at: '2026-10-15 09:00' },
    { c: 'Maize', g: 'C', v: 2350, at: '2026-10-15 09:00' },
    { c: 'Chickpea', g: 'A', v: 6100, at: '2026-10-15 09:00' },
    { c: 'Chickpea', g: 'B', v: 5950, at: '2026-10-15 09:00' },
    { c: 'Chickpea', g: 'C', v: 5800, at: '2026-10-15 09:00' },
    { c: 'Maize', g: 'A', v: 2520, at: '2026-10-14 09:00' },
  ],
  expenses: {
    DWL: [
      { n: 'Mandi fee', t: 'pct', v: 1.7 },
      { n: 'Local hammali', t: 'fix', v: 20 },
      { n: 'Local transit', t: 'fix', v: 20 },
      { n: 'Loading labour', t: 'fix', v: 33 },
      { n: 'Commission', t: 'pct', v: 3 },
      { n: 'Bags', t: 'fix', v: 40 },
      { n: 'Freight to plant', t: 'fix', vg: { A: 90, B: 85, C: 80 } },
    ],
  },
  moisture: {
    Maize: { base: 14, dedType: 'wt', ded: 1, max: 18 },
    Chickpea: { base: 12, dedType: 'rs', ded: 30, max: 14 },
  },
  limits: {},
};

// Populate other centres with adjusted freight
['SC2', 'SC3', 'SC4', 'SC5'].forEach((c, i) => {
  M.expenses[c] = M.expenses.DWL.map((e) =>
    e.vg
      ? {
          ...e,
          vg: Object.fromEntries(
            Object.entries(e.vg).map(([g, v]) => [g, v + [20, -15, 40, 5][i]])
          ),
        }
      : { ...e }
  );
});

// Seed default limits
[['DWL', [150, 200, 200, 120]], ['SC2', [100, 100, 80, 80]], ['SC3', [60, 60, 60, 60]]].forEach(([c, a]) =>
  a.forEach((v, i) => {
    M.limits[`${c}|Maize|${DAYS[i].iso}`] = v;
  })
);
M.limits[`DWL|Chickpea|${DAYS[0].iso}`] = 40;

export const ROLES = {
  Admin: 'Admin / Purchase Head',
  Officer: 'Field Officer',
  Warehouse: 'Warehouse In-charge',
  Accounts: 'Accounts & Finance',
};

export function plantPrice(pricesList, c, g) {
  const list = pricesList && pricesList.length > 0 ? pricesList : M.prices;
  const normC = String(c || '').trim().toLowerCase();
  const normG = String(g || '').replace(/^Grade\s*/i, '').trim().toUpperCase();

  const matches = list.filter((p) => {
    const pc = String(p.c || p.commodity || '').trim().toLowerCase();
    const pg = String(p.g || p.grade || '').replace(/^Grade\s*/i, '').trim().toUpperCase();
    return pc === normC && pg === normG;
  });

  if (matches.length === 0) return 2400;

  matches.sort((a, b) => {
    // Prioritize highest numeric ID (most recent database insert or Date.now() timestamp)
    const idA = Number(a.id) || 0;
    const idB = Number(b.id) || 0;
    if (idB !== idA) return idB - idA;
    // Fallback to timestamp string ISO
    const timeA = String(a.at || a.effective_at || '');
    const timeB = String(b.at || b.effective_at || '');
    return timeB.localeCompare(timeA);
  });

  return Number(matches[0].v || matches[0].price) || 2400;
}

export function profitFor(code) {
  const ce = M.centres.find((x) => x.code === code);
  return ce?.profitOverride ?? M.profit;
}

export function commDefault(code, expensesMap = null) {
  const expenses = (expensesMap && expensesMap[code]) || M.expenses[code] || M.expenses.DWL;
  const comm = expenses.find((e) => e.n === 'Commission');
  return comm ? Number(comm.v) : 3;
}

export function calc(code, c, g, moist, comm, pricesList = null, expensesMap = null) {
  const cd = commDefault(code, expensesMap);
  const cv = comm === '' || comm == null || isNaN(+comm) ? cd : Math.min(Math.max(+comm, 0), cd);
  const plant = plantPrice(pricesList, c, g);
  const profit = profitFor(code);
  const T = plant - profit;
  const expenses = (expensesMap && expensesMap[code]) || M.expenses[code] || M.expenses.DWL;
  const ex = expenses.map((e) =>
    e.n === 'Commission'
      ? { n: e.n, t: e.t, v: cv, def: cd, reduced: cv < cd }
      : { n: e.n, t: e.t, v: e.vg ? Number(e.vg[g]) : Number(e.v), byGrade: !!e.vg }
  );
  const ce = M.centres.find((x) => x.code === code) || M.centres[0];
  const Pct = ex.filter((e) => e.t === 'pct').reduce((s, e) => s + Number(e.v) / 100, 0);
  const Fix = ex.filter((e) => e.t === 'fix').reduce((s, e) => s + Number(e.v), 0);
  const S = ce.shortage;
  const P = (T * (1 - S) - Fix) / (1 + Pct);
  const mr = M.moisture[c] || M.moisture.Maize;
  const excess = Math.max(0, moist - mr.base);
  const blocked = moist > mr.max;
  const mDed = mr.dedType === 'wt' ? P * ((mr.ded * excess) / 100) : mr.ded * excess;
  const ceiling = P - mDed;

  return {
    plant,
    profit,
    T,
    Pct,
    Fix,
    S,
    P,
    excess,
    mDed,
    ceiling: Math.round(ceiling),
    rawCeiling: ceiling,
    blocked,
    mr,
    ex,
    comm: cv,
    commDef: cd,
  };
}

export function finalCalc(soda, fm, net, manualFinalRate = null) {
  const agreed = Number(soda.rate_snapshot?.agreed || soda.snap?.agreed || 0);
  const rate =
    manualFinalRate != null && !isNaN(+manualFinalRate) && +manualFinalRate > 0
      ? Number(manualFinalRate)
      : agreed;
  return {
    extra: 0,
    rate: Math.round(rate),
    amount: Math.round(rate * (Number(net) || 0)),
  };
}

export function limitFor(limitsMap, code, c, iso) {
  const key = `${code}|${c}|${iso}`;
  const v = limitsMap ? limitsMap[key] : M.limits[key];
  return v == null || v === '' ? null : +v;
}

export function booked(sodas, code, c, iso) {
  const a = (sodas || []).filter(
    (s) =>
      (s.centre === code) &&
      (s.c === c || s.commodity === c) &&
      (s.at === iso || s.date_iso === iso) &&
      s.status !== 'Cancelled'
  );
  return {
    qty: a.reduce((x, s) => x + (Number(s.qty || s.approx_qty) || 0), 0),
    pend: a
      .filter((s) => s.status === 'PendingApproval')
      .reduce((x, s) => x + (Number(s.qty || s.approx_qty) || 0), 0),
  };
}

export function stock(sodas, dispatches, code) {
  const un = (sodas || [])
    .filter(
      (s) =>
        (code === 'ALL' || s.centre === code) &&
        ['Unloaded', 'FinalApproved'].includes(s.status)
    )
    .reduce((a, s) => a + (Number(s.net_weight || s.net || 0) || 0), 0);

  const dp = (dispatches || [])
    .filter((d) => code === 'ALL' || d.centre === code)
    .reduce((a, d) => a + (Number(d.qty) || 0), 0);

  return { un, dp, stock: un - dp };
}

export const r0 = (n) => Math.round(Number(n) || 0);
export const inr = (n) => '₹' + r0(n).toLocaleString('en-IN');
export const q = (n) =>
  (+n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const centreName = (c) =>
  c === 'ALL'
    ? 'All centres'
    : M.centres.find((x) => x.code === c)?.name || c;

export function samplePhoto(label, h1, h2, kind) {
  try {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 480;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 640, 480);
    g.addColorStop(0, h1);
    g.addColorStop(1, h2);
    x.fillStyle = g;
    x.fillRect(0, 0, 640, 480);
    let seed = label.length * 97;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    if (kind === 'grain') {
      for (let i = 0; i < 2600; i++) {
        x.fillStyle = `hsla(${40 + rnd() * 12},${70 + rnd() * 20}%,${
          45 + rnd() * 25
        }%,.9)`;
        x.beginPath();
        x.ellipse(rnd() * 640, rnd() * 480, 5, 7, rnd() * 3, 0, 7);
        x.fill();
      }
    } else if (kind === 'slip') {
      x.fillStyle = '#fafaf7';
      x.fillRect(150, 40, 340, 400);
      x.fillStyle = '#333';
      x.font = 'bold 22px monospace';
      x.fillText('WEIGHBRIDGE SLIP', 190, 90);
      x.font = '18px monospace';
      ['GROSS', 'TARE', 'NET'].forEach((t, i) =>
        x.fillText(t + ' ......', 190, 150 + i * 50)
      );
    } else {
      x.fillStyle = '#ffffff30';
      for (let i = 0; i < 14; i++) x.fillRect(40 + i * 42, 260, 34, 160);
    }
    x.fillStyle = '#0009';
    x.fillRect(0, 428, 640, 52);
    x.fillStyle = '#fff';
    x.font = 'bold 20px sans-serif';
    x.fillText('SAMPLE · ' + label, 16, 462);
    return c.toDataURL('image/jpeg', 0.7);
  } catch {
    return '';
  }
}
