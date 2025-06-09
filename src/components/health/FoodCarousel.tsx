import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useState } from 'react';
import { FoodOption } from '../../types/timeline';

interface FoodCarouselProps {
  foods: FoodOption[];
  selectedFoodId?: string;
  onFoodSelected: (foodId: string) => void;
  disabled?: boolean;
}

export function FoodCarousel({ 
  foods, 
  selectedFoodId, 
  onFoodSelected, 
  disabled = false 
}: FoodCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    if (disabled) return;
    
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      if (newDirection === 1) {
        return prevIndex === foods.length - 1 ? 0 : prevIndex + 1;
      } else {
        return prevIndex === 0 ? foods.length - 1 : prevIndex - 1;
      }
    });
  };

  const handleFoodAction = (action: 'select' | 'skip') => {
    if (disabled) return;
    
    if (action === 'select') {
      onFoodSelected(foods[currentIndex].id);
    } else {
      // Skip to next food option
      paginate(1);
    }
  };

  if (foods.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No food recommendations available</p>
      </div>
    );
  }

  const currentFood = foods[currentIndex];

  return (
    <div className="relative">
      {/* Food Card Container */}
      <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-blue-50">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag={disabled ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 cursor-grab active:cursor-grabbing"
          >
            {/* Food Icon */}
            <div className="text-4xl mb-3">
              {currentFood.icon || '🍽️'}
            </div>
            
            {/* Food Name */}
            <h4 className="text-lg font-semibold text-gray-800 text-center mb-2">
              {currentFood.name}
            </h4>
            
            {/* Food Description */}
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              {currentFood.description}
            </p>
            
            {/* Food Tags */}
            <div className="flex space-x-2 mt-3">
              {currentFood.isVegetarian && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  🌱 Vegetarian
                </span>
              )}
              {currentFood.isGutFriendly && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  💚 Gut-Friendly
                </span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {!disabled && foods.length > 1 && (
          <>
            <button
              onClick={() => paginate(-1)}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition-all duration-200 hover:scale-110"
              aria-label="Previous food option"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => paginate(1)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition-all duration-200 hover:scale-110"
              aria-label="Next food option"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </>
        )}
      </div>

      {/* Action Buttons */}
      {!disabled && (
        <div className="flex space-x-3 mt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleFoodAction('select')}
            className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors duration-200 shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>I ate this</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleFoodAction('skip')}
            className="flex items-center justify-center space-x-2 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors duration-200"
          >
            <X className="w-4 h-4" />
            <span>Skip</span>
          </motion.button>
        </div>
      )}

      {/* Dots Indicator */}
      {foods.length > 1 && (
        <div className="flex justify-center space-x-2 mt-4">
          {foods.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (!disabled) {
                  setDirection(index > currentIndex ? 1 : -1);
                  setCurrentIndex(index);
                }
              }}
              className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${index === currentIndex 
                  ? 'bg-green-500 w-6' 
                  : 'bg-gray-300 hover:bg-gray-400'
                }
                ${disabled ? 'cursor-default' : 'cursor-pointer'}
              `}
              aria-label={`Go to food option ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

