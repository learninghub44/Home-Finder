import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { ResizeMode, Video } from "expo-av";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Car,
  Droplet,
  Flag,
  Heart,
  Mail,
  MessageCircle,
  Phone,
  Ruler,
  Share2,
  Shield,
  ShieldCheck,
  Sofa,
  Wifi,
  Zap,
} from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { usePropertyDetails, useRecordPropertyView, useToggleFavorite } from "@/hooks/useProperties";
import { useReportProperty } from "@/hooks/useReportProperty";
import { useCreateViewingRequest } from "@/hooks/useViewingRequests";
import { useStartConversation } from "@/hooks/useChat";
import { ImageGallery } from "@/components/ImageGallery";
import { ReportModal } from "@/components/ReportModal";
import { RequestViewingModal } from "@/components/RequestViewingModal";
import { ErrorState } from "@/components/ErrorState";
import { AppButton } from "@/components/AppButton";
import { resolveAmenityIcon } from "@/lib/icons";
import {
  formatBedsBaths,
  formatCurrency,
  formatLocation,
  formatPropertyType,
  formatRentPerMonth,
} from "@/lib/format";

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { data: property, isLoading, isError, refetch } = usePropertyDetails(id);
  const recordView = useRecordPropertyView(id);
  const toggleFavorite = useToggleFavorite();
  const reportProperty = useReportProperty();
  const createViewingRequest = useCreateViewingRequest();
  const startConversation = useStartConversation();
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);

  useEffect(() => {
    recordView();
    // Only fire once per screen visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#2C7A4B" />
      </View>
    );
  }

  if (isError || !property) {
    return (
      <View className="flex-1 bg-white pt-14 dark:bg-surface-dark">
        <Pressable onPress={() => router.back()} className="px-4" accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <ErrorState message="This listing couldn't be loaded. It may have been removed." onRetry={refetch} />
      </View>
    );
  }

  const handleToggleFavorite = () => {
    if (!profile?.id) {
      router.push("/(auth)/login");
      return;
    }
    toggleFavorite.mutate({ propertyId: property.id, isFavorited: property.is_favorited });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${property.title} — ${formatRentPerMonth(property.rent_amount, property.currency)}\nhomefinder://property/${property.id}`,
      });
    } catch {
      // Non-fatal — user simply cancelled the share sheet.
    }
  };

  const handleCall = (phone: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string | null) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(`Inquiry: ${property.title}`)}`);
  };

  const handleDirections = () => {
    if (property.latitude == null || property.longitude == null) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`;
    Linking.openURL(url);
  };

  const handleMessage = (otherProfileId: string | undefined) => {
    if (!otherProfileId) return;
    if (!profile?.id) {
      router.push("/(auth)/login");
      return;
    }
    startConversation.mutate(
      { otherProfileId, propertyId: property.id },
      { onSuccess: (conversationId) => router.push(`/chat/${conversationId}`) },
    );
  };

  const featureFlags: { label: string; active: boolean; icon: typeof Droplet }[] = [
    { label: "Water", active: property.water_available, icon: Droplet },
    { label: "Electricity", active: property.electricity_available, icon: Zap },
    { label: "Parking", active: property.parking_available, icon: Car },
    { label: "Internet", active: property.internet_available, icon: Wifi },
    { label: "Furnished", active: property.furnished, icon: Sofa },
  ];

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <ScrollView contentContainerClassName="pb-32">
        <View>
          <ImageGallery images={property.images} height={320} />

          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="absolute left-4 top-14 h-10 w-10 items-center justify-center rounded-full bg-black/40"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>

          <View className="absolute right-4 top-14 flex-row gap-2">
            <Pressable
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share this listing"
              className="h-10 w-10 items-center justify-center rounded-full bg-black/40"
            >
              <Share2 size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={handleToggleFavorite}
              accessibilityRole="button"
              accessibilityLabel={property.is_favorited ? "Remove from favorites" : "Save to favorites"}
              className="h-10 w-10 items-center justify-center rounded-full bg-black/40"
            >
              <Heart size={18} color="#FFFFFF" fill={property.is_favorited ? "#FFFFFF" : "transparent"} />
            </Pressable>
          </View>
        </View>

        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="rounded-full bg-brand-50 px-2.5 py-1 dark:bg-brand-800">
              <Text className="text-xs font-semibold text-brand-700 dark:text-brand-200">
                {formatPropertyType(property.property_type)}
              </Text>
            </View>
            {property.status !== "available" ? (
              <View className="rounded-full bg-warning/15 px-2.5 py-1">
                <Text className="text-xs font-semibold text-warning">
                  {property.status === "occupied" ? "Occupied" : "Reserved"}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="mt-2 text-2xl font-bold text-brand-900 dark:text-white">{property.title}</Text>
          <Text className="mt-1 text-sm text-gray-500">
            {formatLocation(property.location?.town ?? null, property.location?.county ?? null, property.location?.estate)}
          </Text>

          <View className="mt-3 flex-row items-baseline gap-2">
            <Text className="text-2xl font-bold text-brand-500">
              {formatRentPerMonth(property.rent_amount, property.currency)}
            </Text>
          </View>
          <Text className="mt-0.5 text-xs text-gray-500">
            Deposit {formatCurrency(property.deposit_amount, property.currency)}
            {property.service_charge > 0
              ? ` · Service charge ${formatCurrency(property.service_charge, property.currency)}/mo`
              : ""}
          </Text>

          {/* Key facts */}
          <View className="mt-5 flex-row justify-between rounded-2xl bg-muted-light p-4 dark:bg-muted-dark">
            <Fact icon={BedDouble} label={formatBedsBaths(property.bedrooms, property.bathrooms).split(" · ")[0]} />
            <Fact icon={Bath} label={`${property.bathrooms} bath${property.bathrooms > 1 ? "s" : ""}`} />
            {property.size_sqm ? <Fact icon={Ruler} label={`${property.size_sqm} m²`} /> : null}
            <Fact icon={Building2} label={property.furnished ? "Furnished" : "Unfurnished"} />
          </View>

          {/* Feature chips */}
          <View className="mt-5 flex-row flex-wrap gap-2">
            {featureFlags
              .filter((f) => f.active)
              .map((f) => (
                <View
                  key={f.label}
                  className="flex-row items-center rounded-full border border-gray-200 px-3 py-1.5 dark:border-gray-700"
                >
                  <f.icon size={14} color="#2C7A4B" />
                  <Text className="ml-1.5 text-xs font-medium text-brand-900 dark:text-white">{f.label}</Text>
                </View>
              ))}
          </View>

          {/* Description */}
          <Section title="About this place">
            <Text className="text-sm leading-6 text-gray-600 dark:text-gray-300">{property.description}</Text>
          </Section>

          {/* Amenities */}
          {property.amenities.length > 0 ? (
            <Section title="Amenities">
              <View className="flex-row flex-wrap gap-y-4">
                {property.amenities.map((a) => {
                  const Icon = resolveAmenityIcon(a.icon);
                  return (
                    <View key={a.id} className="w-1/2 flex-row items-center pr-2">
                      <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-800">
                        <Icon size={16} color="#2C7A4B" />
                      </View>
                      <Text className="flex-1 text-sm text-brand-900 dark:text-white">{a.name}</Text>
                    </View>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {/* Video tour */}
          {property.videos.length > 0 ? (
            <Section title="Video tour">
              {property.videos.map((v) => (
                <Video
                  key={v.id}
                  source={{ uri: v.secure_url }}
                  style={{ width: "100%", height: 220, borderRadius: 16, marginBottom: 12 }}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  isLooping={false}
                />
              ))}
            </Section>
          ) : null}

          {/* Security & house rules */}
          {property.security_features ? (
            <Section title="Security">
              <View className="flex-row items-start">
                <Shield size={16} color="#2C7A4B" style={{ marginTop: 2 }} />
                <Text className="ml-2 flex-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {property.security_features}
                </Text>
              </View>
            </Section>
          ) : null}

          {property.house_rules ? (
            <Section title="House rules">
              <Text className="text-sm leading-6 text-gray-600 dark:text-gray-300">{property.house_rules}</Text>
            </Section>
          ) : null}

          {property.nearby_landmarks ? (
            <Section title="Nearby landmarks">
              <Text className="text-sm leading-6 text-gray-600 dark:text-gray-300">{property.nearby_landmarks}</Text>
            </Section>
          ) : null}

          {/* Map preview */}
          {property.latitude != null && property.longitude != null ? (
            <Section title="Location">
              <View className="overflow-hidden rounded-2xl">
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={{ width: "100%", height: 160 }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  initialRegion={{
                    latitude: property.latitude,
                    longitude: property.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker coordinate={{ latitude: property.latitude, longitude: property.longitude }} />
                </MapView>
              </View>
              {property.address_text ? (
                <Text className="mt-2 text-xs text-gray-500">{property.address_text}</Text>
              ) : null}
              <View className="mt-3">
                <AppButton label="Get directions" variant="secondary" onPress={handleDirections} />
              </View>
            </Section>
          ) : null}

          {/* Landlord */}
          <Section title="Listed by">
            <ContactCard
              name={property.landlord.full_name ?? property.landlord.business_name ?? "Landlord"}
              subtitle={property.landlord.business_name}
              avatarUrl={property.landlord.avatar_url}
              verified={property.landlord.id_verified}
              onCall={() => handleCall(property.landlord.contact_phone)}
              onEmail={() => handleEmail(property.landlord.contact_email)}
              onMessage={() => handleMessage(property.landlord.id)}
              hasPhone={!!property.landlord.contact_phone}
              hasEmail={!!property.landlord.contact_email}
            />
          </Section>

          {/* Caretaker */}
          {property.caretaker ? (
            <Section title="Property manager / caretaker">
              <ContactCard
                name={property.caretaker.full_name ?? "Caretaker"}
                subtitle={property.caretaker.bio}
                avatarUrl={property.caretaker.avatar_url}
                onCall={() => handleCall(property.caretaker!.contact_phone)}
                onEmail={() => handleEmail(property.caretaker!.contact_email)}
                onMessage={() => handleMessage(property.caretaker!.id)}
                hasPhone={!!property.caretaker.contact_phone}
                hasEmail={!!property.caretaker.contact_email}
              />
            </Section>
          ) : null}

          <Pressable
            onPress={() => setReportModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Report this listing"
            className="mt-6 flex-row items-center justify-center py-2"
          >
            <Flag size={14} color="#8A968E" />
            <Text className="ml-1.5 text-xs text-gray-500">Report this listing</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View className="absolute bottom-0 left-0 right-0 flex-row gap-3 border-t border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-surface-dark">
        <Pressable
          onPress={() => handleCall(property.landlord.contact_phone ?? property.caretaker?.contact_phone ?? null)}
          accessibilityRole="button"
          accessibilityLabel="Call"
          className="h-12 w-12 items-center justify-center rounded-xl border border-brand-500"
        >
          <Phone size={18} color="#2C7A4B" />
        </Pressable>
        <View className="flex-1">
          <AppButton
            label="Request a viewing"
            onPress={() => {
              if (!profile?.id) {
                router.push("/(auth)/login");
                return;
              }
              setRequestModalVisible(true);
            }}
          />
        </View>
      </View>

      <ReportModal
        visible={reportModalVisible}
        isSubmitting={reportProperty.isPending}
        onClose={() => setReportModalVisible(false)}
        onSubmit={(reason, details) => {
          if (!profile?.id) {
            setReportModalVisible(false);
            router.push("/(auth)/login");
            return;
          }
          reportProperty.mutate(
            { propertyId: property.id, reportedUserId: property.landlord_id, reason, details },
            { onSuccess: () => setReportModalVisible(false) },
          );
        }}
      />

      <RequestViewingModal
        visible={requestModalVisible}
        isSubmitting={createViewingRequest.isPending}
        onClose={() => setRequestModalVisible(false)}
        onSubmit={({ requestedDate, requestedTime, notes }) => {
          createViewingRequest.mutate(
            { propertyId: property.id, requestedDate, requestedTime, notes },
            { onSuccess: () => setRequestModalVisible(false) },
          );
        }}
      />
    </View>
  );
}

function Fact({ icon: Icon, label }: { icon: typeof BedDouble; label: string }) {
  return (
    <View className="items-center">
      <Icon size={18} color="#2C7A4B" />
      <Text className="mt-1 text-xs font-medium text-brand-900 dark:text-white">{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      <Text className="mb-2 text-base font-bold text-brand-900 dark:text-white">{title}</Text>
      {children}
    </View>
  );
}

function ContactCard({
  name,
  subtitle,
  avatarUrl,
  verified,
  onCall,
  onEmail,
  onMessage,
  hasPhone,
  hasEmail,
}: {
  name: string;
  subtitle?: string | null;
  avatarUrl: string | null;
  verified?: boolean;
  onCall: () => void;
  onEmail: () => void;
  onMessage: () => void;
  hasPhone: boolean;
  hasEmail: boolean;
}) {
  return (
    <View className="flex-row items-center rounded-2xl bg-muted-light p-3 dark:bg-muted-dark">
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-800">
          <Text className="text-base font-bold text-brand-700 dark:text-brand-200">
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="font-semibold text-brand-900 dark:text-white">{name}</Text>
          {verified ? <ShieldCheck size={14} color="#2C7A4B" style={{ marginLeft: 4 }} /> : null}
        </View>
        {subtitle ? (
          <Text numberOfLines={1} className="text-xs text-gray-500">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={onMessage}
          accessibilityRole="button"
          accessibilityLabel={`Message ${name}`}
          className="h-9 w-9 items-center justify-center rounded-full border border-brand-500"
        >
          <MessageCircle size={15} color="#2C7A4B" />
        </Pressable>
        {hasPhone ? (
          <Pressable
            onPress={onCall}
            accessibilityRole="button"
            accessibilityLabel={`Call ${name}`}
            className="h-9 w-9 items-center justify-center rounded-full bg-brand-500"
          >
            <Phone size={15} color="#FFFFFF" />
          </Pressable>
        ) : null}
        {hasEmail ? (
          <Pressable
            onPress={onEmail}
            accessibilityRole="button"
            accessibilityLabel={`Email ${name}`}
            className="h-9 w-9 items-center justify-center rounded-full border border-brand-500"
          >
            <Mail size={15} color="#2C7A4B" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
