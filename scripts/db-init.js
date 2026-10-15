import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (match[1] === 'DATABASE_URL' || match[1] === 'DATABASE_URL_UNPOOLED') {
        databaseUrl = val;
      }
    }
  }
}

if (!databaseUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function run() {
  console.log('Connecting to Neon Lakebase Postgres...');
  const [{ now, version }] = await sql`SELECT NOW() as now, version() as version`;
  console.log('Connected! Postgres Version:', version);
  console.log('Server Time:', now);

  console.log('Initializing schema...');
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      mobile VARCHAR(20) UNIQUE NOT NULL,
      role VARCHAR(30) NOT NULL,
      centre VARCHAR(10) NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      can_cut_comm BOOLEAN DEFAULT FALSE,
      last_login TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS plant_prices (
      id SERIAL PRIMARY KEY,
      commodity VARCHAR(50) NOT NULL,
      grade VARCHAR(10) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      effective_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_limits (
      key VARCHAR(100) PRIMARY KEY,
      centre VARCHAR(10) NOT NULL,
      commodity VARCHAR(50) NOT NULL,
      date_iso VARCHAR(20) NOT NULL,
      limit_qty NUMERIC(10, 2)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sodas (
      id VARCHAR(50) PRIMARY KEY,
      centre VARCHAR(10) NOT NULL,
      commodity VARCHAR(50) NOT NULL,
      grade VARCHAR(10) NOT NULL,
      farmer_name TEXT NOT NULL,
      farmer_mobile VARCHAR(20),
      village TEXT,
      approx_qty NUMERIC(10, 2) NOT NULL,
      status VARCHAR(40) NOT NULL,
      reasons TEXT[],
      date_iso VARCHAR(20) NOT NULL,
      rate_snapshot JSONB NOT NULL,
      photos TEXT[],
      net_weight NUMERIC(10, 2),
      final_moisture NUMERIC(5, 2),
      gross_weight NUMERIC(10, 2),
      tare_weight NUMERIC(10, 2),
      unload_moisture NUMERIC(5, 2),
      unload_photos TEXT[],
      slip_name TEXT,
      slip_img TEXT,
      final_rate NUMERIC(10, 2),
      amount NUMERIC(12, 2),
      history JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS dispatches (
      id VARCHAR(50) PRIMARY KEY,
      centre VARCHAR(10) NOT NULL,
      dispatch_date VARCHAR(20) NOT NULL,
      grade VARCHAR(10) NOT NULL,
      vehicle_no VARCHAR(50) NOT NULL,
      destination_plant TEXT NOT NULL,
      qty NUMERIC(10, 2) NOT NULL,
      est_freight NUMERIC(10, 2) NOT NULL,
      actual_freight NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_label TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // Seed Users if table is empty
  const userCount = await sql`SELECT count(*)::int as count FROM users`;
  if (userCount[0].count === 0) {
    console.log('Seeding initial users...');
    const users = [
      { name: 'Avi Mangal', mobile: '9000000001', role: 'Admin', centre: 'ALL', active: true, can_cut_comm: true, last_login: '15 Oct, 21:40' },
      { name: 'Rahul (sample)', mobile: '9000000002', role: 'Officer', centre: 'DWL', active: true, can_cut_comm: true, last_login: '15 Oct, 10:30' },
      { name: 'Suresh (sample)', mobile: '9000000003', role: 'Warehouse', centre: 'DWL', active: true, can_cut_comm: false, last_login: '15 Oct, 15:05' },
      { name: 'Accounts (sample)', mobile: '9000000004', role: 'Accounts', centre: 'ALL', active: true, can_cut_comm: false, last_login: '14 Oct, 18:12' },
      { name: 'Sample officer SC2', mobile: '9000000005', role: 'Officer', centre: 'SC2', active: true, can_cut_comm: false, last_login: '15 Oct, 09:20' },
      { name: 'Old officer (sample)', mobile: '9000000006', role: 'Officer', centre: 'DWL', active: false, can_cut_comm: false, last_login: '2 Oct, 11:00' }
    ];
    for (const u of users) {
      await sql`
        INSERT INTO users (name, mobile, role, centre, active, can_cut_comm, last_login)
        VALUES (${u.name}, ${u.mobile}, ${u.role}, ${u.centre}, ${u.active}, ${u.can_cut_comm}, ${u.last_login})
      `;
    }
  }

  // Seed Plant Prices if empty
  const priceCount = await sql`SELECT count(*)::int as count FROM plant_prices`;
  if (priceCount[0].count === 0) {
    console.log('Seeding initial plant prices...');
    const prices = [
      { c: 'Maize', g: 'A', v: 2550, at: '2026-10-15 09:00' },
      { c: 'Maize', g: 'B', v: 2450, at: '2026-10-15 09:00' },
      { c: 'Maize', g: 'C', v: 2350, at: '2026-10-15 09:00' },
      { c: 'Chickpea', g: 'A', v: 6100, at: '2026-10-15 09:00' },
      { c: 'Chickpea', g: 'B', v: 5950, at: '2026-10-15 09:00' },
      { c: 'Chickpea', g: 'C', v: 5800, at: '2026-10-15 09:00' },
      { c: 'Maize', g: 'A', v: 2520, at: '2026-10-14 09:00' }
    ];
    for (const p of prices) {
      await sql`
        INSERT INTO plant_prices (commodity, grade, price, effective_at)
        VALUES (${p.c}, ${p.g}, ${p.v}, ${p.at})
      `;
    }
  }

  // Seed Activity Log if empty
  const logCount = await sql`SELECT count(*)::int as count FROM activity_logs`;
  if (logCount[0].count === 0) {
    await sql`
      INSERT INTO activity_logs (user_label, action)
      VALUES ('System', 'Initialized Neon Lakebase Postgres database and RBAC schemas')
    `;
  }

  console.log('Database successfully initialized and verified!');
}

run().catch((err) => {
  console.error('Database initialization error:', err);
  process.exit(1);
});
