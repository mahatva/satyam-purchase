import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[match[1]]) {
        process.env[match[1]] = val;
      }
    }
  }
}

import * as db from '../server/db.js';

async function runE2ETests() {
  console.log('=== Starting Satyam Purchase Automated E2E Test Suite ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Health & Connection Check
    console.log('1. Database Connectivity & Version:');
    const health = await db.checkConnection();
    assert(Boolean(health && health.now), 'Successfully connected to Neon Lakebase Postgres');
    assert(health.version.includes('PostgreSQL 18'), 'PostgreSQL version 18.x verified');

    // 2. User ID & Password Authentication for All Roles
    console.log('\n2. User ID & Password Authentication Tests:');
    const credentials = [
      { id: 'admin', pass: 'admin123', role: 'Admin', name: 'Avi Mangal' },
      { id: 'officer_dwl', pass: 'officer123', role: 'Officer', name: 'Rahul' },
      { id: 'warehouse_dwl', pass: 'warehouse123', role: 'Warehouse', name: 'Suresh' },
      { id: 'accounts', pass: 'accounts123', role: 'Accounts', name: 'Accounts' },
      { id: 'officer_sc2', pass: 'officer123', role: 'Officer', name: 'Sample officer SC2' },
    ];

    for (const cred of credentials) {
      const user = await db.authenticateUser(cred.id, cred.pass);
      assert(user !== null, `Authenticated user '${cred.id}' with valid password`);
      assert(user.role === cred.role, `Role matches expected '${cred.role}'`);
    }

    // 3. Security Checks: Rejection of Invalid Credentials & Mobile Numbers
    console.log('\n3. Security & Mobile Auth Disablement Tests:');
    const badPass = await db.authenticateUser('admin', 'wrong_pass');
    assert(badPass === null, 'Rejected incorrect password for admin');

    const mobileAuthAttempt = await db.authenticateUser('9000000001', 'admin123');
    assert(mobileAuthAttempt === null, 'Mobile number strictly rejected as User ID login');

    // 4. Role Switch Verification Tests
    console.log('\n4. Role Switch Security Verification Tests:');
    // Admin password authorizes any role switch
    const adminAuthCheck = await db.verifyRolePassword('Warehouse', 'admin123');
    assert(adminAuthCheck !== null, 'Admin master password authorized switch to Warehouse role');

    // Warehouse password authorizes switch to Warehouse
    const targetAuthCheck = await db.verifyRolePassword('Warehouse', 'warehouse123');
    assert(targetAuthCheck !== null, 'Target role password authorized switch to Warehouse');

    // Invalid password fails
    const invalidAuthCheck = await db.verifyRolePassword('Warehouse', 'invalid_pwd');
    assert(invalidAuthCheck === null, 'Invalid password rejected for role switch');

    // 5. Plant Delivered Prices Retrieval & Update
    console.log('\n5. Plant Price Masters CRUD Tests:');
    const pricesBefore = await db.getPlantPrices();
    assert(Array.isArray(pricesBefore) && pricesBefore.length >= 6, 'Retrieved plant prices list');

    await db.addPlantPrice('Maize', 'A', 2700, new Date().toISOString());
    const pricesAfter = await db.getPlantPrices();
    const updated = pricesAfter.find((p) => p.commodity === 'Maize' && p.grade === 'A');
    assert(Number(updated.price) === 2700, 'Plant price updated successfully to 2700');

    // 5b. Expenses & Grade Freight Masters Tests
    console.log('\n5b. Expense & Grade Freight Masters Tests:');
    const testExpenses = [
      { n: 'Mandi fee', t: 'pct', v: 1.7 },
      { n: 'Local hammali', t: 'fix', v: 20 },
      { n: 'Local transit', t: 'fix', v: 20 },
      { n: 'Loading labour', t: 'fix', v: 33 },
      { n: 'Commission', t: 'pct', v: 3 },
      { n: 'Bags', t: 'fix', v: 40 },
      { n: 'Freight to plant', t: 'fix', vg: { A: 95, B: 90, C: 85 } },
    ];
    await db.saveExpenses('DWL', testExpenses);
    const expensesList = await db.getExpenses();
    const dwlExp = expensesList.find((e) => e.centre === 'DWL');
    assert(Boolean(dwlExp), 'Expenses saved and retrieved for DWL');
    const dwlExpParsed = typeof dwlExp.expenses === 'string' ? JSON.parse(dwlExp.expenses) : dwlExp.expenses;
    const freightItem = dwlExpParsed.find((e) => e.n === 'Freight to plant');
    assert(freightItem.vg.A === 95, 'Freight for Grade A correctly saved as 95');

    // 6. Quota Limits Tests
    console.log('\n6. Daily Quotas Limit Tests:');
    const limits = await db.getDailyLimits();
    assert(Array.isArray(limits), 'Daily limits list retrieved');

    await db.setDailyLimit('DWL|Maize|2026-10-16', 'DWL', 'Maize', '2026-10-16', 250);
    const limitsAfter = await db.getDailyLimits();
    const limitUpdated = limitsAfter.find(
      (l) => l.centre === 'DWL' && l.commodity === 'Maize' && l.date_iso === '2026-10-16'
    );
    assert(Number(limitUpdated.limit_qty) === 250, 'Daily limit upserted to 250 qtl');

    // 7. Full Procurement Soda Lifecycle (Create -> Approve -> Net Weight Unload & Direct Close)
    console.log('\n7. End-to-End Procurement Lifecycle:');
    const testSodaId = `DWL261016-E2E-${Date.now().toString().slice(-4)}`;
    const newSoda = {
      id: testSodaId,
      centre: 'DWL',
      commodity: 'Maize',
      grade: 'A',
      farmer_name: 'Test Farmer E2E',
      farmer_mobile: '9876543210',
      village: 'Diwal Kalan',
      approx_qty: 120,
      status: 'PendingApproval',
      reasons: ['Over moisture limit check passed'],
      date_iso: '2026-10-16',
      rate_snapshot: { ceiling: 2134, agreed: 2130, moistEntered: 14.5 },
      photos: [],
      history: [{ action: 'Created by Officer in E2E', at: '2026-10-16' }],
    };

    // Step A: Save soda
    await db.createSoda(newSoda);
    let sodas = await db.getSodas('DWL');
    let soda = sodas.find((s) => s.id === testSodaId);
    assert(Boolean(soda), `Created new soda agreement: ${testSodaId}`);
    assert(soda.status === 'PendingApproval', 'Soda is initially PendingApproval');

    // Step B: Admin approves soda
    const existingHist = typeof soda.history === 'string'
      ? JSON.parse(soda.history)
      : Array.isArray(soda.history) ? soda.history : [];
    await db.updateSoda(testSodaId, {
      status: 'Confirmed',
      history: [...existingHist, { action: 'Admin Approved in E2E', at: '2026-10-16' }],
    });
    sodas = await db.getSodas('DWL');
    soda = sodas.find((s) => s.id === testSodaId);
    assert(soda.status === 'Confirmed', 'Soda status successfully transitioned to Confirmed');

    // Step C: Warehouse unloads with Net Weight only, moisture noted (no price cut), directly closed!
    await db.updateSoda(testSodaId, {
      status: 'FinalApproved', // Directly saved and closed without needing admin approval
      net_weight: 120.0,
      final_moisture: 15.5, // Noted only
      final_rate: 2130, // Considers same old agreed rate
      amount: 255600, // 120 * 2130
      slip_name: 'sample_e2e_slip.jpg',
    });
    sodas = await db.getSodas('DWL');
    soda = sodas.find((s) => s.id === testSodaId);
    assert(soda.status === 'FinalApproved', 'Soda directly saved and closed as FinalApproved');
    assert(Number(soda.net_weight) === 120, 'Net weight recorded as 120 qtl directly without gross/tare');
    assert(Number(soda.final_rate) === 2130, 'Final rate retained agreed price ₹2130 without moisture deduction');
    assert(Number(soda.amount) === 255600, 'Final payable lot amount recorded as ₹2,55,600');

    // Step D: Outbound dispatch
    const dispatchPayload = {
      id: `DP-E2E-${Date.now().toString().slice(-4)}`,
      centre: 'DWL',
      dispatch_date: '2026-10-16',
      vehicle_no: 'MP-09-HH-1234',
      commodity: 'Maize',
      grade: 'A',
      qty: 120,
      est_freight: 95,
      actual_freight: 95,
      destination_plant: 'Processing Plant 1',
    };
    await db.createDispatch(dispatchPayload);
    const dispatches = await db.getDispatches();
    const foundDispatch = dispatches.find((d) => d.vehicle_no === 'MP-09-HH-1234');
    assert(Boolean(foundDispatch), 'Outbound plant dispatch recorded successfully');

    // Step E: Admin Edit and Delete Entry Tests
    console.log('\n7b. Admin Entry Edit and Delete Tests:');
    await wait(150);
    await db.updateSoda(testSodaId, {
      farmer_name: 'Edited Farmer Name',
      village: 'New Village Diwal',
    });
    await wait(150);
    sodas = await db.getSodas('DWL');
    const editedSoda = sodas.find((s) => s.id === testSodaId);
    assert(editedSoda.farmer_name === 'Edited Farmer Name', 'Admin successfully edited farmer name');

    await wait(150);
    await db.deleteSoda(testSodaId);
    await wait(150);
    sodas = await db.getSodas('DWL');
    const deletedSoda = sodas.find((s) => s.id === testSodaId);
    assert(!deletedSoda, 'Admin successfully deleted procurement entry');

    // 8. Audit Logs Verification
    console.log('\n8. Audit Logs & Activity Trail:');
    await wait(150);
    await db.logActivity('E2E Runner', `Verified soda ${testSodaId}`);
    const logs = await db.getActivityLogs();
    assert(logs.length > 0, 'Activity log entry successfully recorded and retrieved');

    console.log(`\n======================================================`);
    console.log(`=== E2E Test Suite Passed: ${passed} assertions, 0 failed ===`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('\nE2E Test Execution Failed:', err);
    process.exit(1);
  }
}

runE2ETests();
