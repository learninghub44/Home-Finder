import {
  ArrowUpDown,
  Camera,
  Car,
  CheckCircle2,
  Droplet,
  Dumbbell,
  Flame,
  PawPrint,
  Shield,
  Sofa,
  Sun,
  Trees,
  Tv,
  Waves,
  Wifi,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react-native";

/**
 * Amenity `icon` values are stored as kebab-case (see scripts/seed.ts, e.g.
 * "arrow-up-down", "droplet"). Maps them to the matching lucide component,
 * falling back to a generic checkmark for anything unrecognized so new
 * amenities never render broken.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  droplet: Droplet,
  camera: Camera,
  dumbbell: Dumbbell,
  waves: Waves,
  zap: Zap,
  shield: Shield,
  "arrow-up-down": ArrowUpDown,
  sun: Sun,
  wifi: Wifi,
  car: Car,
  sofa: Sofa,
  "paw-print": PawPrint,
  tv: Tv,
  wind: Wind,
  flame: Flame,
  trees: Trees,
};

export function resolveAmenityIcon(icon: string | null | undefined): LucideIcon {
  if (!icon) return CheckCircle2;
  return ICON_MAP[icon] ?? CheckCircle2;
}
