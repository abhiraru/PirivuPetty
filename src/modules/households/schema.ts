import { z } from "zod";

export const householdSchema = z.object({
  headName: z.string().trim().min(2, "Enter the head of household's name"),
  phone: z.string().trim().optional(),
  altPhone: z.string().trim().optional(),
  address: z.string().trim().min(2, "Enter the address"),
  areaId: z.string().min(1, "Choose an area"),
  notes: z.string().trim().optional(),
});
