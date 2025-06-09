export interface FoodOption {
  id: string;
  name: string;
  description: string;
  isVegetarian: boolean;
  isGutFriendly: boolean;
  icon?: string;
}

export interface TimeBlock {
  id: string;
  name: string;
  timeRange: string;
  foods: FoodOption[];
  completed: boolean;
  selectedFoodId?: string;
  completedAt?: Date;
}

export interface Reminder {
  id: string;
  name: string;
  time: string;
  type: 'supplement' | 'mindfulness';
  description?: string;
  completed: boolean;
  completedAt?: Date;
  icon?: string;
}

export interface DailyProgress {
  date: string;
  timeBlocks: TimeBlock[];
  reminders: Reminder[];
  completionPercentage: number;
}

export interface TimelineState {
  currentDate: string;
  dailyProgress: DailyProgress;
  updateTimeBlock: (blockId: string, updates: Partial<TimeBlock>) => void;
  updateReminder: (reminderId: string, updates: Partial<Reminder>) => void;
  markFoodCompleted: (blockId: string, foodId: string) => void;
  markReminderCompleted: (reminderId: string) => void;
  calculateProgress: () => number;
  resetDay: () => void;
}

