import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { TimeBlock as TimeBlockType } from '../../types/timeline';
import { FoodCarousel } from './FoodCarousel';

interface TimeBlockProps {
  timeBlock: TimeBlockType;
  onFoodSelected: (foodId: string) => void;
}

export function TimeBlock({ timeBlock, onFoodSelected }: TimeBlockProps) {
  const { name, timeRange, foods, completed, selectedFoodId } = timeBlock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        relative p-6 rounded-2xl border-2 transition-all duration-300
        ${completed 
          ? 'bg-green-50 border-green-200 shadow-sm' 
          : 'bg-white border-gray-200 shadow-md hover:shadow-lg'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`
            p-2 rounded-full transition-colors duration-200
            ${completed ? 'bg-green-100' : 'bg-gray-100'}
          `}>
            {completed ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Clock className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <h3 className={`
              font-semibold text-lg transition-colors duration-200
              ${completed ? 'text-green-800' : 'text-gray-800'}
            `}>
              {name}
            </h3>
            <p className={`
              text-sm transition-colors duration-200
              ${completed ? 'text-green-600' : 'text-gray-500'}
            `}>
              {timeRange}
            </p>
          </div>
        </div>
        
        {completed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center space-x-2 text-green-600"
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
          </motion.div>
        )}
      </div>

      {/* Food Carousel */}
      {foods.length > 0 && (
        <div className="mt-4">
          <FoodCarousel
            foods={foods}
            selectedFoodId={selectedFoodId}
            onFoodSelected={onFoodSelected}
            disabled={completed}
          />
        </div>
      )}

      {/* Completion Status */}
      {completed && selectedFoodId && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-3 bg-green-100 rounded-lg"
        >
          <p className="text-sm text-green-700">
            ✨ Great choice! You completed this meal time.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

