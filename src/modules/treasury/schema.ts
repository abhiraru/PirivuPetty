import { z } from "zod";
import { amount, optionalDate, optionalText } from "@/modules/collections/schema";

export const handoverRequestSchema = z.object({ amount, note: optionalText });
export const handoverReceivedSchema = z.object({ collectorId: z.string().min(1, "Choose a collector"), amount, note: optionalText });
export const bankMoveSchema = z.object({ type: z.enum(["DEPOSIT_CASH", "WITHDRAWAL"]), amount, date: optionalDate, reference: optionalText });
export const expenseSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  description: z.string().trim().min(2, "Describe what it was for"),
  amount,
  paidFrom: z.enum(["CASH", "BANK"]),
  paidOn: optionalDate,
  vendor: optionalText,
  billReference: optionalText,
});
