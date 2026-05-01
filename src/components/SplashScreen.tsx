import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% 38%, #fff0f0 0%, #fdf8f7 55%, #f5f0ef 100%)',
          }}
        >
          {/* G logo — spring bounce */}
          <motion.img
            src="/g-logo.png"
            alt=""
            initial={{ scale: 0.65, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1], delay: 0.08 }}
            className="w-[140px] h-[140px] object-contain drop-shadow-[0_12px_32px_rgba(209,70,70,0.22)]"
            style={{ mixBlendMode: 'multiply' }}
          />

          {/* Full wordmark — fades up */}
          <motion.img
            src="/giftin-wordmark.png"
            alt="Giftin"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.52 }}
            className="w-[220px] object-contain -mt-2"
            style={{ mixBlendMode: 'multiply' }}
          />

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-charcoal/30"
          >
            Thoughtful gifting
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
