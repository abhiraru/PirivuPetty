import { z } from "zod";
import { rupeesToPaise } from "@/lib/money";

export const optionalText = z.string().trim().optional().transform((v) => v || undefined);
export const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(`${v}T00:00:00`) : undefined))
  .refine((d) => d === undefined || !Number.isNaN(d.getTime()), "Enter a valid date");

const DAY_MS = 24 * 60 * 60 * 1000;

/** A date that must be given, be a real day, not be absurdly old, and not be later than tomorrow (one day of slack for timezones). */
export const requiredDate = (what: string) =>
  z
    .string({ message: `Enter the ${what}` })
    .min(1, `Enter the ${what}`)
    .transform((v) => new Date(`${v}T00:00:00`))
    .refine((d) => !Number.isNaN(d.getTime()) && d.getFullYear() >= 2000, "Enter a valid date")
    .refine((d) => Number.isNaN(d.getTime()) || d.getTime() <= Date.now() + DAY_MS, `The ${what} cannot be in the future`);

export const amount = z.coerce
  .number({ message: "Enter an amount" })
  .positive("Enter an amount greater than zero")
  .max(10_000_000, "That amount looks too large")
  .transform(rupeesToPaise);

export const pledgeSchema = z.object({
  householdId: z.string().min(1),
  amount: z.coerce.number({ message: "Enter an amount" }).min(0, "Amount cannot be negative").max(10_000_000).transform(rupeesToPaise),
  note: optionalText,
});

export const collectionSchema = z
  .object({
    householdId: z.string().min(1),
    amount,
    mode: z.enum(["CASH", "CHEQUE", "ONLINE"]),
    txnId: optionalText,
    chequeNo: optionalText,
    chequeBank: optionalText,
    chequeDate: optionalDate,
    collectedOn: requiredDate("date received"),
    collectedBy: optionalText,
  })
  .superRefine((v, ctx) => {
    if (v.mode === "ONLINE" && !v.txnId) ctx.addIssue({ code: "custom", path: ["txnId"], message: "Enter the payment / transaction ID" });
    if (v.mode === "CHEQUE" && !v.chequeNo) ctx.addIssue({ code: "custom", path: ["chequeNo"], message: "Enter the cheque number" });
  });

export type CollectionInput = z.infer<typeof collectionSchema>;
export type PledgeInput = z.infer<typeof pledgeSchema>;
