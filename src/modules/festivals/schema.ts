import { z } from "zod";

export const createFestivalSchema = z.object({
  name: z.string().trim().min(2, "Enter a festival name"),
  year: z.coerce.number().int().min(2000).max(2100),
  openingCash: z.coerce.number().min(0).default(0),
  openingBank: z.coerce.number().min(0).default(0),
});
