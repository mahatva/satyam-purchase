import * as db from '../server/db.js';

export default async function handler(req, res) {
  // CORS & Content Type
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse path from url
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const searchParams = url.searchParams;

  try {
    // GET /api/health
    if (pathname === 'health' || pathname === '') {
      const conn = await db.checkConnection();
      return res.status(200).json({
        status: 'ok',
        database: 'Neon Lakebase Postgres',
        branch: process.env.NEON_BRANCH || 'production',
        authUrl: process.env.NEON_AUTH_BASE_URL || null,
        serverTime: conn.now,
        postgresVersion: conn.version,
      });
    }

    // Auth Login: POST /api/auth/login
    if (pathname === 'auth/login' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { userId, identifier, password } = body;
      const user = await db.authenticateUser(userId || identifier, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid User ID or Password' });
      }
      return res.status(200).json(user);
    }

    // Auth Verify Role Switch: POST /api/auth/verify-role
    if (pathname === 'auth/verify-role' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { targetRole, password } = body;
      const verified = await db.verifyRolePassword(targetRole, password);
      if (!verified) {
        return res.status(401).json({ error: 'Incorrect password for target role' });
      }
      return res.status(200).json({ ok: true, user: verified });
    }

    // Users
    if (pathname === 'users') {
      if (req.method === 'GET') {
        const users = await db.getUsers();
        return res.status(200).json(users);
      }
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const user = await db.saveUser(body);
        return res.status(200).json(user);
      }
    }

    if (pathname.startsWith('users/') && pathname.endsWith('/toggle')) {
      const parts = pathname.split('/');
      const id = parseInt(parts[1], 10);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const user = await db.toggleUserStatus(id, body.active);
      return res.status(200).json(user);
    }

    // Sodas
    if (pathname === 'sodas') {
      if (req.method === 'GET') {
        const centre = searchParams.get('centre');
        const sodas = await db.getSodas(centre);
        return res.status(200).json(sodas);
      }
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const soda = await db.createSoda(body);
        return res.status(201).json(soda);
      }
    }

    if (pathname.startsWith('sodas/') && req.method === 'PUT') {
      const id = pathname.replace('sodas/', '');
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const soda = await db.updateSoda(id, body);
      return res.status(200).json(soda);
    }

    if (pathname.startsWith('sodas/') && req.method === 'DELETE') {
      const id = pathname.replace('sodas/', '');
      const deleted = await db.deleteSoda(id);
      return res.status(200).json({ ok: true, deleted });
    }

    // Expenses & Freight Masters
    if (pathname === 'expenses') {
      if (req.method === 'GET') {
        const expenses = await db.getExpenses();
        return res.status(200).json(expenses);
      }
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const saved = await db.saveExpenses(body.centre, body.expenses);
        return res.status(200).json(saved);
      }
    }

    // Dispatches
    if (pathname === 'dispatches') {
      if (req.method === 'GET') {
        const centre = searchParams.get('centre');
        const dispatches = await db.getDispatches(centre);
        return res.status(200).json(dispatches);
      }
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const dp = await db.createDispatch(body);
        return res.status(201).json(dp);
      }
    }

    // Plant Prices
    if (pathname === 'prices') {
      if (req.method === 'GET') {
        const prices = await db.getPlantPrices();
        return res.status(200).json(prices);
      }
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const price = await db.addPlantPrice(body.commodity, body.grade, body.price, body.effective_at);
        return res.status(201).json(price);
      }
    }

    // Daily Limits
    if (pathname === 'limits') {
      if (req.method === 'GET') {
        const limits = await db.getDailyLimits();
        return res.status(200).json(limits);
      }
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const saved = await db.setDailyLimit(body.key, body.centre, body.commodity, body.date_iso, body.limit_qty);
        return res.status(200).json(saved);
      }
    }

    // Activity Log
    if (pathname === 'activity') {
      if (req.method === 'GET') {
        const logs = await db.getActivityLogs();
        return res.status(200).json(logs);
      }
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const log = await db.logActivity(body.user_label, body.action);
        return res.status(201).json(log);
      }
    }

    return res.status(404).json({ error: `Not found: ${pathname}` });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
