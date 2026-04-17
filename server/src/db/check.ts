import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getDb, query } from './database';

async function check() {
  const db = await getDb();

  const users = query<any>(db, `
    SELECT u.user_id, u.email, u.password_hash, r.role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
  `);

  console.log(`\n📋 Users in DB (${users.length} total):`);
  for (const u of users) {
    const match = bcrypt.compareSync('Admin@123', u.password_hash);
    console.log(`  - ${u.email} | role: ${u.role_name} | Admin@123 matches: ${match}`);
  }

  if (users.length === 0) {
    console.log('  ❌ No users found — DB may not be seeded or wrong file is being read');
  }

  const roles = query<any>(db, `SELECT role_name FROM roles`);
  console.log(`\n🔑 Roles: ${roles.map((r: any) => r.role_name).join(', ') || 'NONE'}`);

  console.log(`\n📁 DB_PATH: ${process.env.DB_PATH || './data/ruragriconnect.db'}`);
}

check().catch(console.error);
