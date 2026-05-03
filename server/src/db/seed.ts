import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, initDb, run } from './database';

async function seed() {
  await initDb();
  const db = await getDb();

  // Clear all tables in safe order
  run(db, 'DELETE FROM activity_logs');
  run(db, 'DELETE FROM notifications');
  run(db, 'DELETE FROM password_resets');
  run(db, 'DELETE FROM community_replies');
  run(db, 'DELETE FROM community_posts');
  run(db, 'DELETE FROM farm_fields');
  run(db, 'DELETE FROM subsidy_requests');
  run(db, 'DELETE FROM yield_reports');
  run(db, 'DELETE FROM crop_calendar');
  run(db, 'DELETE FROM pest_outbreaks');
  run(db, 'DELETE FROM weather_data');
  run(db, 'DELETE FROM alerts');
  run(db, 'DELETE FROM advisories');
  run(db, 'DELETE FROM users');
  run(db, 'DELETE FROM roles');

  const now = new Date().toISOString();

  // ── ROLES ──────────────────────────────────────────────
  run(db, `INSERT INTO roles (role_id, role_name, description) VALUES (?,?,?)`,
    [uuidv4(), 'admin',  'System administrator with full access']);
  run(db, `INSERT INTO roles (role_id, role_name, description) VALUES (?,?,?)`,
    [uuidv4(), 'farmer', 'Registered farmer receiving advisories']);

  // ── USERS ──────────────────────────────────────────────
  const adminId   = uuidv4();
  const farmer1Id = uuidv4();
  const farmer2Id = uuidv4();
  const farmer3Id = uuidv4();

  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region) VALUES (?,?,?,?,?,?,?)`,
    [adminId,   'Admin User',      'admin@farm.co.za',   '+27831000001', bcrypt.hashSync('Admin@123',  10), 'admin',  null]);
  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region) VALUES (?,?,?,?,?,?,?)`,
    [farmer1Id, 'Sipho Dlamini',   'sipho@farm.co.za',   '+27721000001', bcrypt.hashSync('Farmer@123', 10), 'farmer', 'KwaZulu-Natal — uMgungundlovu']);
  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region) VALUES (?,?,?,?,?,?,?)`,
    [farmer2Id, 'Nomvula Zulu',    'nomvula@farm.co.za', '+27721000002', bcrypt.hashSync('Farmer@123', 10), 'farmer', 'KwaZulu-Natal — iLembe']);
  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region) VALUES (?,?,?,?,?,?,?)`,
    [farmer3Id, 'Bongani Khumalo', 'bongani@farm.co.za', '+27721000003', bcrypt.hashSync('Farmer@123', 10), 'farmer', 'KwaZulu-Natal — Zululand']);

  // ── ADVISORIES ─────────────────────────────────────────
  const adv1 = uuidv4();
  const adv2 = uuidv4();
  const adv3 = uuidv4();

  run(db, `INSERT INTO advisories (advisory_id, title, content, crop_type, region, severity, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [adv1, 'Maize Fall Armyworm Alert',
     'Fall armyworm detected in several maize fields. Apply Coragen or Ampligo early morning. Scout fields weekly for egg masses and young larvae.',
     'Maize', 'KwaZulu-Natal — eThekwini', 'critical', adminId, now, now]);
  run(db, `INSERT INTO advisories (advisory_id, title, content, crop_type, region, severity, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [adv2, 'Optimal Planting Window — Vegetables',
     'Ideal conditions for planting tomatoes, spinach, and cabbage. Soil moisture adequate. Use certified seeds and ensure proper spacing.',
     'Vegetables', 'KwaZulu-Natal — uMgungundlovu', 'info', adminId, now, now]);
  run(db, `INSERT INTO advisories (advisory_id, title, content, crop_type, region, severity, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [adv3, 'Soil pH Management Advisory',
     'Acidic conditions detected in uThukela. Apply agricultural lime at 2 tons/ha. Re-test after 6 weeks before planting.',
     'General', 'KwaZulu-Natal — uThukela', 'warning', adminId, now, now]);

  // ── ALERTS ─────────────────────────────────────────────
  const alert1 = uuidv4();
  const alert2 = uuidv4();

  run(db, `INSERT INTO alerts (alert_id, alert_type, message, advisory_id, issued_by, created_at) VALUES (?,?,?,?,?,?)`,
    [alert1, 'weather', 'Heavy rainfall expected over 48 hours. Delay fertilizer application and check drainage.', null, adminId, now]);
  run(db, `INSERT INTO alerts (alert_id, alert_type, message, advisory_id, issued_by, created_at) VALUES (?,?,?,?,?,?)`,
    [alert2, 'pest', 'High fall armyworm population in Zululand. Immediate scouting required.', adv1, adminId, now]);

  // ── WEATHER DATA ───────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  run(db, `INSERT INTO weather_data (weather_id, region, forecast_date, temperature, humidity, rainfall, wind_speed, description, icon, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), 'KwaZulu-Natal — eThekwini',     today, 26, 72, 12, 18, 'Partly cloudy', '02d', now]);
  run(db, `INSERT INTO weather_data (weather_id, region, forecast_date, temperature, humidity, rainfall, wind_speed, description, icon, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), 'KwaZulu-Natal — Zululand',      today, 35, 45,  0, 22, 'Hot and dry',   '01d', now]);
  run(db, `INSERT INTO weather_data (weather_id, region, forecast_date, temperature, humidity, rainfall, wind_speed, description, icon, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), 'KwaZulu-Natal — uMgungundlovu', today, 24, 68,  5, 14, 'Sunny',         '01d', now]);

  // ── PEST OUTBREAKS ─────────────────────────────────────
  run(db, `INSERT INTO pest_outbreaks (outbreak_id, region, crop_type, description, severity, reported_by, reported_date, temperature, humidity) VALUES (?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), 'KwaZulu-Natal — Zululand', 'Maize',
     'Fall armyworm outbreak — high population levels detected in whorl stage maize.',
     'critical', adminId, now, 35, 45]);
  run(db, `INSERT INTO pest_outbreaks (outbreak_id, region, crop_type, description, severity, reported_by, reported_date, temperature, humidity) VALUES (?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), 'KwaZulu-Natal — iLembe', 'Vegetables',
     'Tomato mosaic virus detected. Remove infected plants immediately.',
     'warning', adminId, now, 28, 65]);

  // ── ACTIVITY LOGS ──────────────────────────────────────
  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), adminId,   'LOGIN',           'user',     adminId, 'Admin logged in']);
  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), adminId,   'CREATE_ADVISORY', 'advisory', adv1,    'Published Fall Armyworm alert']);
  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), farmer1Id, 'LOGIN',           'user',     farmer1Id, 'Farmer logged in']);

  console.log('✅ Database seeded successfully');
  console.log('   admin@farm.co.za  / Admin@123');
  console.log('   sipho@farm.co.za  / Farmer@123');
  console.log('   nomvula@farm.co.za / Farmer@123');
}

export default seed;

if (require.main === module) {
  seed().catch((e) => { console.error(e); process.exit(1); });
}
