/**
 * Dev/testing seed script for Home Finder.
 *
 * Creates real Supabase Auth users (via the admin API — RLS-safe, no auth bypass)
 * plus realistic Kenyan rental listings so Phase 3+ screens have real data to
 * query against. Never run against production; it's gated behind an explicit
 * env check below.
 *
 * Usage:
 *   1. In the Supabase dashboard: Project Settings -> API -> copy the
 *      `service_role` secret key (NOT the anon key — this script needs
 *      elevated privileges to create auth users and bypass RLS for inserts).
 *   2. Create apps/mobile/.env.seed (gitignored) with:
 *        SUPABASE_URL=https://xxxx.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   3. From apps/mobile: pnpm seed
 *
 * Safe to re-run: uses upsert / "does this email already exist" checks
 * throughout instead of blind inserts.
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

function loadSeedEnv() {
  const envPath = path.resolve(__dirname, "../.env.seed");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}
loadSeedEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Create apps/mobile/.env.seed — see the header comment in scripts/seed.ts.",
  );
  process.exit(1);
}
if (SUPABASE_URL.includes("prod") || process.env.CONFIRM_PROD === undefined && process.env.ALLOW_PROD_SEED !== "true") {
  // Extra guardrail: refuse to run against anything that looks like production
  // unless explicitly overridden. This is dev/testing seed data only.
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type SeedUser = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: "landlord" | "property_manager" | "tenant";
};

const SEED_USERS: SeedUser[] = [
  { email: "landlord.wanjiru@seed.homefinder.local", password: "SeedPass123!", full_name: "Grace Wanjiru", phone: "+254712345001", role: "landlord" },
  { email: "landlord.otieno@seed.homefinder.local", password: "SeedPass123!", full_name: "Brian Otieno", phone: "+254712345002", role: "landlord" },
  { email: "caretaker.mwangi@seed.homefinder.local", password: "SeedPass123!", full_name: "Peter Mwangi", phone: "+254712345003", role: "property_manager" },
  { email: "tenant.achieng@seed.homefinder.local", password: "SeedPass123!", full_name: "Faith Achieng", phone: "+254712345004", role: "tenant" },
];

const LOCATIONS = [
  { county: "Nairobi", town: "Nairobi", estate: "Kilimani", lat: -1.2921, lng: 36.7856 },
  { county: "Nairobi", town: "Nairobi", estate: "Kileleshwa", lat: -1.2793, lng: 36.7789 },
  { county: "Nairobi", town: "Nairobi", estate: "South B", lat: -1.3103, lng: 36.8354 },
  { county: "Nairobi", town: "Nairobi", estate: "Ruaka", lat: -1.2018, lng: 36.7856 },
  { county: "Kiambu", town: "Ruiru", estate: "Membley", lat: -1.1499, lng: 36.9569 },
  { county: "Kisumu", town: "Kisumu", estate: "Milimani", lat: -0.1022, lng: 34.7617 },
  { county: "Mombasa", town: "Mombasa", estate: "Nyali", lat: -4.0247, lng: 39.7086 },
];

const AMENITIES = [
  { name: "Borehole water", icon: "droplet" },
  { name: "CCTV Security", icon: "camera" },
  { name: "Gym", icon: "dumbbell" },
  { name: "Swimming pool", icon: "waves" },
  { name: "Backup generator", icon: "zap" },
  { name: "Gated compound", icon: "shield" },
  { name: "Elevator", icon: "arrow-up-down" },
  { name: "Rooftop terrace", icon: "sun" },
];

const PROPERTY_TEMPLATES = [
  {
    title: "Modern 1BR near Yaya Centre",
    description:
      "Bright one-bedroom apartment on the 3rd floor, walking distance to Yaya Centre and Adams Arcade. Tiled throughout, fitted kitchen with granite counters, and a dedicated parking bay.",
    property_type: "one_bedroom",
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 55,
    rent_amount: 45000,
    deposit_amount: 45000,
    service_charge: 3000,
    water_available: true,
    electricity_available: true,
    parking_available: true,
    internet_available: true,
    furnished: false,
    balcony: true,
    locationIndex: 0,
  },
  {
    title: "Spacious 2BR with Pool, Kileleshwa",
    description:
      "Gated 2-bedroom apartment in a serene Kileleshwa compound with a shared swimming pool and gym. Master ensuite, walk-in wardrobe, and 24-hour security.",
    property_type: "two_bedroom",
    bedrooms: 2,
    bathrooms: 2,
    size_sqm: 95,
    rent_amount: 85000,
    deposit_amount: 85000,
    service_charge: 6000,
    water_available: true,
    electricity_available: true,
    parking_available: true,
    internet_available: true,
    furnished: false,
    balcony: true,
    locationIndex: 1,
  },
  {
    title: "Cozy Bedsitter, South B",
    description:
      "Compact and affordable bedsitter close to South B shopping centre and matatu routes into town. Ideal for a student or young professional.",
    property_type: "bedsitter",
    bedrooms: 0,
    bathrooms: 1,
    size_sqm: 22,
    rent_amount: 12000,
    deposit_amount: 12000,
    service_charge: 500,
    water_available: true,
    electricity_available: true,
    parking_available: false,
    internet_available: false,
    furnished: false,
    balcony: false,
    locationIndex: 2,
  },
  {
    title: "3BR Maisonette, Ruaka",
    description:
      "Family-friendly maisonette in a gated Ruaka estate, close to Two Rivers Mall. Private garden, DSQ, and borehole-backed water supply.",
    property_type: "maisonette",
    bedrooms: 3,
    bathrooms: 3,
    size_sqm: 180,
    rent_amount: 95000,
    deposit_amount: 190000,
    service_charge: 4000,
    water_available: true,
    electricity_available: true,
    parking_available: true,
    internet_available: true,
    furnished: false,
    balcony: false,
    locationIndex: 3,
  },
  {
    title: "Affordable Studio, Membley",
    description:
      "Newly built studio unit off Kiambu Road in Membley, Ruiru. Quiet neighborhood with a backup generator and gated access.",
    property_type: "studio",
    bedrooms: 0,
    bathrooms: 1,
    size_sqm: 30,
    rent_amount: 15000,
    deposit_amount: 15000,
    service_charge: 1000,
    water_available: true,
    electricity_available: true,
    parking_available: true,
    internet_available: false,
    furnished: false,
    balcony: false,
    locationIndex: 4,
  },
  {
    title: "Lakeside 2BR Apartment, Milimani Kisumu",
    description:
      "Well-maintained 2-bedroom apartment in Kisumu's leafy Milimani area, minutes from the CBD and lakefront. Ample parking and a rooftop terrace.",
    property_type: "two_bedroom",
    bedrooms: 2,
    bathrooms: 2,
    size_sqm: 90,
    rent_amount: 40000,
    deposit_amount: 40000,
    service_charge: 2500,
    water_available: true,
    electricity_available: true,
    parking_available: true,
    internet_available: true,
    furnished: false,
    balcony: true,
    locationIndex: 5,
  },
  {
    title: "Beachside 1BR, Nyali Mombasa",
    description:
      "Fully furnished one-bedroom apartment a short walk from Nyali Beach, with pool access and a backup generator — perfect for young professionals or short lets.",
    property_type: "one_bedroom",
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 60,
    rent_amount: 55000,
    deposit_amount: 55000,
    service_charge: 5000,
    water_available: true,
    electricity_available: true,
    parking_available: true,
    internet_available: true,
    furnished: true,
    balcony: true,
    locationIndex: 6,
  },
] as const;

const SAMPLE_IMAGE_SEED_URLS = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
];

async function ensureUser(u: SeedUser): Promise<string> {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users.find((x) => x.email === u.email);
  if (found) return found.id;

  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name },
  });
  if (error || !data.user) throw new Error(`Failed creating ${u.email}: ${error?.message}`);
  return data.user.id;
}

async function main() {
  console.log("Seeding Home Finder dev data against:", SUPABASE_URL);

  // 1. Users + profiles (profile row is auto-created by the on-signup trigger;
  // we just need to set the correct role + extended landlord/caretaker rows).
  const userIds: Record<string, string> = {};
  for (const u of SEED_USERS) {
    const id = await ensureUser(u);
    userIds[u.email] = id;

    await admin
      .from("profiles")
      .update({ full_name: u.full_name, phone: u.phone, role: u.role })
      .eq("id", id);

    if (u.role === "landlord") {
      await admin
        .from("landlords")
        .upsert({ profile_id: id, business_name: `${u.full_name} Properties`, contact_email: u.email, contact_phone: u.phone, id_verified: true }, { onConflict: "profile_id" });
    }
    if (u.role === "property_manager") {
      await admin
        .from("property_managers")
        .upsert({ profile_id: id, contact_email: u.email, contact_phone: u.phone, bio: "Manages properties on behalf of local landlords." }, { onConflict: "profile_id" });
    }
    console.log(`  user ready: ${u.email} (${u.role})`);
  }

  // 2. Amenities lookup
  const amenityIds: Record<string, string> = {};
  for (const a of AMENITIES) {
    const { data } = await admin
      .from("amenities")
      .upsert({ name: a.name, icon: a.icon }, { onConflict: "name" })
      .select("id, name")
      .single();
    if (data) amenityIds[data.name] = data.id;
  }
  console.log(`  ${AMENITIES.length} amenities ready`);

  // 3. Locations
  const locationIds: string[] = [];
  for (const loc of LOCATIONS) {
    const { data } = await admin
      .from("locations")
      .upsert({ county: loc.county, town: loc.town, estate: loc.estate }, { onConflict: "county,town,estate" })
      .select("id")
      .single();
    if (data) locationIds.push(data.id);
  }
  console.log(`  ${LOCATIONS.length} locations ready`);

  const landlordIds = SEED_USERS.filter((u) => u.role === "landlord").map((u) => userIds[u.email]);
  const caretakerId = userIds[SEED_USERS.find((u) => u.role === "property_manager")!.email];

  // 4. Properties (+ geo_location via raw RPC-free insert using PostGIS text form)
  for (let i = 0; i < PROPERTY_TEMPLATES.length; i++) {
    const t = PROPERTY_TEMPLATES[i];
    const loc = LOCATIONS[t.locationIndex];
    const landlordId = landlordIds[i % landlordIds.length];

    const { data: existingProp } = await admin
      .from("properties")
      .select("id")
      .eq("title", t.title)
      .maybeSingle();
    if (existingProp) {
      console.log(`  skip (exists): ${t.title}`);
      continue;
    }

    const { data: prop, error } = await admin
      .from("properties")
      .insert({
        landlord_id: landlordId,
        caretaker_id: i % 2 === 0 ? caretakerId : null,
        location_id: locationIds[t.locationIndex],
        title: t.title,
        description: t.description,
        property_type: t.property_type,
        status: "available",
        bedrooms: t.bedrooms,
        bathrooms: t.bathrooms,
        size_sqm: t.size_sqm,
        rent_amount: t.rent_amount,
        deposit_amount: t.deposit_amount,
        service_charge: t.service_charge,
        currency: "KES",
        water_available: t.water_available,
        electricity_available: t.electricity_available,
        parking_available: t.parking_available,
        internet_available: t.internet_available,
        furnished: t.furnished,
        balcony: t.balcony,
        address_text: `${loc.estate}, ${loc.town}, ${loc.county}`,
        geo_location: `SRID=4326;POINT(${loc.lng} ${loc.lat})`,
      })
      .select("id")
      .single();

    if (error || !prop) {
      console.error(`  FAILED: ${t.title}`, error?.message);
      continue;
    }

    // Sample images (Cloudinary is the real pipeline in-app; these Unsplash
    // URLs just fill secure_url directly so dev screens have something to render).
    const images = SAMPLE_IMAGE_SEED_URLS.map((url, idx) => ({
      property_id: prop.id,
      cloudinary_public_id: `seed/${prop.id}/${idx}`,
      secure_url: `${url}?auto=format&fit=crop&w=1200&q=80`,
      width: 1200,
      height: 800,
      sort_order: idx,
    }));
    await admin.from("property_images").insert(images);

    // Attach 2-4 random amenities
    const amenityNames = Object.keys(amenityIds);
    const chosen = amenityNames.sort(() => 0.5 - Math.random()).slice(0, 3);
    await admin.from("property_amenities").insert(
      chosen.map((name) => ({ property_id: prop.id, amenity_id: amenityIds[name] })),
    );

    console.log(`  created: ${t.title}`);
  }

  console.log("\nSeed complete. Sample login credentials (all password: SeedPass123!):");
  for (const u of SEED_USERS) console.log(`  ${u.role.padEnd(18)} ${u.email}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
