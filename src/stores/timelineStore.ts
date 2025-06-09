import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { foodRecommendations } from '../data/foodRecommendations';
import { TimelineState, DailyProgress, TimeBlock, Reminder } from '../types/timeline';

// Default time blocks for the day with food recommendations
const createDefaultTimeBlocks = (): TimeBlock[] => [
  {
    id: 'breakfast',
    name: 'Breakfast',
    timeRange: '7-9 AM',
    foods: foodRecommendations.breakfast || [],
    completed: false,
  },
  {
    id: 'mid-morning',
    name: 'Mid-Morning Snack',
    timeRange: '10-11 AM',
    foods: foodRecommendations['mid-morning'] || [],
    completed: false,
  },
  {
    id: 'lunch',
    name: 'Lunch',
    timeRange: '12-2 PM',
    foods: foodRecommendations.lunch || [],
    completed: false,
  },
  {
    id: 'afternoon',
    name: 'Afternoon Snack',
    timeRange: '3-4 PM',
    foods: foodRecommendations.afternoon || [],
    completed: false,
  },
  {
    id: 'dinner',
    name: 'Dinner',
    timeRange: '6-8 PM',
    foods: foodRecommendations.dinner || [],
    completed: false,
  },
  {
    id: 'evening',
    name: 'Evening',
    timeRange: '9-10 PM',
    foods: foodRecommendations.evening || [],
    completed: false,
  },
];

// Default reminders for the day
const createDefaultReminders = (): Reminder[] => [
  {
    id: 'dgl',
    name: 'DGL (Deglycyrrhizinated Licorice)',
    time: '10:00 AM',
    type: 'supplement',
    description: 'Take DGL supplement for digestive support',
    completed: false,
    icon: '💊',
  },
  {
    id: 'probiotics',
    name: 'Probiotics',
    time: '12:00 PM',
    type: 'supplement',
    description: 'Take probiotic supplement with lunch',
    completed: false,
    icon: '🦠',
  },
  {
    id: 'breathing',
    name: '5-min Breathing Exercise',
    time: '3:00 PM',
    type: 'mindfulness',
    description: 'Deep breathing exercise for stress relief',
    completed: false,
    icon: '🧘',
  },
  {
    id: 'chamomile',
    name: 'Chamomile Tea',
    time: '8:00 PM',
    type: 'mindfulness',
    description: 'Relaxing chamomile tea before bed',
    completed: false,
    icon: '🍵',
  },
];

const createDefaultDailyProgress = (): DailyProgress => ({
  date: new Date().toISOString().split('T')[0],
  timeBlocks: createDefaultTimeBlocks(),
  reminders: createDefaultReminders(),
  completionPercentage: 0,
});

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set, get) => ({
      currentDate: new Date().toISOString().split('T')[0],
      dailyProgress: createDefaultDailyProgress(),

      updateTimeBlock: (blockId: string, updates: Partial<TimeBlock>) =>
        set((state) => ({
          dailyProgress: {
            ...state.dailyProgress,
            timeBlocks: state.dailyProgress.timeBlocks.map((block) =>
              block.id === blockId ? { ...block, ...updates } : block
            ),
          },
        })),

      updateReminder: (reminderId: string, updates: Partial<Reminder>) =>
        set((state) => ({
          dailyProgress: {
            ...state.dailyProgress,
            reminders: state.dailyProgress.reminders.map((reminder) =>
              reminder.id === reminderId ? { ...reminder, ...updates } : reminder
            ),
          },
        })),

      markFoodCompleted: (blockId: string, foodId: string) => {
        const { updateTimeBlock, calculateProgress } = get();
        updateTimeBlock(blockId, {
          completed: true,
          selectedFoodId: foodId,
          completedAt: new Date(),
        });
        
        // Update completion percentage
        set((state) => ({
          dailyProgress: {
            ...state.dailyProgress,
            completionPercentage: calculateProgress(),
          },
        }));
      },

      markReminderCompleted: (reminderId: string) => {
        const { updateReminder, calculateProgress } = get();
        updateReminder(reminderId, {
          completed: true,
          completedAt: new Date(),
        });
        
        // Update completion percentage
        set((state) => ({
          dailyProgress: {
            ...state.dailyProgress,
            completionPercentage: calculateProgress(),
          },
        }));
      },

      calculateProgress: () => {
        const { dailyProgress } = get();
        const totalItems = dailyProgress.timeBlocks.length + dailyProgress.reminders.length;
        const completedItems = 
          dailyProgress.timeBlocks.filter(block => block.completed).length +
          dailyProgress.reminders.filter(reminder => reminder.completed).length;
        
        return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      },

      resetDay: () => {
        const today = new Date().toISOString().split('T')[0];
        set({
          currentDate: today,
          dailyProgress: createDefaultDailyProgress(),
        });
      },
    }),
    {
      name: 'timeline-storage',
      // Only persist the daily progress and current date
      partialize: (state) => ({
        currentDate: state.currentDate,
        dailyProgress: state.dailyProgress,
      }),
    }
  )
);
