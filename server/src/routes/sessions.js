import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { Router } from 'express';
import { db, persist } from '../db/index.js';
import { items, participants, sessionCharges, sessions } from '../db/schema.js';
import { calculateSplit } from '../services/splitter.js';
import {
  chargesSchema,
  itemSchema,
  parseBody,
  participantSchema,
  sessionSchema,
} from '../validation.js';

const router = Router();

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

async function getSessionBundle(sessionId) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) return null;

  const [charges] = await db
    .select()
    .from(sessionCharges)
    .where(eq(sessionCharges.sessionId, sessionId));

  return {
    ...session,
    charges: charges || { sessionId, tax: 0, serviceCharge: 0, tip: 0 },
    participants: await db
      .select()
      .from(participants)
      .where(eq(participants.sessionId, sessionId)),
    items: await db.select().from(items).where(eq(items.sessionId, sessionId)),
  };
}

function ensureSession(bundle) {
  if (!bundle) {
    const err = new Error('Session not found');
    err.status = 404;
    throw err;
  }
}

router.get('/', asyncRoute(async (req, res) => {
  const rows = await db.select().from(sessions).orderBy(desc(sessions.createdAt));
  res.json({ sessions: rows });
}));

router.post('/', asyncRoute(async (req, res) => {
  const input = parseBody(sessionSchema, req.body);
  const session = {
    id: nanoid(10),
    title: input.title,
    createdAt: new Date().toISOString(),
  };

  await db.insert(sessions).values(session);
  await db.insert(sessionCharges).values({ sessionId: session.id, tax: 0, serviceCharge: 0, tip: 0 });
  persist();

  res.status(201).json({ session: await getSessionBundle(session.id) });
}));

router.get('/:sessionId', asyncRoute(async (req, res) => {
  const session = await getSessionBundle(req.params.sessionId);
  ensureSession(session);
  res.json({ session });
}));

router.delete('/:sessionId', asyncRoute(async (req, res) => {
  const session = await getSessionBundle(req.params.sessionId);
  ensureSession(session);

  await db.delete(sessions).where(eq(sessions.id, req.params.sessionId));
  persist();
  res.json({ ok: true });
}));

router.post('/:sessionId/participants', asyncRoute(async (req, res) => {
  const session = await getSessionBundle(req.params.sessionId);
  ensureSession(session);
  const input = parseBody(participantSchema, req.body);
  const participant = { id: nanoid(10), sessionId: req.params.sessionId, ...input };

  await db.insert(participants).values(participant);
  persist();
  res.status(201).json({ participant });
}));

router.put('/:sessionId/participants/:participantId', asyncRoute(async (req, res) => {
  const session = await getSessionBundle(req.params.sessionId);
  ensureSession(session);
  const input = parseBody(participantSchema, req.body);

  await db
    .update(participants)
    .set(input)
    .where(
      and(
        eq(participants.id, req.params.participantId),
        eq(participants.sessionId, req.params.sessionId),
      ),
    );
  persist();

  res.json({ participant: { id: req.params.participantId, sessionId: req.params.sessionId, ...input } });
}));

router.delete('/:sessionId/participants/:participantId', asyncRoute(async (req, res) => {
  await db
    .delete(participants)
    .where(
      and(
        eq(participants.id, req.params.participantId),
        eq(participants.sessionId, req.params.sessionId),
      ),
    );
  persist();
  res.json({ ok: true });
}));

router.post('/:sessionId/items', asyncRoute(async (req, res) => {
  const session = await getSessionBundle(req.params.sessionId);
  ensureSession(session);
  const input = parseBody(itemSchema, req.body);
  const item = { id: nanoid(10), sessionId: req.params.sessionId, ...input };

  await db.insert(items).values(item);
  persist();
  res.status(201).json({ item });
}));

router.put('/:sessionId/items/:itemId', asyncRoute(async (req, res) => {
  const session = await getSessionBundle(req.params.sessionId);
  ensureSession(session);
  const input = parseBody(itemSchema, req.body);

  await db
    .update(items)
    .set(input)
    .where(and(eq(items.id, req.params.itemId), eq(items.sessionId, req.params.sessionId)));
  persist();

  res.json({ item: { id: req.params.itemId, sessionId: req.params.sessionId, ...input } });
}));

router.delete('/:sessionId/items/:itemId', asyncRoute(async (req, res) => {
  await db
    .delete(items)
    .where(and(eq(items.id, req.params.itemId), eq(items.sessionId, req.params.sessionId)));
  persist();
  res.json({ ok: true });
}));

router.put('/:sessionId/charges', asyncRoute(async (req, res) => {
  const session = await getSessionBundle(req.params.sessionId);
  ensureSession(session);
  const input = parseBody(chargesSchema, req.body);

  await db
    .insert(sessionCharges)
    .values({ sessionId: req.params.sessionId, ...input })
    .onConflictDoUpdate({
      target: sessionCharges.sessionId,
      set: input,
    });
  persist();

  res.json({ charges: { sessionId: req.params.sessionId, ...input } });
}));

router.get('/:sessionId/summary', asyncRoute(async (req, res) => {
  const session = await getSessionBundle(req.params.sessionId);
  ensureSession(session);
  const summary = calculateSplit(session);
  res.json({ summary });
}));

export default router;
