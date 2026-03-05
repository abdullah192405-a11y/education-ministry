
import pkg from 'pg';
const { Pool } = pkg;
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function updateUserPassword() {
    const email = 'alhwyji2001@gmail.com';
    const password = '123456';

    // Hash the password with MD5
    const passwordHash = crypto.createHash('md5').update(password).digest('hex');

    console.log(`Updating password for ${email}...`);
    console.log(`New password hash: ${passwordHash}`);

    try {
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, name, email',
            [passwordHash, email]
        );

        if (result.rowCount > 0) {
            console.log('✅ User updated successfully:');
            console.log(JSON.stringify(result.rows[0], null, 2));
        } else {
            console.log('❌ User not found.');
        }
    } catch (error) {
        console.error('❌ Error updating user:', error.message);
    } finally {
        await pool.end();
    }
}

updateUserPassword();
