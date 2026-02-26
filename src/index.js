import express from 'express';
import { eq } from 'drizzle-orm';
import { db, pool } from './db.js';
import { demoUsers } from './schema.js';

const app = express();
const PORT = 8000;

app.use(express.json());

app.use('/', (req, res) => {
  res.send('Hello from the Server!');
});

async function runCRUD() {
  try {
    console.log('Performing CRUD operations...');

    const [newUser] = await db
      .insert(demoUsers)
      .values({ name: 'Admin User', email: 'admin@example.com' })
      .returning();

    if (!newUser) throw new Error('Failed to create user');
    console.log('✅ CREATE:', newUser);

    const found = await db.select().from(demoUsers).where(eq(demoUsers.id, newUser.id));
    console.log('✅ READ:', found[0]);

    const [updatedUser] = await db
      .update(demoUsers)
      .set({ name: 'Super Admin' })
      .where(eq(demoUsers.id, newUser.id))
      .returning();
    console.log('✅ UPDATE:', updatedUser);

    await db.delete(demoUsers).where(eq(demoUsers.id, newUser.id));
    console.log('✅ DELETE done.');

  } catch (err) {
    console.error('CRUD error', err);
  } finally {
    if (pool) {
      await pool.end();
      console.log('Pool closed.');
    }
  }
}

// run example when server starts
runCRUD();

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});