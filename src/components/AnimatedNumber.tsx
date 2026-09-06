import React from 'react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  durationMs?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 1,
  durationMs = 550,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  const animated = useAnimatedNumber(value, durationMs);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{animated.toFixed(decimals)}{suffix}
    </span>
  );
};
