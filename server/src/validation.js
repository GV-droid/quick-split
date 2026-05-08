import { z } from 'zod';

const money = z.coerce
  .number()
  .finite()
  .min(0, 'Amount cannot be negative')
  .max(1_000_000, 'Amount is too large');

export const sessionSchema = z.object({
  title: z.string().trim().min(1, 'Session title is required').max(80),
});

export const participantSchema = z
  .object({
    name: z.string().trim().min(1, 'Participant name is required').max(60),
    isVeg: z.boolean().default(false),
    isNonVeg: z.boolean().default(false),
    drinks: z.boolean().default(false),
  })
  .refine((value) => value.isVeg || value.isNonVeg || value.drinks, {
    message: 'Select at least one participant preference',
  });

export const itemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(80),
  amount: money.refine((value) => value > 0, 'Item amount must be greater than zero'),
  category: z.enum(['veg', 'nonveg', 'drink', 'shared']),
});

export const chargesSchema = z.object({
  tax: money.default(0),
  serviceCharge: money.default(0),
  tip: money.default(0),
});

export function parseBody(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((error) => error.message).join(', ');
    const err = new Error(message);
    err.status = 400;
    throw err;
  }
  return parsed.data;
}
