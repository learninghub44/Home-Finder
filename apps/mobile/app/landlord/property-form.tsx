import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Star, X } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { FormField } from "@/components/FormField";
import { AppButton } from "@/components/AppButton";
import { Chip } from "@/components/Chip";
import { ErrorState } from "@/components/ErrorState";
import { uploadToCloudinary, type CloudinaryUploadResult } from "@/lib/cloudinary";
import {
  useCreateProperty,
  useDeletePropertyImage,
  useMyCaretakers,
  usePropertyForEdit,
  usePropertyImagesForEdit,
  useReorderPropertyImages,
  useUpdateProperty,
} from "@/hooks/useLandlordProperties";
import {
  DEFAULT_PROPERTY_FORM_VALUES,
  PROPERTY_STATUS_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  propertyFormSchema,
  type PropertyFormValues,
} from "@/lib/validation/property";

const AMENITY_TOGGLES: { key: keyof PropertyFormValues; label: string }[] = [
  { key: "water_available", label: "Water" },
  { key: "electricity_available", label: "Electricity" },
  { key: "parking_available", label: "Parking" },
  { key: "internet_available", label: "Internet" },
  { key: "furnished", label: "Furnished" },
  { key: "pets_allowed", label: "Pets allowed" },
  { key: "balcony", label: "Balcony" },
];

