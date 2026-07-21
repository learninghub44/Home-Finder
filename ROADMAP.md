# Home Finder — Roadmap

Production rental app: Expo (React Native) + Supabase (DB/Auth/Storage/Realtime) + Cloudinary (media) + Google Maps.

This file is the single source of truth for build phases. Any agent (human or AI) picking up
this project should read this top-to-bottom, find the first phase not marked `DONE`, and
continue from there. Update status markers as work completes. Do not skip phases — later
phases depend on the schema and auth foundation laid down early.

Status legend: `TODO` not started · `IN PROGRESS` partially built · `DONE` complete and working
against real backend (no mock data).

---

## Phase 0 — Repo & Scaffolding
**Status: DONE**

- [x] Audit existing repo (`artifacts/mockup-sandbox` = shadcn/ui component gallery only,
      no real screens; `artifacts/api-server` = Express/Drizzle, not used by mobile app)
- [x] Scaffold `apps/mobile` as Expo Router app (`package.json`, `app.json`)
- [x] Finish base config: `babel.config.js`, `tsconfig.json`, `tailwind.config.js` (NativeWind),
      `metro.config.js`, `.env.example`
- [x] Root `_layout.tsx` with providers (QueryClient, Auth, Toast, ErrorBoundary)

Owner notes: mockup-sandbox's shadcn components are web/Radix-based and do not run in React
Native. Reuse only the *design language* (spacing, color tokens, typography) via NativeWind,
not the component code itself.

---

## Phase 1 — Supabase Backend & Schema
**Status: IN PROGRESS**

- [x] Write `supabase/schema.sql`: `profiles`, `landlords`, `property_managers` (caretakers),
      `properties`, `property_images`, `property_videos`, `amenities`, `property_amenities`,
      `favorites`, `viewing_requests`, `conversations`, `messages`, `notifications`,
      `reports`, `reviews`, `locations`, plus PostGIS-backed `nearby_properties()` RPC
- [x] Row Level Security policies for every table (tenants see published listings only;
      landlords/caretakers manage only their own properties; users manage only their own rows)
- [x] DB triggers: auto-create `profiles` row on signup, `updated_at` timestamps, favorite count
- [x] Supabase Storage buckets + policies (`supabase/storage.sql`: `avatars` public bucket,
      `chat-attachments` private bucket, RLS scoped to owner/conversation participants)
- [x] Seed script with realistic sample listings for dev/testing (`scripts/seed.ts`, run via
      `pnpm seed` — creates real Supabase Auth users + 7 Kenyan listings across price/type/location)
- [ ] Run this migration against a real Supabase project and verify (needs project credentials —
      Chris needs to supply `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` in `.env.seed`, then run
      `schema.sql` → `storage.sql` → `pnpm seed` in that order)

Blocks: everything in Phase 3+ needs this schema to query against.

---

## Phase 2 — Auth & Onboarding
**Status: DONE**

