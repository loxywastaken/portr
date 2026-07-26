import { motion } from 'framer-motion';

export function FullPageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="brand-gradient grid h-14 w-14 place-items-center rounded-2xl shadow-glow"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        >
          <span className="text-xl font-bold text-white">N</span>
        </motion.div>
        <p className="text-sm text-ink-muted">{label}…</p>
      </div>
    </div>
  );
}
