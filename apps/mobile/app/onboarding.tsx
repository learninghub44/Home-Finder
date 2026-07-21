import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Text,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { router } from "expo-router";
import { Home, MapPin, ShieldCheck } from "lucide-react-native";
import { AppButton } from "@/components/AppButton";
import { markOnboardingComplete } from "@/lib/onboarding";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    icon: Home,
    title: "Find your next home",
    body: "Browse verified rentals — apartments, bedsitters, and family homes — all in one place.",
  },
  {
    icon: MapPin,
    title: "See exactly where it is",
    body: "Live maps show real distances, nearby schools, hospitals, and transport links.",
  },
  {
    icon: ShieldCheck,
    title: "Deal directly, safely",
    body: "Message landlords and caretakers directly, book viewings, and report anything that looks off.",
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  };

  const finish = async () => {
    await markOnboardingComplete();
    router.replace("/(auth)/login");
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      finish();
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={{ width }} className="flex-1 items-center justify-center px-10">
              <View className="mb-8 h-24 w-24 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-800">
                <Icon size={40} color="#2C7A4B" />
              </View>
              <Text className="mb-3 text-center text-2xl font-bold text-brand-900 dark:text-white">
                {item.title}
              </Text>
              <Text className="text-center text-base text-gray-500">{item.body}</Text>
            </View>
          );
        }}
      />

      <View className="flex-row justify-center gap-2 pb-4">
        {SLIDES.map((slide, i) => (
          <View
            key={slide.title}
            className={`h-2 rounded-full ${
              i === index ? "w-6 bg-brand-500" : "w-2 bg-gray-200"
            }`}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between px-6 pb-10 pt-2">
        <AppButton variant="ghost" label="Skip" onPress={finish} />
        <AppButton
          label={index === SLIDES.length - 1 ? "Get started" : "Next"}
          onPress={next}
        />
      </View>
    </View>
  );
}
