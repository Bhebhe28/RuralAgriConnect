import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, initDb, run } from './database';

async function seed() {
  await initDb();
  const db = await getDb();

  // Clear all tables in dependency order
  run(db, 'DELETE FROM activity_logs');
  run(db, 'DELETE FROM notification_log');
  run(db, 'DELETE FROM sms_notifications');
  run(db, 'DELETE FROM pest_outbreaks');
  run(db, 'DELETE FROM weather_data');
  run(db, 'DELETE FROM alerts');
  run(db, 'DELETE FROM advisories');
  run(db, 'DELETE FROM farmers');
  run(db, 'DELETE FROM officers');
  run(db, 'DELETE FROM user_roles');
  run(db, 'DELETE FROM users');
  run(db, 'DELETE FROM roles');

  // ── ROLES ──────────────────────────────────────────────
  const roleAdmin  = uuidv4();
  const roleFarmer = uuidv4();

  run(db, `INSERT INTO roles (role_id, role_name, description) VALUES (?,?,?)`,
    [roleAdmin,  'admin',  'System administrator with full access']);
  run(db, `INSERT INTO roles (role_id, role_name, description) VALUES (?,?,?)`,
    [roleFarmer, 'farmer', 'Registered farmer receiving advisories']);

  // ── USERS ──────────────────────────────────────────────
  const adminId   = uuidv4();
  const farmer1Id = uuidv4();
  const farmer2Id = uuidv4();
  const farmer3Id = uuidv4();

  run(db, `INSERT INTO users (user_id,full_name,email,phone_number,password_hash,role_id) VALUES (?,?,?,?,?,?)`,
    [adminId,   'Admin User',      'admin@farm.co.za',  '+27831000001', bcrypt.hashSync('Admin@123',  10), roleAdmin]);
  run(db, `INSERT INTO users (user_id,full_name,email,phone_number,password_hash,role_id) VALUES (?,?,?,?,?,?)`,
    [farmer1Id, 'Sipho Dlamini',   'sipho@farm.co.za',  '+27721000001', bcrypt.hashSync('Farmer@123', 10), roleFarmer]);
  run(db, `INSERT INTO users (user_id,full_name,email,phone_number,password_hash,role_id) VALUES (?,?,?,?,?,?)`,
    [farmer2Id, 'Nomvula Zulu',    'nomvula@farm.co.za','+27721000002', bcrypt.hashSync('Farmer@123', 10), roleFarmer]);
  run(db, `INSERT INTO users (user_id,full_name,email,phone_number,password_hash,role_id) VALUES (?,?,?,?,?,?)`,
    [farmer3Id, 'Bongani Khumalo', 'bongani@farm.co.za','+27721000003', bcrypt.hashSync('Farmer@123', 10), roleFarmer]);

  // ── USER ROLES ─────────────────────────────────────────
  run(db, `INSERT INTO user_roles (user_id, role_id) VALUES (?,?)`, [adminId,   roleAdmin]);
  run(db, `INSERT INTO user_roles (user_id, role_id) VALUES (?,?)`, [farmer1Id, roleFarmer]);
  run(db, `INSERT INTO user_roles (user_id, role_id) VALUES (?,?)`, [farmer2Id, roleFarmer]);
  run(db, `INSERT INTO user_roles (user_id, role_id) VALUES (?,?)`, [farmer3Id, roleFarmer]);

  // ── OFFICERS (admin is the only officer) ───────────────
  run(db, `INSERT INTO officers (officer_id, officer_name) VALUES (?,?)`, [adminId, 'Admin User']);

  // ── FARMERS ────────────────────────────────────────────
  run(db, `INSERT INTO farmers (farmer_id, region, crop_type, language_preference) VALUES (?,?,?,?)`,
    [farmer1Id, 'KwaZulu-Natal — uMgungundlovu', 'Maize, Beans',      'en']);
  run(db, `INSERT INTO farmers (farmer_id, region, crop_type, language_preference) VALUES (?,?,?,?)`,
    [farmer2Id, 'KwaZulu-Natal — iLembe',        'Tomatoes, Spinach', 'zu']);
  run(db, `INSERT INTO farmers (farmer_id, region, crop_type, language_preference) VALUES (?,?,?,?)`,
    [farmer3Id, 'KwaZulu-Natal — Zululand',      'Maize',             'en']);

  // ── ADVISORIES ─────────────────────────────────────────
  const adv1 = uuidv4();
  const adv2 = uuidv4();
  const adv3 = uuidv4();

  run(db, `INSERT INTO advisories (advisory_id,title,content,crop_type,region,severity,created_by) VALUES (?,?,?,?,?,?,?)`,
    [adv1, 'Maize Fall Armyworm Alert',
     'Fall armyworm detected in several maize fields. Apply Coragen or Ampligo early morning. Scout fields weekly for egg masses and young larvae.',
     'Maize', 'KwaZulu-Natal — eThekwini', 'critical', adminId]);
  run(db, `INSERT INTO advisories (advisory_id,title,content,crop_type,region,severity,created_by) VALUES (?,?,?,?,?,?,?)`,
    [adv2, 'Optimal Planting Window — Vegetables',
     'Ideal conditions for planting tomatoes, spinach, and cabbage. Soil moisture adequate. Use certified seeds and ensure proper spacing.',
     'Vegetables', 'KwaZulu-Natal — uMgungundlovu', 'info', adminId]);
  run(db, `INSERT INTO advisories (advisory_id,title,content,crop_type,region,severity,created_by) VALUES (?,?,?,?,?,?,?)`,
    [adv3, 'Soil pH Management Advisory',
     'Acidic conditions detected in uThukela. Apply agricultural lime at 2 tons/ha. Re-test after 6 weeks before planting.',
     'General', 'KwaZulu-Natal — uThukela', 'warning', adminId]);

  // ── ALERTS ─────────────────────────────────────────────
  const alert1 = uuidv4();
  const alert2 = uuidv4();

  run(db, `INSERT INTO alerts (alert_id,alert_type,message,advisory_id,issued_by) VALUES (?,?,?,?,?)`,
    [alert1, 'weather', 'Heavy rainfall expected over 48 hours. Delay fertilizer application and check drainage.', null, adminId]);
  run(db, `INSERT INTO alerts (alert_id,alert_type,message,advisory_id,issued_by) VALUES (?,?,?,?,?)`,
    [alert2, 'pest', 'High fall armyworm population in Zululand. Immediate scouting required.', adv1, adminId]);

  // ── WEATHER DATA ───────────────────────────────────────
  run(db, `INSERT INTO weather_data (weather_id,region,forecast_date,temperature,humidity,rainfall,wind_speed) VALUES (?,?,?,?,?,?,?)`,
    [uuidv4(), 'KwaZulu-Natal — eThekwini',    '2026-04-14', 26, 72, 12, 18]);
  run(db, `INSERT INTO weather_data (weather_id,region,forecast_date,temperature,humidity,rainfall,wind_speed) VALUES (?,?,?,?,?,?,?)`,
    [uuidv4(), 'KwaZulu-Natal — Zululand',     '2026-04-14', 35, 45,  0, 22]);
  run(db, `INSERT INTO weather_data (weather_id,region,forecast_date,temperature,humidity,rainfall,wind_speed) VALUES (?,?,?,?,?,?,?)`,
    [uuidv4(), 'KwaZulu-Natal — uMgungundlovu','2026-04-14', 24, 68,  5, 14]);

  // ── PEST OUTBREAKS ─────────────────────────────────────
  run(db, `INSERT INTO pest_outbreaks (outbreak_id,region,crop_type,description,temperature,humidity) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), 'KwaZulu-Natal — Zululand', 'Maize', 'Fall armyworm outbreak — high population levels detected in whorl stage maize.', 35, 45]);
  run(db, `INSERT INTO pest_outbreaks (outbreak_id,region,crop_type,description,temperature,humidity) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), 'KwaZulu-Natal — iLembe', 'Vegetables', 'Tomato mosaic virus detected. Remove infected plants immediately.', 28, 65]);

  // ── SMS NOTIFICATIONS ──────────────────────────────────
  run(db, `INSERT INTO sms_notifications (sms_id,farmer_id,alert_id,status) VALUES (?,?,?,?)`,
    [uuidv4(), farmer1Id, alert2, 'sent']);
  run(db, `INSERT INTO sms_notifications (sms_id,farmer_id,alert_id,status) VALUES (?,?,?,?)`,
    [uuidv4(), farmer3Id, alert2, 'pending']);

  // ── ACTIVITY LOGS ──────────────────────────────────────
  run(db, `INSERT INTO activity_logs (log_id,user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), adminId,   'LOGIN',             'user',      adminId,   'Admin logged in']);
  run(db, `INSERT INTO activity_logs (log_id,user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), adminId,   'CREATE_ADVISORY',   'advisory',  adv1,      'Published Fall Armyworm alert']);
  run(db, `INSERT INTO activity_logs (log_id,user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), adminId,   'CREATE_ADVISORY',   'advisory',  adv2,      'Published Vegetable planting advisory']);
  run(db, `INSERT INTO activity_logs (log_id,user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), farmer1Id, 'LOGIN',             'user',      farmer1Id, 'Farmer logged in']);

  console.log('✅ Database seeded — all tables created per ERD spec');
}

seed().catch((e) => { console.error(e); process.exit(1); });
