import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-xl border border-white/10 bg-surface-raised px-3.5 py-2.5 text-sm text-ink ' +
  'placeholder:text-ink-faint outline-none transition focus:border-brand-400/60 ' +
  'focus:ring-2 focus:ring-brand-400/20 disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(base, 'min-h-[96px] resize-y leading-relaxed', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';
