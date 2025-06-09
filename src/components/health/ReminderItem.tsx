import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { Reminder } from '../../types/timeline';

interface ReminderItemProps {
  reminder: Reminder;
  onToggle: () => void;
}

export function ReminderItem({ reminder, onToggle }: ReminderItemProps) {
  const { name, time, type, description, completed, icon } = reminder;

  const typeColors = {
    supplement: {
      bg: completed ? 'bg-purple-50' : 'bg-white',
      border: completed ? 'border-purple-200' : 'border-gray-200',
      accent: 'text-purple-600',
      checkBg: completed ? 'bg-purple-500' : 'bg-gray-200',
      checkText: completed ? 'text-white' : 'text-gray-400',
    },
    mindfulness: {
      bg: completed ? 'bg-blue-50' : 'bg-white',
      border: completed ? 'border-blue-200' : 'border-gray-200',
      accent: 'text-blue-600',
      checkBg: completed ? 'bg-blue-500' : 'bg-gray-200',
      checkText: completed ? 'text-white' : 'text-gray-400',
    },
  };

  const colors = typeColors[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
        ${colors.bg} ${colors.border}
        hover:shadow-md
        ${completed ? 'opacity-75' : ''}
      `}
      onClick={onToggle}
    >
      <div className="flex items-start space-x-4">
        {/* Checkbox */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`
            flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
            ${colors.checkBg} ${colors.checkText}
            ${completed ? 'border-transparent' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          {completed && <Check className="w-4 h-4" />}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {/* Icon */}
            <span className="text-lg">{icon}</span>
            
            {/* Name */}
            <h4 className={`
              font-medium transition-all duration-200
              ${completed ? 'text-gray-500 line-through' : 'text-gray-800'}
            `}>
              {name}
            </h4>
          </div>

          {/* Time */}
          <div className="flex items-center space-x-1 mb-2">
            <Clock className={`w-3 h-3 ${colors.accent}`} />
            <span className={`text-sm ${colors.accent} font-medium`}>
              {time}
            </span>
            <span className={`
              text-xs px-2 py-1 rounded-full capitalize
              ${type === 'supplement' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-blue-100 text-blue-700'
              }
            `}>
              {type}
            </span>
          </div>

          {/* Description */}
          {description && (
            <p className={`
              text-sm leading-relaxed transition-all duration-200
              ${completed ? 'text-gray-400' : 'text-gray-600'}
            `}>
              {description}
            </p>
          )}

          {/* Completion Status */}
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 flex items-center space-x-1 text-green-600"
            >
              <Check className="w-3 h-3" />
              <span className="text-xs font-medium">Completed</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