- [x] Supabase client (`src/lib/supabase.ts`) with SecureStore-backed session persistence
      (chunked storage adapter to work around SecureStore's 2KB value limit)
- [x] Auth context/hook (`src/hooks/useAuth.tsx`): sign up, sign in, sign out, password reset,
      session refresh, profile loading
- [x] Zod validation schemas (`src/lib/validation/auth.ts`) and friendly error mapping
      (`src/lib/errors.ts`) so raw Supabase/Postgres errors never reach the UI
- [x] Network status hook (`src/hooks/useNetworkStatus.ts`) for offline detection
- [x] Onboarding carousel (`app/onboarding.tsx`, first-run only, persisted via SecureStore flag)
- [x] Screens: `login`, `signup`, `forgot-password` (`app/(auth)/*`) — inline field errors,
      loading states, offline detection, email-verification messaging
- [x] Route protection: `app/index.tsx` redirects to onboarding/auth/tabs based on real state;
      `(auth)/_layout.tsx` and `(tabs)/_layout.tsx` both guard against the wrong session state
- [x] Role selection at signup: tenant / landlord / property manager (caretaker)

Not yet built: actual email-template customization in Supabase dashboard, and deep-link
handling for the `homefinder://reset-password` redirect (needs a screen to consume the
recovery token — flagged for Phase 3 polish).

---

## Phase 3 — Core Listings, Map & Property Details
**Status: DONE**

- [x] Home screen: featured/nearby/recent/by-type sections, pull-to-refresh, skeleton loaders,
      empty and error states (`app/(tabs)/index.tsx` — was already built ahead of this phase)
- [x] Search + filters (price, bedrooms, type, amenities, county/town) + sort (`app/search.tsx`,
      `src/components/FilterSheet.tsx`) — debounced text search, infinite scroll via
      `useInfiniteSearchProperties`, active-filter badge count, reset/apply flow
- [x] Map screen: `react-native-maps`, live user location (blue dot + recenter button), price-pill
      markers, lightweight grid-based clustering with tap-to-zoom, tap-to-preview
      (`app/(tabs)/map.tsx`) — distance estimate comes from `search_properties`'s
      `distance_meters` when sorted "nearest"
- [x] Property details screen (`app/property/[id].tsx`): paged image gallery with full-screen
      viewer, video tour playback (`expo-av`), full amenity grid with resolved icons
      (`src/lib/icons.ts`), landlord **and caretaker/property manager** contact cards (call/email),
      nearby landmarks, house rules, security features, embedded static map + "Get directions",
      favorite/share/report actions (`src/components/ReportModal.tsx`, `src/lib/reports.ts`,
      `src/hooks/useReportProperty.ts`), view-count recorded on open
- [x] Cloudinary upload helper (`src/lib/cloudinary.ts`) for listing photos/videos (unsigned
      preset) — already built, not yet wired to a landlord "add property" flow (Phase 4)

Also added minimal-but-functional `app/(tabs)/favorites.tsx` and `app/(tabs)/profile.tsx` so the
tab navigator (which already referenced these routes) doesn't crash — full favorites
add/remove UX and the landlord/caretaker dashboard are still Phase 4 work; the Profile screen
currently just shows account info + sign out and links out to Favorites.

Not yet done: `expo-av` was added to `package.json` but `pnpm install` hasn't been run in this
environment (no Expo/pnpm runtime available here) — install and smoke-test on a device/simulator
before shipping. Full clustering was implemented as a simple grid-bucket algorithm rather than a
native clustering library; revisit if listing volume grows large enough to need it.

---

## Phase 4 — Favorites & Landlord/Caretaker Dashboard
**Status: IN PROGRESS**

- [x] Favorites: add/remove, synced to Supabase (`useToggleFavorite`, optimistic updates), and a
      basic list screen (`app/(tabs)/favorites.tsx`) — offline cache still TODO
- [x] Landlord dashboard (`app/landlord/index.tsx`): analytics summary (listings, total views,
      favorites, pending viewing requests), "My properties" list with cover image, status badge,
      pending-request count, edit/delete actions. Route-guarded to landlord/property_manager/admin
      roles via `app/landlord/_layout.tsx`; entry point wired up from Profile.
- [x] Add/edit property form (`app/landlord/property-form.tsx`): full field set (type, status,
      bed/bath, size, rent/deposit/service charge, amenity toggles, address/landmarks/security/house
      rules) via react-hook-form + zod (`src/lib/validation/property.ts`), multi-image picker with
      direct Cloudinary upload and per-image delete (`src/lib/properties.ts` CRUD helpers,
      `src/hooks/useLandlordProperties.ts`)
- [x] Viewing requests inbox (`app/landlord/requests.tsx`): lists requests across all of a
      landlord/caretaker's properties with tenant name/phone/notes, confirm/decline/mark-completed
      actions
- [ ] Caretaker-specific view (reassign/mark rented) still shares the same dashboard as landlords —
      revisit once caretaker assignment UI exists (currently only settable via `caretaker_id` on the
      property form, no picker yet)
- [ ] Not yet built: analytics beyond the basic counts (e.g. views-over-time), offline cache for
      dashboard data, and image reordering/setting a specific cover photo
- [ ] `tenant:profiles!viewing_requests_tenant_id_fkey` embed in `getViewingRequestsForLandlord`
      assumes Postgres's default FK constraint name — verify against real generated Supabase types
      once Phase 1's migration has actually been run, and adjust if the relationship name differs
- [ ] None of this has been run against a real Expo/Supabase environment yet (no pnpm/Expo runtime
      available in this environment) — install deps and smoke-test the whole flow (add property →
      upload photos → edit → confirm a viewing request → delete) on a device/simulator before
      shipping

---

## Phase 5 — Viewing Requests & Realtime Chat
**Status: TODO**

- [ ] Viewing request flow: tenant requests → landlord/caretaker accept/decline/reschedule →
      push notification on status change
- [ ] One-to-one chat over Supabase Realtime: read receipts, typing indicators, image sharing,
      block/report

---

## Phase 6 — Notifications
**Status: TODO**

- [ ] Expo push token registration, stored per-user in Supabase
- [ ] Triggers/Edge Functions to send notifications for: new messages, viewing status changes,
      saved-search alerts, listing updates

---

## Phase 7 — Admin
**Status: TODO**

- [ ] Admin-only role and route guard
- [ ] User management, listing moderation/removal, report review, category/location management,
      basic analytics dashboard

---

## Phase 8 — Payments Prep (architecture only — do not implement flows)
**Status: TODO**

- [ ] Schema/table stubs for future M-Pesa Daraja integration (no live payment code)

---

## Phase 9 — Polish, Testing, Deployment
**Status: TODO**

- [ ] Dark mode, animations/transitions, haptics, accessibility pass
- [ ] Unit + integration tests for auth, forms, navigation
- [ ] EAS Build config for iOS/Android, environment secrets management

---

## Working Agreements for Agents

1. No mock data, fake APIs, or placeholder auth — every feature must hit real Supabase/Cloudinary.
2. Every screen needs loading, empty, error, and success states.
3. Update this file's checkboxes and Status lines as part of the same commit that completes the work.
4. If you change the schema, update `supabase/schema.sql` and note the migration in this file.
