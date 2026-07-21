import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, subtitle, onSeeAll }: SectionHeaderProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between px-4">
      <View>
        <Text className="text-lg font-bold text-brand-900 dark:text-white">{title}</Text>
        {subtitle ? <Text className="text-xs text-gray-500">{subtitle}</Text> : null}
      </View>
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
          className="flex-row items-center"
        >
          <Text className="text-sm font-medium text-brand-500">See all</Text>
          <ChevronRight size={16} color="#2C7A4B" />
        </Pressable>
      ) : null}
    </View>
  );
}
