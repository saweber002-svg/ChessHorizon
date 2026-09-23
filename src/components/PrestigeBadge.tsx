import { motion } from 'framer-motion';
import { Shield, ShieldCheck, Award, Star, Trophy, type LucideIcon } from 'lucide-react';
import { getTierColor, getTierLabel, type Tier } from '@/types';

interface PrestigeBadgeProps {
  tier: Tier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const TIER_ICONS: Record<Tier, LucideIcon> = {
  0: Shield,
  1: ShieldCheck,
  2: Award,
  3: Star,
  4: Trophy,
};

export default function PrestigeBadge({ tier, size = 'md', showLabel = true }: PrestigeBadgeProps) {
  const Icon = TIER_ICONS[tier] || Shield;
  const color = getTierColor(tier);
  const label = getTierLabel(tier);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 32,
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05, y: -2 }}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center border-2 transition-all relative group`}
        style={{
          borderColor: tier === 0 ? '#27272a' : color,
          backgroundColor: tier === 0 ? 'transparent' : `${color}15`,
          boxShadow: tier > 2 ? `0 0 20px ${color}40` : 'none',
        }}
      >
        {/* Glow effect for high tiers */}
        {tier >= 3 && (
          <div 
            className="absolute inset-0 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity"
            style={{ backgroundColor: color }}
          />
        )}
        
        <Icon
          size={iconSizes[size]}
          style={{ color: tier === 0 ? '#52525b' : color }}
          className={`${tier >= 4 ? 'animate-pulse' : ''} relative z-10`}
        />
      </motion.div>
      
      {showLabel && (
        <div className="flex flex-col items-center">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: tier === 0 ? '#52525b' : color }}
          >
            {label}
          </span>
          {tier > 0 && (
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: tier }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 h-1 rounded-full" 
                  style={{ backgroundColor: color }} 
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
