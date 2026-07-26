import { Input } from './Input';

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorInput({ value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-[-6px] h-[calc(100%+12px)] w-[calc(100%+12px)] cursor-pointer bg-transparent"
          aria-label="Pick colour"
        />
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 font-mono uppercase"
        maxLength={7}
      />
    </div>
  );
}
