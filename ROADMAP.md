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
**Status: IN PROGRESS — code-complete, execution pending against a real project**

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
      `pnpm seed` — creates real Supabase Auth users + 7 Kenyan listings across price/type/location).
      Fixed a bug where the "refuse to seed anything that looks like production" guardrail was
      dead code (an empty `if` block) — it now actually exits with an error unless
      `ALLOW_PROD_SEED=true` is set.
- [x] Re-audited `schema.sql` and `storage.sql` end-to-end for correctness — no further issues found.
- [ ] Run this migration against a real Supabase project and verify (still needs project
      credentials — Chris needs to supply `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` in
      `.env.seed`, then run `schema.sql` → `storage.sql` → `pnpm seed` in that order. This step
      requires a human/local run: no AI agent working in a sandboxed environment can reach
      `*.supabase.co` to execute it directly.)

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
**Status: IN PROGRESS — feature-complete pending device smoke-test**

- [x] Favorites: add/remove, synced to Supabase (`useToggleFavorite`, optimistic updates), and a
      basic list screen (`app/(tabs)/favorites.tsx`). Favorite ids now persist offline via
      `@tanstack/react-query-persist-client` + AsyncStorage (see root `_layout.tsx`).
- [x] Landlord dashboard (`app/landlord/index.tsx`): analytics summary (listings, total views,
      favorites, pending viewing requests), "My properties" list with cover image, status badge,
      pending-request count, edit/delete actions. Route-guarded to landlord/property_manager/admin
      roles via `app/landlord/_layout.tsx`; entry point wired up from Profile. Delete action is now
      hidden for the `property_manager` (caretaker) role, since RLS only allows the landlord to
      delete — previously caretakers saw a delete button that would silently fail.