export default function PropertyFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const { data: existingProperty, isLoading: isLoadingProperty, isError, refetch } =
    usePropertyForEdit(id);
  const { data: existingImages } = usePropertyImagesForEdit(id);
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteImage = useDeletePropertyImage();
  const reorderImages = useReorderPropertyImages();
  const { data: caretakers } = useMyCaretakers();

  const [newUploads, setNewUploads] = useState<CloudinaryUploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: DEFAULT_PROPERTY_FORM_VALUES,
  });

  useEffect(() => {
    if (existingProperty) {
      reset({
        title: existingProperty.title,
        description: existingProperty.description,
        property_type: existingProperty.property_type,
        status: existingProperty.status,
        bedrooms: existingProperty.bedrooms,
        bathrooms: existingProperty.bathrooms,
        size_sqm: existingProperty.size_sqm,
        rent_amount: existingProperty.rent_amount,
        deposit_amount: existingProperty.deposit_amount,
        service_charge: existingProperty.service_charge,
        currency: existingProperty.currency,
        water_available: existingProperty.water_available,
        electricity_available: existingProperty.electricity_available,
        parking_available: existingProperty.parking_available,
        internet_available: existingProperty.internet_available,
        furnished: existingProperty.furnished,
        pets_allowed: existingProperty.pets_allowed,
        balcony: existingProperty.balcony,
        security_features: existingProperty.security_features ?? "",
        house_rules: existingProperty.house_rules ?? "",
        nearby_landmarks: existingProperty.nearby_landmarks ?? "",
        address_text: existingProperty.address_text ?? "",
        location_id: existingProperty.location_id,
        caretaker_id: existingProperty.caretaker_id,
      });
    }
  }, [existingProperty, reset]);

  const pickAndUploadImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({ type: "error", text1: "Photo library access is needed to add images." });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (result.canceled || result.assets.length === 0) return;

    setIsUploading(true);
    try {
      for (const asset of result.assets) {
        const uploaded = await uploadToCloudinary({
          uri: asset.uri,
          folder: `properties/${id ?? "new"}`,
          resourceType: "image",
        });
        setNewUploads((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsUploading(false);
    }
  };

  /** Moves an existing (already-saved) photo left/right and persists the new order immediately. */
  const moveExistingImage = (imageId: string, direction: -1 | 1) => {
    if (!existingImages || !id) return;
    const ordered = [...existingImages].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex((img) => img.id === imageId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const reordered = [...ordered];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    reorderImages.mutate({ propertyId: id, orderedImageIds: reordered.map((img) => img.id) });
  };

  const onSubmit = async (values: PropertyFormValues) => {
    const input = {
      ...values,
      size_sqm: values.size_sqm ?? null,
      security_features: values.security_features || null,
      house_rules: values.house_rules || null,
      nearby_landmarks: values.nearby_landmarks || null,
      address_text: values.address_text || null,
      location_id: values.location_id ?? null,
      caretaker_id: values.caretaker_id ?? null,
    };

    const imagesToAttach = newUploads.map((u) => ({
      cloudinary_public_id: u.publicId,
      secure_url: u.secureUrl,
      width: u.width,
      height: u.height,
    }));

    if (isEditing && id) {
      await updateProperty.mutateAsync({ propertyId: id, patch: input, newImages: imagesToAttach });
    } else {
      await createProperty.mutateAsync({ input, images: imagesToAttach });
    }
    router.back();
  };

  const isSubmitting = createProperty.isPending || updateProperty.isPending;

  if (isEditing && isLoadingProperty) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#2C7A4B" />
      </View>
    );
  }

  if (isEditing && isError) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white dark:bg-surface-dark"
    >
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <ArrowLeft size={22} color="#0B1F17" />
        </Pressable>
        <Text className="text-lg font-bold text-brand-900 dark:text-white">
          {isEditing ? "Edit listing" : "Add a property"}
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-10" keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Title"
              placeholder="e.g. Spacious 2BR in Kilimani"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.title?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Description"
              placeholder="Describe the property..."
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              multiline
              numberOfLines={4}
              style={{ textAlignVertical: "top", minHeight: 100 }}
              error={errors.description?.message}
            />
          )}
        />

        <Text className="mb-2 text-sm font-medium text-brand-900 dark:text-white">Property type</Text>
        <Controller
          control={control}
          name="property_type"
          render={({ field: { onChange, value } }) => (
            <View className="mb-4 flex-row flex-wrap">
              {PROPERTY_TYPE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={value === opt.value}
                  onPress={() => onChange(opt.value)}
                />
              ))}
            </View>
          )}
        />

        <Text className="mb-2 text-sm font-medium text-brand-900 dark:text-white">Status</Text>
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <View className="mb-4 flex-row flex-wrap">
              {PROPERTY_STATUS_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={value === opt.value}
                  onPress={() => onChange(opt.value)}
                />
              ))}
            </View>
          )}
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="bedrooms"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Bedrooms"
                  keyboardType="number-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={String(value)}
                  error={errors.bedrooms?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="bathrooms"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Bathrooms"
                  keyboardType="number-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={String(value)}
                  error={errors.bathrooms?.message}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="size_sqm"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Size (sqm, optional)"
              keyboardType="numeric"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value != null ? String(value) : ""}
              error={errors.size_sqm?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="rent_amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Monthly rent (KES)"
              keyboardType="numeric"
              onBlur={onBlur}
              onChangeText={onChange}
              value={String(value)}
              error={errors.rent_amount?.message}
            />
          )}
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="deposit_amount"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Deposit"
                  keyboardType="numeric"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={String(value)}
                  error={errors.deposit_amount?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="service_charge"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Service charge"
                  keyboardType="numeric"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={String(value)}
                  error={errors.service_charge?.message}
                />
              )}
            />
          </View>
        </View>

        <Text className="mb-2 mt-1 text-sm font-medium text-brand-900 dark:text-white">Amenities</Text>
        <View className="mb-4 flex-row flex-wrap">
          {AMENITY_TOGGLES.map(({ key, label }) => (
            <Controller
              key={key}
              control={control}
              name={key}
              render={({ field: { onChange, value } }) => (
                <Chip label={label} selected={!!value} onPress={() => onChange(!value)} />
              )}
            />
          ))}
        </View>

        <Text className="mb-2 mt-1 text-sm font-medium text-brand-900 dark:text-white">
          Caretaker (optional)
        </Text>
        <Controller
          control={control}
          name="caretaker_id"
          render={({ field: { onChange, value } }) => (
            <View className="mb-4 flex-row flex-wrap">
              <Chip label="None" selected={!value} onPress={() => onChange(null)} />
              {(caretakers ?? []).map((c) => (
                <Chip
                  key={c.profileId}
                  label={c.fullName ?? c.phone ?? "Caretaker"}
                  selected={value === c.profileId}
                  onPress={() => onChange(c.profileId)}
                />
              ))}
            </View>
          )}
        />
        {caretakers && caretakers.length === 0 ? (
          <Text className="mb-4 text-xs text-gray-500">
            No caretakers on file yet. A caretaker gets access once they sign up with the
            "property manager" role and you add them here.
          </Text>
        ) : null}

        <Controller
          control={control}
          name="address_text"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Address (optional)"
              placeholder="e.g. Off Ngong Road, near ABC Place"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ""}
            />
          )}
        />

        <Controller
          control={control}
          name="nearby_landmarks"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Nearby landmarks (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ""}
            />
          )}
        />

        <Controller
          control={control}
          name="security_features"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Security features (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ""}
            />
          )}
        />

        <Controller
          control={control}
          name="house_rules"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="House rules (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ""}
              multiline
              numberOfLines={3}
              style={{ textAlignVertical: "top", minHeight: 70 }}
            />
          )}
        />

        {/* Photos */}
        <Text className="mb-2 mt-1 text-sm font-medium text-brand-900 dark:text-white">Photos</Text>
        <View className="mb-2 flex-row flex-wrap gap-2">
          {[...(existingImages ?? [])]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((img, index) => (
              <View key={img.id} className="relative">
                <Image source={{ uri: img.secure_url }} style={{ width: 84, height: 84, borderRadius: 10 }} />
                {index === 0 ? (
                  <View className="absolute bottom-1 left-1 flex-row items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5">
                    <Star size={9} color="#F5C451" fill="#F5C451" />
                    <Text className="text-[9px] font-medium text-white">Cover</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => deleteImage.mutate({ imageId: img.id, propertyId: id as string })}
                  className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/70"
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <X size={13} color="#FFFFFF" />
                </Pressable>
                <View className="absolute -bottom-1 right-1 flex-row gap-1">
                  {index > 0 ? (
                    <Pressable
                      onPress={() => moveExistingImage(img.id, -1)}
                      className="h-6 w-6 items-center justify-center rounded-full bg-black/70"
                      accessibilityRole="button"
                      accessibilityLabel="Move photo earlier"
                    >
                      <ChevronLeft size={13} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
                  {index < (existingImages?.length ?? 0) - 1 ? (
                    <Pressable
                      onPress={() => moveExistingImage(img.id, 1)}
                      className="h-6 w-6 items-center justify-center rounded-full bg-black/70"
                      accessibilityRole="button"
                      accessibilityLabel="Move photo later"
                    >
                      <ChevronRight size={13} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          {newUploads.map((u) => (
            <Image
              key={u.publicId}
              source={{ uri: u.secureUrl }}
              style={{ width: 84, height: 84, borderRadius: 10 }}
            />
          ))}
          <Pressable
            onPress={pickAndUploadImages}
            disabled={isUploading}
            className="h-[84px] w-[84px] items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600"
            accessibilityRole="button"
            accessibilityLabel="Add photos"
          >
            {isUploading ? (
              <ActivityIndicator color="#2C7A4B" />
            ) : (
              <Plus size={22} color="#8A968E" />
            )}
          </Pressable>
        </View>
        <Text className="mb-5 text-xs text-gray-500">
          Photos upload to Cloudinary and attach automatically when you save.
        </Text>

        <AppButton
          label={isEditing ? "Save changes" : "Publish listing"}
          loading={isSubmitting}
          disabled={isUploading}
          onPress={handleSubmit(onSubmit)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
