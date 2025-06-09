import { motion } from 'framer-motion';
import { Reminder } from '../../types/timeline';
import { ReminderItem } from './ReminderItem';

interface RemindersListProps {
  reminders: Reminder[];
  onReminderToggle: (reminderId: string) => void;
}

export function RemindersList({ reminders, onReminderToggle }: RemindersListProps) {
  const supplements = reminders.filter(r => r.type === 'supplement');
  const mindfulness = reminders.filter(r => r.type === 'mindfulness');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const ReminderSection = ({ 
    title, 
    items, 
    icon, 
    color 
  }: { 
    title: string; 
    items: Reminder[]; 
    icon: string; 
    color: string; 
  }) => (
    <div className="mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className={`text-lg font-semibold ${color}`}>
          {title}
        </h3>
        <span className={`
          text-xs px-2 py-1 rounded-full
          ${color === 'text-purple-700' 
            ? 'bg-purple-100 text-purple-600' 
            : 'bg-blue-100 text-blue-600'
          }
        `}>
          {items.filter(item => item.completed).length}/{items.length}
        </span>
      </div>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {items.map((reminder) => (
          <motion.div
            key={reminder.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <ReminderItem
              reminder={reminder}
              onToggle={() => onReminderToggle(reminder.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Supplements Section */}
      {supplements.length > 0 && (
        <ReminderSection
          title="Supplements"
          items={supplements}
          icon="💊"
          color="text-purple-700"
        />
      )}

      {/* Mindfulness Section */}
      {mindfulness.length > 0 && (
        <ReminderSection
          title="Mindfulness"
          items={mindfulness}
          icon="🧘"
          color="text-blue-700"
        />
      )}

      {/* Empty State */}
      {reminders.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-gray-500"
        >
          <div className="text-4xl mb-2">🌱</div>
          <p>No reminders for today</p>
          <p className="text-sm mt-1">Your wellness routine will appear here</p>
        </motion.div>
      )}
    </div>
  );
}

