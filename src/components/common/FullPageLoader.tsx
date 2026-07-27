import { motion } from 'framer-motion';
import { Logo } from '@/components/common/Logo';

export function FullPageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        >
          <Logo className="h-12 w-auto text-white" />
        </motion.div>
        <p className="text-sm text-ink-muted">{label}…</p>
      </div>
    </div>
  );
}
