import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { foodRecommendations } from '../../data/foodRecommendations';
import { useTimelineStore } from '../../stores/timelineStore';
import { ProgressIndicator } from './ProgressIndicator';
import { RemindersList } from './RemindersList';
import { TimeBlock } from './TimeBlock';

export function HomeTimeline() {
  const {
    currentDate,
    dailyProgress,
    markFoodCompleted,
    markReminderCompleted,
    updateTimeBlock,
    calculateProgress,
    resetDay,
  } = useTimelineStore();

  // Initialize food recommendations for time blocks
  useEffect(() => {
    dailyProgress.timeBlocks.forEach((block) => {
      if (block.foods.length === 0) {
        const foods = foodRecommendations[block.id] || [];
        updateTimeBlock(block.id, { foods });
      }
    });
  }, [dailyProgress.timeBlocks, updateTimeBlock]);

  // Check if it's a new day and reset if needed
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (currentDate !== today) {
      resetDay();
    }
  }, [currentDate, resetDay]);

  const handleFoodSelected = (blockId: string, foodId: string) => {
    markFoodCompleted(blockId, foodId);
  };

  const handleReminderToggle = (reminderId: string) => {
    markReminderCompleted(reminderId);
  };

  const handleResetDay = () => {
    if (window.confirm('Are you sure you want to reset your progress for today?')) {
      resetDay();
    }
  };

  const completedItems = 
    dailyProgress.timeBlocks.filter(block => block.completed).length +
    dailyProgress.reminders.filter(reminder => reminder.completed).length;
  
  const totalItems = dailyProgress.timeBlocks.length + dailyProgress.reminders.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🏠 Today's Wellness Journey
            </h1>
            <p className="text-gray-600">
              Your personalized gut health companion
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleResetDay}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 shadow-sm"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Reset Day</span>
          </motion.button>
        </motion.div>

        {/* Progress Indicator */}
        <ProgressIndicator
          completionPercentage={dailyProgress.completionPercentage}
          completedItems={completedItems}
          totalItems={totalItems}
          currentDate={currentDate}
        />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Timeline - Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span>🍽️</span>
                <span>Meal Timeline</span>
              </h2>
              
              <div className="space-y-4">
                {dailyProgress.timeBlocks.map((timeBlock, index) => (
                  <motion.div
                    key={timeBlock.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <TimeBlock
                      timeBlock={timeBlock}
                      onFoodSelected={(foodId) => handleFoodSelected(timeBlock.id, foodId)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Reminders - Right Column (1/3 width) */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="sticky top-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span>⏰</span>
                <span>Daily Reminders</span>
              </h2>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <RemindersList
                  reminders={dailyProgress.reminders}
                  onReminderToggle={handleReminderToggle}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center text-gray-500 text-sm"
        >
          <p>💚 Take care of your gut, and it will take care of you</p>
        </motion.div>
      </div>
    </div>
  );
}

