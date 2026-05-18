import { Crown, Award, Star, Gem } from 'lucide-react';
import { getTierColor, getTierLabel, type Tier } from '@/types';

interface PrestigeBadgeProps {
  tier: Tier;
  stars: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const TIER_ICONS: Record<Tier, typeof Crown> = {
  0: Star,
  1: Award,
  2: Crown,
  3: Gem,
};

export default function PrestigeBadge({ tier, stars, size = 'md', showLabel = true }: PrestigeBadgeProps) {
  const Icon = TIER_ICONS[tier];
  const color = getTierColor(tier);
  const label = getTierLabel(tier);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 28,
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center border-2 transition-all`}
        style={{
          borderColor: color,
          backgroundColor: `${color}15`,
          boxShadow: `0 0 12px ${color}30`,
        }}
      >
        <Icon
          size={iconSizes[size]}
          style={{ color }}
          className="drop-shadow-sm"
        />
      </div>
      {showLabel && (
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </span>
      )}
      {showLabel && (
        <span className="text-[10px] text-white/40">
          {stars} stars
        </span>
      )}
    </div>
  );
}
