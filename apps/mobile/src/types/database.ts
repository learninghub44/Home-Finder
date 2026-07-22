export type UserRole = "tenant" | "landlord" | "property_manager" | "admin";
export type PropertyStatus = "available" | "occupied" | "reserved" | "removed";
export type PropertyType =
  | "bedsitter"
  | "one_bedroom"
  | "two_bedroom"
  | "three_bedroom"
  | "apartment"
  | "bungalow"
  | "maisonette"
  | "townhouse"
  | "studio"
  | "other";
export type ViewingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rescheduled";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface Landlord {
  profile_id: string;
  business_name: string | null;
  id_verified: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface PropertyManager {
  profile_id: string;
  managed_by_landlord: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  bio: string | null;
  created_at: string;
}

export interface LocationRow {
  id: string;
  county: string;
  town: string;
  estate: string | null;
  created_at: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  cloudinary_public_id: string;
  secure_url: string;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
}

export interface PropertyVideo {
  id: string;
  property_id: string;
  cloudinary_public_id: string;
  secure_url: string;
  duration_seconds: number | null;
  sort_order: number;
  created_at: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string | null;
}

export interface Property {
  id: string;
  landlord_id: string;
  caretaker_id: string | null;
  location_id: string | null;

  title: string;
  description: string;
  property_type: PropertyType;
  status: PropertyStatus;

  bedrooms: number;
  bathrooms: number;
  size_sqm: number | null;

  rent_amount: number;
  deposit_amount: number;
  service_charge: number;
  currency: string;

  water_available: boolean;
  electricity_available: boolean;
  parking_available: boolean;
  internet_available: boolean;
  furnished: boolean;
  pets_allowed: boolean;
  balcony: boolean;
  security_features: string | null;
  house_rules: string | null;
  nearby_landmarks: string | null;

  address_text: string | null;

  view_count: number;
  favorite_count: number;

  created_at: string;
  updated_at: string;
}

/** Client-side shape after joining lat/lng out of the PostGIS geography column via RPC/view. */
export interface PropertyWithLocation extends Property {
  latitude: number | null;
  longitude: number | null;
  images: PropertyImage[];
  videos: PropertyVideo[];
  amenities: Amenity[];
  location: LocationRow | null;
  landlord: Pick<Profile, "id" | "full_name" | "avatar_url"> & {
    contact_phone: string | null;
    contact_email: string | null;
  };
  caretaker:
    | (Pick<Profile, "id" | "full_name" | "avatar_url"> & {
        contact_phone: string | null;
        contact_email: string | null;
        bio: string | null;
      })
    | null;
  distance_meters?: number;
  is_favorited?: boolean;
}

export interface Favorite {
  profile_id: string;
  property_id: string;
  created_at: string;
}

export interface ViewingRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  requested_date: string;
  requested_time: string;
  status: ViewingStatus;
  responder_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  property_id: string | null;
  participant_one: string;
  participant_two: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  profile_id: string;
  type: "message" | "viewing_update" | "saved_search" | "listing_update" | "system";
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface PushToken {
  profile_id: string;
  expo_push_token: string;
  device_info: string | null;
  created_at: string;
}

/** The subset of SearchFilters the `notify_matching_saved_searches` DB trigger matches against. */
export interface SavedSearchFilters {
  search_text?: string | null;
  min_rent?: number | null;
  max_rent?: number | null;
  bedrooms_filter?: number | null;
  property_types?: PropertyType[] | null;
  county_filter?: string | null;
  town_filter?: string | null;
}

