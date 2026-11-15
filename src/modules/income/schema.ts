import { z } from "zod";
import { amount, optionalText, requiredDate } from "@/modules/collections/schema";

export const SOURCES = ["BANK_INTEREST", "SPONSORSHIP", "DONATION", "REFUND", "OTHER"] as const;
export type IncomeSourceKey = (typeof SOURCES)[number];

export const SOURCE_LABEL: Record<IncomeSourceKey, string> = {
  BANK_INTEREST: "Bank interest",
  SPONSORSHIP: "Sponsorship",
  DONATION: "Donation (not from a household)",
  REFUND: "Refund",
  OTHER: "Other",
};

export const incomeSchema = z.object({
  source: z.enum(SOURCES, { message: "Choose where the money came from" }),
  description: optionalText,
  amount,
  receivedIn: z.enum(["CASH", "BANK"], { message: "Choose cash or bank" }),
  receivedOn: requiredDate("date received"),
  reference: optionalText,
});

export type IncomeInput = z.infer<typeof incomeSchema>;
