export function formatCurrency(amount: number, currency = "KES"): string {
  const formatted = new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${currency} ${formatted}`;
}

export function formatRentPerMonth(amount: number, currency = "KES"): string {
  return `${formatCurrency(amount, currency)}/mo`;
}

export function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

export function formatLocation(
  town: string | null,
  county: string | null,
  estate?: string | null,
): string {
  const parts = [estate, town, county].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Location not set";
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  bedsitter: "Bedsitter",
  one_bedroom: "1 Bedroom",
  two_bedroom: "2 Bedroom",
  three_bedroom: "3 Bedroom",
  apartment: "Apartment",
  bungalow: "Bungalow",
  maisonette: "Maisonette",
  townhouse: "Townhouse",
  studio: "Studio",
  other: "Other",
};

export function formatPropertyType(type: string): string {
  return PROPERTY_TYPE_LABELS[type] ?? type;
}

export function formatBedsBaths(bedrooms: number, bathrooms: number): string {
  const bedLabel = bedrooms === 0 ? "Studio" : `${bedrooms} bed${bedrooms > 1 ? "s" : ""}`;
  return `${bedLabel} · ${bathrooms} bath${bathrooms > 1 ? "s" : ""}`;
}