export interface SavedSearch {
  id: string;
  profile_id: string;
  name: string;
  filters: SavedSearchFilters;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  property_id: string | null;
  reported_user_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface Review {
  id: string;
  property_id: string;
  reviewer_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  created_at: string;
}

/** Lightweight card shape returned by the `search_properties` RPC. */
export interface PropertyCard {
  id: string;
  title: string;
  property_type: PropertyType;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  deposit_amount: number;
  currency: string;
  furnished: boolean;
  cover_image_url: string | null;
  image_count: number;
  county: string | null;
  town: string | null;
  estate: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_meters: number | null;
  favorite_count: number;
  is_favorited: boolean;
  created_at: string;
}

export type SortBy = "newest" | "price_asc" | "price_desc" | "nearest";

/** Params accepted by the `search_properties` RPC — mirror its SQL signature. */
export interface SearchFilters {
  viewer_id?: string | null;
  search_text?: string | null;
  min_rent?: number | null;
  max_rent?: number | null;
  bedrooms_filter?: number | null;
  property_types?: PropertyType[] | null;
  amenity_ids?: string[] | null;
  county_filter?: string | null;
  town_filter?: string | null;
  property_ids?: string[] | null;
  user_lat?: number | null;
  user_lng?: number | null;
  radius_meters?: number | null;
  sort_by?: SortBy;
  page_limit?: number;
  page_offset?: number;
}

/** Full joined shape returned by the `property_details` RPC. */
export interface PropertyDetailsResponse {
  id: string;
  landlord_id: string;
  caretaker_id: string | null;
  title: string;
  description: string;
  property_type: PropertyType;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number | null;
  rent_amount: number;
  deposit_amount: number;
  service_charge: number;
  currency: string;
  water_available: boolean;
  electricity_available: boolean;
  parking_available: boolean;
  internet_available: boolean;
  furnished: boolean;
  pets_allowed: boolean;
  balcony: boolean;
  security_features: string | null;
  house_rules: string | null;
  nearby_landmarks: string | null;
  address_text: string | null;
  latitude: number | null;
  longitude: number | null;
  view_count: number;
  favorite_count: number;
  created_at: string;
  updated_at: string;
  location: LocationRow | null;
  images: PropertyImage[];
  videos: PropertyVideo[];
  amenities: Amenity[];
  landlord: Pick<Profile, "id" | "full_name" | "avatar_url"> & {
    contact_phone: string | null;
    contact_email: string | null;
    business_name: string | null;
    id_verified: boolean;
  };
  caretaker:
    | (Pick<Profile, "id" | "full_name" | "avatar_url"> & {
        contact_phone: string | null;
        contact_email: string | null;
        bio: string | null;
      })
    | null;
  is_favorited: boolean;
}

/** Row shape returned by the `platform_analytics` RPC — admin dashboard stat rollup. */
export interface PlatformAnalytics {
  total_users: number;
  total_tenants: number;
  total_landlords: number;
  total_caretakers: number;
  suspended_users: number;
  total_properties: number;
  available_properties: number;
  occupied_properties: number;
  reserved_properties: number;
  removed_properties: number;
  total_views: number;
  total_favorites: number;
  open_reports: number;
  pending_viewing_requests: number;
  new_users_last_30d: number;
  new_properties_last_30d: number;
}

/**
 * Minimal Supabase generated-types shape. Once the schema is finalized, replace this
 * with the real output of `supabase gen types typescript` for full query-builder safety.
 */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      landlords: { Row: Landlord; Insert: Partial<Landlord>; Update: Partial<Landlord> };
      property_managers: {
        Row: PropertyManager;
        Insert: Partial<PropertyManager>;
        Update: Partial<PropertyManager>;
      };
      locations: { Row: LocationRow; Insert: Partial<LocationRow>; Update: Partial<LocationRow> };
      properties: { Row: Property; Insert: Partial<Property>; Update: Partial<Property> };
      property_images: {
        Row: PropertyImage;
        Insert: Partial<PropertyImage>;
        Update: Partial<PropertyImage>;
      };
      property_videos: {
        Row: PropertyVideo;
        Insert: Partial<PropertyVideo>;
        Update: Partial<PropertyVideo>;
      };
      amenities: { Row: Amenity; Insert: Partial<Amenity>; Update: Partial<Amenity> };
      favorites: { Row: Favorite; Insert: Partial<Favorite>; Update: Partial<Favorite> };
      viewing_requests: {
        Row: ViewingRequest;
        Insert: Partial<ViewingRequest>;
        Update: Partial<ViewingRequest>;
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation>;
        Update: Partial<Conversation>;
      };
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message> };
      notifications: {
        Row: AppNotification;
        Insert: Partial<AppNotification>;
        Update: Partial<AppNotification>;
      };
      push_tokens: { Row: PushToken; Insert: Partial<PushToken>; Update: Partial<PushToken> };
      saved_searches: {
        Row: SavedSearch;
        Insert: Partial<SavedSearch>;
        Update: Partial<SavedSearch>;
      };
      reports: { Row: Report; Insert: Partial<Report>; Update: Partial<Report> };
      reviews: { Row: Review; Insert: Partial<Review>; Update: Partial<Review> };
    };
    Functions: {
      search_properties: { Args: SearchFilters; Returns: PropertyCard[] };
      property_details: {
        Args: { target_property_id: string; viewer_id?: string | null };
        Returns: PropertyDetailsResponse;
      };
      increment_property_view: {
        Args: { target_property_id: string };
        Returns: void;
      };
      get_or_create_conversation: {
        Args: { other_profile_id: string; for_property_id?: string | null };
        Returns: string;
      };
      get_my_conversations: {
        Args: Record<string, never>;
        Returns: unknown[];
      };
      platform_analytics: {
        Args: Record<string, never>;
        Returns: PlatformAnalytics[];
      };
    };
  };
}
