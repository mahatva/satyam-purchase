import { neon } from '@neondatabase/serverless';

// Load connection string from environment
const getDbUrl = () => {
  return process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || '';
};

export const getSql = () => {
  const url = getDbUrl();
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(url);
};

export async function checkConnection() {
  const sql = getSql();
  const [row] = await sql`SELECT NOW() as now, version() as version`;
  return row;
}

export async function getUsers() {
  const sql = getSql();
  return await sql`SELECT * FROM users ORDER BY id ASC`;
}

export async function saveUser({ id, name, mobile, role, centre, active, can_cut_comm, login_id, password }) {
  const sql = getSql();
  const loginIdClean = (login_id || mobile).toLowerCase().trim();
  const passClean = password || 'user123';

  if (id) {
    const [updated] = await sql`
      UPDATE users
      SET name = ${name}, mobile = ${mobile}, role = ${role}, centre = ${centre},
          active = ${active ?? true}, can_cut_comm = ${can_cut_comm ?? false},
          login_id = ${loginIdClean}, password = ${passClean}
      WHERE id = ${id}
      RETURNING *
    `;
    return updated;
  } else {
    const [inserted] = await sql`
      INSERT INTO users (name, mobile, role, centre, active, can_cut_comm, login_id, password)
      VALUES (${name}, ${mobile}, ${role}, ${centre}, ${active ?? true}, ${can_cut_comm ?? false}, ${loginIdClean}, ${passClean})
      RETURNING *
    `;
    return inserted;
  }
}

export async function authenticateUser(identifier, password) {
  const sql = getSql();
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  const [matched] = await sql`
    SELECT * FROM users
    WHERE (LOWER(login_id) = ${cleanId} OR mobile = ${cleanId})
      AND password = ${cleanPass}
      AND active = true
    LIMIT 1
  `;
  return matched || null;
}

export async function verifyRolePassword(targetRole, password) {
  const sql = getSql();
  const cleanPass = String(password || '').trim();

  // Accept password if it matches any active user of targetRole OR any Admin user
  const [matched] = await sql`
    SELECT * FROM users
    WHERE (role = ${targetRole} OR role = 'Admin')
      AND password = ${cleanPass}
      AND active = true
    LIMIT 1
  `;
  return matched || null;
}

export async function toggleUserStatus(id, active) {
  const sql = getSql();
  const [updated] = await sql`
    UPDATE users SET active = ${active} WHERE id = ${id} RETURNING *
  `;
  return updated;
}

export async function getSodas(centre = null) {
  const sql = getSql();
  if (centre && centre !== 'ALL') {
    return await sql`SELECT * FROM sodas WHERE centre = ${centre} ORDER BY created_at DESC`;
  }
  return await sql`SELECT * FROM sodas ORDER BY created_at DESC`;
}

export async function createSoda(soda) {
  const sql = getSql();
  const {
    id, centre, commodity, grade, farmer_name, farmer_mobile,
    village, approx_qty, status, reasons, date_iso, rate_snapshot,
    photos, history
  } = soda;

  const [inserted] = await sql`
    INSERT INTO sodas (
      id, centre, commodity, grade, farmer_name, farmer_mobile,
      village, approx_qty, status, reasons, date_iso, rate_snapshot,
      photos, history
    )
    VALUES (
      ${id}, ${centre}, ${commodity}, ${grade}, ${farmer_name}, ${farmer_mobile},
      ${village}, ${approx_qty}, ${status}, ${reasons || []}, ${date_iso}, ${JSON.stringify(rate_snapshot)},
      ${photos || []}, ${JSON.stringify(history || [])}
    )
    RETURNING *
  `;
  return inserted;
}

export async function updateSoda(id, updates) {
  const sql = getSql();
  const fields = [];
  
  // Fetch existing
  const [existing] = await sql`SELECT * FROM sodas WHERE id = ${id}`;
  if (!existing) throw new Error(`Soda ${id} not found`);

  const merged = {
    ...existing,
    ...updates,
    history: updates.history ? JSON.stringify(updates.history) : existing.history,
    rate_snapshot: updates.rate_snapshot ? JSON.stringify(updates.rate_snapshot) : existing.rate_snapshot
  };

  const [updated] = await sql`
    UPDATE sodas
    SET status = ${merged.status},
        net_weight = ${merged.net_weight ?? null},
        final_moisture = ${merged.final_moisture ?? null},
        gross_weight = ${merged.gross_weight ?? null},
        tare_weight = ${merged.tare_weight ?? null},
        unload_moisture = ${merged.unload_moisture ?? null},
        unload_photos = ${merged.unload_photos || []},
        slip_name = ${merged.slip_name ?? null},
        slip_img = ${merged.slip_img ?? null},
        final_rate = ${merged.final_rate ?? null},
        amount = ${merged.amount ?? null},
        history = ${merged.history}
    WHERE id = ${id}
    RETURNING *
  `;
  return updated;
}

export async function getDispatches(centre = null) {
  const sql = getSql();
  if (centre && centre !== 'ALL') {
    return await sql`SELECT * FROM dispatches WHERE centre = ${centre} ORDER BY created_at DESC`;
  }
  return await sql`SELECT * FROM dispatches ORDER BY created_at DESC`;
}

export async function createDispatch(dp) {
  const sql = getSql();
  const [inserted] = await sql`
    INSERT INTO dispatches (
      id, centre, dispatch_date, grade, vehicle_no, destination_plant, qty, est_freight, actual_freight
    )
    VALUES (
      ${dp.id}, ${dp.centre}, ${dp.dispatch_date}, ${dp.grade}, ${dp.vehicle_no},
      ${dp.destination_plant}, ${dp.qty}, ${dp.est_freight}, ${dp.actual_freight}
    )
    RETURNING *
  `;
  return inserted;
}

export async function getPlantPrices() {
  const sql = getSql();
  return await sql`SELECT * FROM plant_prices ORDER BY id DESC`;
}

export async function addPlantPrice(commodity, grade, price, effective_at) {
  const sql = getSql();
  const [inserted] = await sql`
    INSERT INTO plant_prices (commodity, grade, price, effective_at)
    VALUES (${commodity}, ${grade}, ${price}, ${effective_at})
    RETURNING *
  `;
  return inserted;
}

export async function getDailyLimits() {
  const sql = getSql();
  return await sql`SELECT * FROM daily_limits`;
}

export async function setDailyLimit(key, centre, commodity, date_iso, limit_qty) {
  const sql = getSql();
  const [saved] = await sql`
    INSERT INTO daily_limits (key, centre, commodity, date_iso, limit_qty)
    VALUES (${key}, ${centre}, ${commodity}, ${date_iso}, ${limit_qty})
    ON CONFLICT (key) DO UPDATE
    SET limit_qty = ${limit_qty}
    RETURNING *
  `;
  return saved;
}

export async function getActivityLogs() {
  const sql = getSql();
  return await sql`SELECT * FROM activity_logs ORDER BY id DESC LIMIT 50`;
}

export async function logActivity(user_label, action) {
  const sql = getSql();
  const [log] = await sql`
    INSERT INTO activity_logs (user_label, action)
    VALUES (${user_label}, ${action})
    RETURNING *
  `;
  return log;
}
