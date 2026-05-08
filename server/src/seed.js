import { eq } from 'drizzle-orm';
import { db, migrate, persist } from './db/index.js';
import { items, participants, sessionCharges, sessions } from './db/schema.js';

migrate();

const demoSession = {
  id: 'demo-dinner',
  title: 'Friday Dinner Demo',
  createdAt: new Date().toISOString(),
};

await db.delete(sessions).where(eq(sessions.id, demoSession.id));
await db.delete(items).where(eq(items.sessionId, demoSession.id));
await db.delete(participants).where(eq(participants.sessionId, demoSession.id));
await db.delete(sessionCharges).where(eq(sessionCharges.sessionId, demoSession.id));
await db.insert(sessions).values(demoSession);

await db.insert(participants).values([
  { id: 'asha', sessionId: demoSession.id, name: 'Asha', isVeg: true, isNonVeg: false, drinks: false },
  { id: 'ben', sessionId: demoSession.id, name: 'Ben', isVeg: true, isNonVeg: true, drinks: true },
  { id: 'chris', sessionId: demoSession.id, name: 'Chris', isVeg: false, isNonVeg: true, drinks: true },
  { id: 'diya', sessionId: demoSession.id, name: 'Diya', isVeg: true, isNonVeg: false, drinks: true },
]);

await db.insert(items).values([
  { id: 'paneer', sessionId: demoSession.id, name: 'Paneer Tikka', amount: 420, category: 'veg' },
  { id: 'biryani', sessionId: demoSession.id, name: 'Chicken Biryani', amount: 620, category: 'nonveg' },
  { id: 'mocktails', sessionId: demoSession.id, name: 'Mocktails', amount: 540, category: 'drink' },
  { id: 'naan', sessionId: demoSession.id, name: 'Butter Naan Basket', amount: 240, category: 'shared' },
]);

await db
  .insert(sessionCharges)
  .values({ sessionId: demoSession.id, tax: 145, serviceCharge: 90, tip: 120 })
  .onConflictDoUpdate({
    target: sessionCharges.sessionId,
    set: { tax: 145, serviceCharge: 90, tip: 120 },
  });

persist();
console.log('Seeded demo session: Friday Dinner Demo');