- [x] Add/edit property form (`app/landlord/property-form.tsx`): full field set (type, status,
      bed/bath, size, rent/deposit/service charge, amenity toggles, address/landmarks/security/house
      rules) via react-hook-form + zod (`src/lib/validation/property.ts`), multi-image picker with
      direct Cloudinary upload and per-image delete (`src/lib/properties.ts` CRUD helpers,
      `src/hooks/useLandlordProperties.ts`). Added a caretaker-assignment picker (chip list of the
      landlord's caretakers, sourced from `property_managers.managed_by_landlord`) and photo
      reordering with a visible "Cover" badge on the first photo — reordering persists
      `sort_order` immediately via `reorderPropertyImages`.
- [x] Viewing requests inbox (`app/landlord/requests.tsx`): lists requests across all of a
      landlord/caretaker's properties with tenant name/phone/notes, confirm/decline/mark-completed
      actions
- [x] `getViewingRequestsForLandlord` no longer guesses a Postgres FK constraint name for the
      tenant embed — it now fetches tenant profiles in a separate batched query, so there's nothing
      to re-verify once real Supabase types exist.
- [x] Basic offline cache for favorites and the landlord dashboard (properties + viewing requests)
      via a `PersistQueryClientProvider` scoped to just those query-key prefixes — search results
      and property details intentionally stay in-memory-only so they're never served stale.
- [x] Caretaker-specific dashboard behavior: caretakers no longer see the "Add property" button
      (RLS only allows the landlord to insert), and both roles get a quick "Mark occupied /
      Mark available" toggle on each listing that skips the full edit form — the "mark rented"
      shortcut called out here. Full reassignment is a landlord-side action via the caretaker
      picker added to the property form.
- [x] Analytics beyond basic counts: added a real views-over-time data path — a new
      `property_view_events` log table (written by `increment_property_view`, same
      SECURITY DEFINER function, no new write surface), a `landlord_views_over_time` RPC that
      day-buckets counts across a landlord/caretaker's properties, and a dependency-free SVG bar
      chart (`ViewsOverTimeChart.tsx`, built on the already-installed `react-native-svg`) on the
      dashboard.
- [ ] None of this has been run against a real Expo/Supabase environment yet (no pnpm/Expo runtime
      available in this sandbox, and no live Supabase project to hit — see Phase 1) — install deps
      and smoke-test the whole flow (add property → upload photos → reorder/set cover → assign
      caretaker → edit → confirm a viewing request → delete) on a device/simulator before shipping.

---

## Phase 5 — Viewing Requests & Realtime Chat
**Status: Built, not yet run against a real Expo/Supabase environment**

- [x] Viewing request flow: tenant requests via `RequestViewingModal` on the property page →
      landlord/caretaker confirm/decline/mark-completed or propose a new time
      (`app/landlord/requests.tsx`) → tenant accepts/declines the proposed time
      (`app/my-requests.tsx`). Status changes write to the `notifications` table via new DB
      triggers (`notify_viewing_request_change`) — turning those into push notifications is
      Phase 6.
- [x] One-to-one chat over Supabase Realtime (`app/(tabs)/messages.tsx`, `app/chat/[id].tsx`):
      conversation list with unread counts and last-message preview, live message delivery via
      `postgres_changes`, read receipts (auto-marks read on open). "Message" entry points added
      to the property page's landlord/caretaker cards and the landlord requests inbox.
- [ ] Not built: typing indicators, sending images from the chat composer (the message bubble
      *renders* `image_url` if present, but there's no picker/upload wired to the send button
      yet), block/report from within a chat.
- [ ] Schema additions for this phase (read-receipt RLS policy, `get_or_create_conversation`,
      `get_my_conversations`, the two notification triggers, and adding `messages` to the
      `supabase_realtime` publication) are appended to the bottom of `schema.sql` — re-run the
      full file against the Supabase project once Phase 1 happens; every statement here is
      idempotent (`create or replace`, `drop trigger if exists`, a guarded publication check) so
      it's safe alongside the parts you may have already run.
- [ ] Untested end-to-end — no pnpm/Expo runtime available in this sandbox (see Phase 1). Smoke
      test before shipping: request a viewing → landlord proposes a new time → tenant accepts →
      landlord marks completed; also send messages both directions and confirm unread counts and
      read receipts behave, and that realtime delivery works with the app backgrounded/foregrounded.

---

## Phase 6 — Notifications
**Status: Built, not yet run against a real Expo/Supabase environment**

- [x] Expo push token registration: `src/lib/pushNotifications.ts` requests permission and fetches
      the device's Expo push token (skips gracefully on simulators or if no EAS project is
      configured), upserted into `push_tokens` automatically whenever a profile loads
      (wired into `useAuth`'s session effect). **Requires `eas init`** — `app.json`'s
      `extra.eas.projectId` is currently a placeholder (`REPLACE_WITH_EAS_PROJECT_ID`); replace it
      with the real project ID or push tokens will never be issued.
- [x] Delivery: `supabase/functions/send-push/index.ts`, an Edge Function that takes a
      `notifications` insert webhook payload, looks up the recipient's tokens, and forwards to
      Expo's push API (cleans up tokens Expo reports as `DeviceNotRegistered`). **Manual one-time
      step once deployed**: Dashboard → Database → Webhooks → new webhook on `notifications`
      insert → target the `send-push` function (see the comment at the bottom of `schema.sql`) —
      this can't be done from SQL since it needs the deployed function's project-specific URL.
- [x] New-message and viewing-status-change notifications: already wired in Phase 5
      (`notify_new_message`, `notify_viewing_request_change` triggers) — this phase adds the push
      delivery layer on top, they needed no changes.
- [x] Saved-search alerts: new `saved_searches` table (RLS owner-only) + `notify_matching_saved_searches`
      trigger, fires when a listing becomes available and matches a saved filter set (rent range,
      bedrooms, county/town, property type — free-text and amenities aren't matched by the trigger,
      see the comment in `schema.sql`). UI: "Save this search" on the Search screen
      (`app/search.tsx`), manage/apply at `app/saved-searches.tsx` (Profile → Saved searches).
- [x] Listing-update alerts: new `notify_favorited_listing_update` trigger — notifies everyone who
      favorited a listing on a price drop or a status change away from "available".
- [x] In-app notifications inbox (`app/notifications.tsx`, bell icon + unread badge on the Home
      tab): list, mark-one/mark-all read, tap-to-navigate. Same tap routing
      (`resolveNotificationRoute` in `src/lib/notifications.ts`) is reused for actual push-tap
      handling in `app/_layout.tsx`, so opening the app from a notification and tapping it in the
      in-app inbox land in the same place.
- [ ] Known gaps: no unregister-push-token-on-sign-out (a stale token just sits in `push_tokens`
      until overwritten by the next login on that device — harmless, but not cleaned up); no retry
      logic in `send-push` beyond what Expo's push API itself does.
- [ ] Untested end-to-end — no pnpm/Expo runtime available in this sandbox (see Phase 1), and push
      additionally requires a deployed Supabase project + EAS project + a physical device (the
      simulator/emulator never gets a push token). Before shipping: run `eas init`, deploy the
      Edge Function (`supabase functions deploy send-push`), wire the Database Webhook, then check
      a device receives a push for each of: new message, viewing request status change, a saved
      search match, and a price drop/listing status change on a favorited property.

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
