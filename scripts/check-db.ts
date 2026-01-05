
import { Client } from 'pg';
import 'dotenv/config';

async function checkColumns() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Habit';
    `);

        console.log("COLUMNS IN TABLE 'Habit':");
        res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
    } catch (err) {
        console.error("Error querying DB:", err);
    } finally {
        await client.end();
    }
}

checkColumns();
