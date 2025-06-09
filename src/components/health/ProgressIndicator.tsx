import { motion } from 'framer-motion';
import { Calendar, Target, TrendingUp } from 'lucide-react';

interface ProgressIndicatorProps {
  completionPercentage: number;
  completedItems: number;
  totalItems: number;
  currentDate: string;
}

export function ProgressIndicator({ 
  completionPercentage, 
  completedItems, 
  totalItems, 
  currentDate 
}: ProgressIndicatorProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const getMotivationalMessage = (percentage: number) => {
    if (percentage === 100) return "🎉 Perfect day! You've completed everything!";
    if (percentage >= 80) return "🌟 Amazing progress! You're almost there!";
    if (percentage >= 60) return "💪 Great job! Keep up the momentum!";
    if (percentage >= 40) return "🌱 Good start! You're making progress!";
    if (percentage >= 20) return "✨ Every step counts! Keep going!";
    return "🌅 Ready to start your wellness journey?";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getProgressBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 mb-6 border border-green-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            {formatDate(currentDate)}
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {completedItems}/{totalItems} completed
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Daily Progress</span>
          <span className={`text-sm font-bold ${getProgressColor(completionPercentage)}`}>
            {completionPercentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${getProgressBgColor(completionPercentage)} relative`}
          >
            {/* Shimmer effect for active progress */}
            {completionPercentage > 0 && completionPercentage < 100 && (
              <motion.div
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "linear",
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Motivational Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex items-center space-x-2 text-center"
      >
        <TrendingUp className={`w-4 h-4 ${getProgressColor(completionPercentage)}`} />
        <p className={`text-sm font-medium ${getProgressColor(completionPercentage)}`}>
          {getMotivationalMessage(completionPercentage)}
        </p>
      </motion.div>

      {/* Achievement Badge */}
      {completionPercentage === 100 && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            delay: 0.8, 
            duration: 0.6, 
            type: "spring", 
            stiffness: 200 
          }}
          className="mt-4 flex items-center justify-center"
        >
          <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
            🏆 Daily Goal Achieved!
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

