import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required.")
});

export const placeInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  categoryId: z.string().min(1),
  shortDescription: z.string().min(10),
  longDescription: z.string().min(20),
  mapX: z.coerce.number().min(0).max(1400),
  mapY: z.coerce.number().min(0).max(1000),
  latitude: z.preprocess((value) => value === "" || value == null ? null : value, z.coerce.number().min(-90).max(90).nullable()),
  longitude: z.preprocess((value) => value === "" || value == null ? null : value, z.coerce.number().min(-180).max(180).nullable()),
  openingHours: z.string().optional().or(z.literal("")),
  accessibilityNotes: z.string().optional().or(z.literal("")),
  routeHint: z.string().optional().or(z.literal("")),
  contactNote: z.string().optional().or(z.literal("")),
  tags: z.array(z.string().min(1)).max(8),
  isFeatured: z.boolean(),
  isPlaceholder: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999)
});

export const guideInputSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  icon: z.string().min(1),
  audience: z.string().min(1),
  order: z.coerce.number().int().min(0).max(999),
  isPlaceholder: z.boolean()
});

export function splitTags(value: unknown) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}
