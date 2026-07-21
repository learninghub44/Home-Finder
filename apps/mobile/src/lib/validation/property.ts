import { z } from "zod";

export const propertyTypeSchema = z.enum([
  "bedsitter",
  "one_bedroom",
  "two_bedroom",
  "three_bedroom",
  "apartment",
  "bungalow",
  "maisonette",
  "townhouse",
  "studio",
  "other",
]);

export const propertyStatusSchema = z.enum(["available", "occupied", "reserved", "removed"]);

export const propertyFormSchema = z.object({
  title: z.string().min(5, "Title should be at least 5 characters"),
  description: z.string().min(20, "Add a bit more detail (20+ characters)"),
  property_type: propertyTypeSchema,
  status: propertyStatusSchema,

  bedrooms: z.coerce.number().int().min(0, "Enter a valid number of bedrooms"),
  bathrooms: z.coerce.number().int().min(0, "Enter a valid number of bathrooms"),
  size_sqm: z.coerce.number().positive().nullable().optional(),

  rent_amount: z.coerce.number().positive("Enter the monthly rent"),
  deposit_amount: z.coerce.number().min(0, "Enter a valid deposit amount"),
  service_charge: z.coerce.number().min(0, "Enter a valid service charge"),
  currency: z.string().min(1).default("KES"),

  water_available: z.boolean().default(false),
  electricity_available: z.boolean().default(false),
  parking_available: z.boolean().default(false),
  internet_available: z.boolean().default(false),
  furnished: z.boolean().default(false),
  pets_allowed: z.boolean().default(false),
  balcony: z.boolean().default(false),

  security_features: z.string().nullable().optional(),
  house_rules: z.string().nullable().optional(),
  nearby_landmarks: z.string().nullable().optional(),
  address_text: z.string().nullable().optional(),

  location_id: z.string().nullable().optional(),
  caretaker_id: z.string().nullable().optional(),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export const PROPERTY_TYPE_OPTIONS: { value: z.infer<typeof propertyTypeSchema>; label: string }[] = [
  { value: "bedsitter", label: "Bedsitter" },
  { value: "one_bedroom", label: "1 Bedroom" },
  { value: "two_bedroom", label: "2 Bedroom" },
  { value: "three_bedroom", label: "3 Bedroom" },
  { value: "apartment", label: "Apartment" },
  { value: "bungalow", label: "Bungalow" },
  { value: "maisonette", label: "Maisonette" },
  { value: "townhouse", label: "Townhouse" },
  { value: "studio", label: "Studio" },
  { value: "other", label: "Other" },
];

export const PROPERTY_STATUS_OPTIONS: { value: z.infer<typeof propertyStatusSchema>; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
  { value: "removed", label: "Removed" },
];

export const DEFAULT_PROPERTY_FORM_VALUES: PropertyFormValues = {
  title: "",
  description: "",
  property_type: "bedsitter",
  status: "available",
  bedrooms: 1,
  bathrooms: 1,
  size_sqm: null,
  rent_amount: 0,
  deposit_amount: 0,
  service_charge: 0,
  currency: "KES",
  water_available: false,
  electricity_available: false,
  parking_available: false,
  internet_available: false,
  furnished: false,
  pets_allowed: false,
  balcony: false,
  security_features: "",
  house_rules: "",
  nearby_landmarks: "",
  address_text: "",
  location_id: null,
  caretaker_id: null,
};
