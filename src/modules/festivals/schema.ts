import { z } from "zod";

export const createFestivalSchema = z.object({
  name: z.string().trim().min(2, "Enter a festival name"),
  year: z.coerce.number().int().min(2000).max(2100),
  openingCash: z.coerce.number().min(0).default(0),
  openingBank: z.coerce.number().min(0).default(0),
});

const rupees = z.coerce.number({ message: "Enter an amount" }).min(0, "Amount cannot be negative").max(100_000_000);

/** What the treasurer counted: cash in the box and the balance on the bank statement. */
export const closingCheckSchema = z.object({
  countedCash: rupees,
  countedBank: rupees,
  note: z.string().trim().optional().transform((v) => v || undefined),
});

export const openingSchema = z.object({
  id: z.string().min(1),
  openingCash: rupees,
  openingBank: rupees,
});
