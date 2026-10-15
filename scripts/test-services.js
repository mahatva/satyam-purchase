import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const env = {};

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[match[1]] = val;
    }
  }
}

const databaseUrl = env.DATABASE_URL || process.env.DATABASE_URL;
const authUrl = env.NEON_AUTH_BASE_URL || process.env.NEON_AUTH_BASE_URL;
const jwksUrl = env.NEON_AUTH_JWKS_URL || process.env.NEON_AUTH_JWKS_URL;

console.log('=== Neon Services End-to-End Verification ===\n');

async function testAll() {
  let passed = 0;
  let total = 0;

  // Test 1: Neon Postgres
  total++;
  console.log('1. Testing Neon Lakebase Postgres Service:');
  try {
    const sql = neon(databaseUrl);
    const [result] = await sql`SELECT NOW() as now, version() as version, current_database() as db`;
    console.log(`   ✓ Connected to database "${result.db}"`);
    console.log(`   ✓ Engine: ${result.version.split(' on ')[0]}`);
    console.log(`   ✓ Timestamp: ${result.now}`);

    const [userCount] = await sql`SELECT count(*)::int as count FROM users`;
    console.log(`   ✓ Seeded Users query: ${userCount.count} users in database`);

    const [priceCount] = await sql`SELECT count(*)::int as count FROM plant_prices`;
    console.log(`   ✓ Plant Prices query: ${priceCount.count} price records in database`);

    passed++;
  } catch (err) {
    console.error('   ✗ Neon Postgres test failed:', err.message);
  }

  // Test 2: Neon Auth Service
  total++;
  console.log('\n2. Testing Neon Auth Service:');
  try {
    console.log(`   Auth Base URL: ${authUrl}`);
    console.log(`   JWKS URL: ${jwksUrl}`);
    const jwksRes = await fetch(jwksUrl);
    if (jwksRes.ok) {
      const jwks = await jwksRes.json();
      console.log(`   ✓ Fetched JWKS successfully! Keys count: ${jwks.keys?.length || 0}`);
      console.log(`   ✓ Key algorithm: ${jwks.keys?.[0]?.alg}, Key ID: ${jwks.keys?.[0]?.kid}`);
      passed++;
    } else {
      throw new Error(`JWKS fetch returned status ${jwksRes.status}`);
    }
  } catch (err) {
    console.error('   ✗ Neon Auth test failed:', err.message);
  }

  // Test 3: API Handler Endpoints
  total++;
  console.log('\n3. Testing Unified Serverless / API Handlers:');
  try {
    process.env.DATABASE_URL = databaseUrl;
    process.env.NEON_BRANCH = env.NEON_BRANCH;
    process.env.NEON_AUTH_BASE_URL = authUrl;

    const { default: handler } = await import('../api/index.js');

    // Simulate mock req & res
    const mockReq = {
      url: '/api/health',
      method: 'GET',
      headers: { host: 'localhost:5173' },
    };
    let responseData = null;
    const mockRes = {
      setHeader: () => {},
      status: (code) => {
        return {
          json: (data) => {
            responseData = { code, data };
          },
          end: () => {},
        };
      },
    };

    await handler(mockReq, mockRes);
    if (responseData && responseData.code === 200 && responseData.data.status === 'ok') {
      console.log('   ✓ /api/health returned 200 OK:', responseData.data);
      passed++;
    } else {
      throw new Error(`Unexpected /api/health response: ${JSON.stringify(responseData)}`);
    }
  } catch (err) {
    console.error('   ✗ API handler test failed:', err.message);
  }

  console.log(`\n=== Verification Complete: ${passed}/${total} Service Tests Passed ===\n`);
  if (passed !== total) process.exit(1);
}

testAll();
