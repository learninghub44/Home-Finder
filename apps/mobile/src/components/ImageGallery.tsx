import { useState } from "react";
import { Dimensions, FlatList, Modal, Pressable, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { Image } from "expo-image";
import { BedDouble, X } from "lucide-react-native";
import type { PropertyImage } from "@/types/database";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ImageGalleryProps {
  images: PropertyImage[];
  height?: number;
}

export function ImageGallery({ images, height = 300 }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);

  if (images.length === 0) {
    return (
      <View
        style={{ height }}
        className="w-full items-center justify-center bg-muted-light dark:bg-brand-800"
      >
        <BedDouble size={40} color="#8A968E" />
        <Text className="mt-2 text-sm text-gray-500">No photos yet</Text>
      </View>
    );
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Pressable onPress={() => setViewerVisible(true)} style={{ width: SCREEN_WIDTH, height }}>
            <Image
              source={{ uri: item.secure_url }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={150}
              accessibilityLabel="Property photo"
            />
          </Pressable>
        )}
      />

      {images.length > 1 ? (
        <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
          {images.map((img, i) => (
            <View
              key={img.id}
              className={`h-1.5 rounded-full ${
                i === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </View>
      ) : null}

      <View className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1">
        <Text className="text-xs font-medium text-white">
          {activeIndex + 1}/{images.length}
        </Text>
      </View>

      <Modal visible={viewerVisible} animationType="fade" transparent onRequestClose={() => setViewerVisible(false)}>
        <View className="flex-1 bg-black">
          <Pressable
            onPress={() => setViewerVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
            className="absolute right-4 top-14 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/20"
          >
            <X size={22} color="#FFFFFF" />
          </Pressable>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            initialScrollIndex={activeIndex}
            getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center">
                <Image
                  source={{ uri: item.secure_url }}
                  style={{ width: SCREEN_WIDTH, height: "100%" }}
                  contentFit="contain"
                  accessibilityLabel="Property photo, full screen"
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
