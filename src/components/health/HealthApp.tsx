import { motion } from 'framer-motion';
import { HomeTimeline } from './HomeTimeline';

export function HealthApp() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      <HomeTimeline />
    </motion.div>
  );
}

