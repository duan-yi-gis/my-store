import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

const variantStyles: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'bg-gradient-to-br from-sky-900 to-sky-800 text-white',
  warning: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
  danger: 'bg-gradient-to-br from-red-500 to-red-600 text-white animate-pulse',
  success: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
};

const trendConfig = {
  up: { icon: ArrowUp, color: 'text-emerald-300' },
  down: { icon: ArrowDown, color: 'text-red-300' },
  flat: { icon: Minus, color: 'text-sky-300' },
};

export function StatCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendValue,
  variant = 'default',
}: StatCardProps) {
  const TrendIcon = trend ? trendConfig[trend].icon : null;
  const trendColor = trend ? trendConfig[trend].color : '';

  return (
    <div
      className={cn(
        'rounded-xl p-4 md:p-5 shadow-lg transition-transform duration-200 hover:scale-[1.02] w-full md:w-auto',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm opacity-80 truncate">{title}</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl md:text-3xl font-bold font-mono tracking-tight">
              {value}
            </span>
            {unit && <span className="text-sm opacity-70">{unit}</span>}
          </div>
        </div>
        {icon && <div className="shrink-0 opacity-70">{icon}</div>}
      </div>

      {trend && trendValue && (
        <div className={cn('mt-2 flex items-center gap-1 text-sm', trendColor)}>
          {TrendIcon && <TrendIcon className="h-4 w-4" />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
