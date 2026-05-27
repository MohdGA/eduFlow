export interface Course {
  id: string;
  title: string;
  subtitle: string;
  instructor: string;
  instructorAvatar: string;
  thumbnail: string;        // gradient class (fallback when imageUrl is null)
  imageUrl?: string | null;  // real thumbnail image; takes precedence over gradient
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  reviewCount: number;
  studentCount: number;
  duration: string;
  lessonCount: number;
  price: number;
  isBestseller?: boolean;
  isNew?: boolean;
  progress?: number;        // 0-100 for enrolled
  lastAccessed?: string;
  tags: string[];
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'quiz' | 'reading';
  completed: boolean;
  locked: boolean;
  videoUrl?: string | null;
  description?: string;
}

export interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Instructor {
  id: string;
  name: string;
  avatar: string;
  title: string;
  rating: number;
  students: number;
  courses: number;
  bio: string;
}

export interface Review {
  id: string;
  user: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface StatCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
  gradient: string;
}
