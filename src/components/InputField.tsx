import { cn } from '@/lib/utils';

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

export function InputField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
  hint,
}: InputFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      return;
    }
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseFloat(raw);
    if (isNaN(num)) {
      onChange(min ?? 0);
    } else {
      let clamped = num;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      onChange(clamped);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-sky-900 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onWheel={(e) => e.currentTarget.blur()}
          min={min}
          max={max}
          step={step}
          className={cn(
            'w-full rounded-lg border border-sky-200 bg-white px-3 py-2 pr-14',
            'text-sky-900 font-mono text-sm',
            'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent',
            'transition-shadow duration-200',
            'placeholder:text-sky-300',
            '[appearance:textfield]',
            '[&::-webkit-outer-spin-button]:appearance-none',
            '[&::-webkit-inner-spin-button]:appearance-none'
          )}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sky-400 pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  );
}
