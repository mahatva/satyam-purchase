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

  // Add login_id and password columns to users table
  console.log('Altering users table to add login_id and password...');
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS login_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS password VARCHAR(100);
  `;

  // Update existing users with standard IDs and passwords
  console.log('Setting credentials for seeded users...');

  await sql`
    UPDATE users
    SET login_id = 'admin', password = 'admin123'
    WHERE id = 1 OR role = 'Admin';
  `;

  await sql`
    UPDATE users
    SET login_id = 'officer_dwl', password = 'officer123'
    WHERE id = 2 OR (role = 'Officer' AND centre = 'DWL' AND active = true);
  `;

  await sql`
    UPDATE users
    SET login_id = 'warehouse_dwl', password = 'warehouse123'
    WHERE id = 3 OR role = 'Warehouse';
  `;

  await sql`
    UPDATE users
    SET login_id = 'accounts', password = 'accounts123'
    WHERE id = 4 OR role = 'Accounts';
  `;

  await sql`
    UPDATE users
    SET login_id = 'officer_sc2', password = 'officer123'
    WHERE id = 5 OR (role = 'Officer' AND centre = 'SC2');
  `;

  await sql`
    UPDATE users
    SET login_id = 'officer_old', password = 'officer123'
    WHERE id = 6 OR active = false;
  `;

  // Verify
  const users = await sql`SELECT id, name, login_id, password, role, centre FROM users ORDER BY id ASC`;
  console.log('\nUpdated Users with Passwords:');
  console.table(users);
  console.log('\nCredentials migration successfully completed!');
}

run().catch((err) => {
  console.error('Error during credential migration:', err);
  process.exit(1);
});
