import { z } from 'zod';

/**
 * Defining a custom zod schema for a datetime filter.
 * This will allow us to pass and validate filter query parameters on the `created_at` column, like:
 * - `created_at=<2022-01-01T00:00:00Z`
 * - `created_at=>2022-01-01T00:00:00.000Z`
 */
const dtSchema = z.string().datetime();
type DTSchema = z.infer<typeof dtSchema>;
const carrotSchema = z.enum(['<', '>']);
type CarrotSchema = z.infer<typeof carrotSchema>;

export const dtFilterSchema = z.custom<`${CarrotSchema}${DTSchema}`>((val) => {
  return typeof val === "string" ? /^[<>]\d{4}\-\d{2}\-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(val) : false;
});
export type DTFilterSchema = z.infer<typeof dtFilterSchema>;


export const QueryParams = z.object({
  limit: z.coerce.number().int().default(25),
  offset: z.coerce.number().int().default(0),
  sort: z.enum(['id', 'created_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('asc'),
  format: z.enum(['json', 'csv']).default('json'),
  created_at: dtFilterSchema.optional(),
});


export const Constituent = z.object({
  id: z.string().ulid(),
  email: z.string().email().toLowerCase(),
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  unsubscribed_at: z.string().datetime().optional(),
});
export type Constituent = z.infer<typeof Constituent>;


export const ConstituentParams = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});
export type ConstituentParams = z.infer<typeof ConstituentParams>;