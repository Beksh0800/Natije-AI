/* ========================================
   NÄTIJE AI — TypeScript Types
   ======================================== */

// ---- User Roles ----
export type UserRole = 'teacher' | 'student' | 'parent';

// ---- User ----
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  classInfo?: string; // e.g. "5-сынып оқушысы"
  parentCode?: string;
  customSubjects?: string[];
}

// ---- Class ----
export interface SchoolClass {
  id: string;
  teacherId: string;
  name: string;
  inviteCode?: string;
  createdAt: string;
  studentsCount: number;
}

// ---- Student ----
export interface Student {
  id: string;
  classId: string;
  name: string;
  email: string;
  parentId?: string;
  parentCode?: string;
  avatar?: string;
  growthScore?: number;
  level?: number;
  xp?: number;
  maxXp?: number;
  streak?: number;
  studentId?: string; // Auth UID
}

// ---- Submission ----
export type SubmissionStatus = 'uploaded' | 'processing' | 'pending_teacher_review' | 'reviewed' | 'error';

export interface Submission {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string;
  title: string;
  subject: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  status: SubmissionStatus;
  createdAt: string;
  dueDate?: string;
  type: 'assignment' | 'test' | 'essay' | 'practice' | 'project';
  score?: number;
  teacherComment?: string;
  maxAttempts?: number;
}

// ---- Solution (Student's submitted answer) ----
export type SolutionStatus = 'pending_ai' | 'ai_reviewed' | 'teacher_graded';

export interface Solution {
  id: string;
  assignmentId: string; // Links to Submission ID where studentId is 'all'
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  fileUrls?: string[];
  fileNames?: string[];
  fileSizes?: string[];
  iteration: number;
  status: SolutionStatus;
  aiScore?: number;
  teacherScore?: number;
  teacherComment?: string;
  createdAt: any; // Firestore Timestamp
}

// ---- Review (AI Analysis) ----
export interface ReviewMistake {
  type: string;
  description: string;
  category?: string;
}

export interface ReviewCriteria {
  name: string;
  score: number;
  maxScore: number;
}

export interface Review {
  id: string;
  submissionId?: string; // Legacy, or for direct submissions
  solutionId?: string;   // For student solutions
  score: number;
  maxScore: number;
  percentage: number;
  mistakes: ReviewMistake[];
  feedback: string;
  recommendations: string[];
  strengths: string[];
  criteria: ReviewCriteria[];
  createdAt: string;
}

// ---- Teacher Feedback ----
export interface TeacherFeedback {
  teacherName: string;
  teacherAvatar?: string;
  score: number;
  maxScore: number;
  stars: number;
  comment: string;
}

// ---- Chat Message ----
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ---- Sidebar Navigation ----
export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
}

// ---- Quick Action ----
export interface QuickAction {
  label: string;
  icon: string;
  color?: string;
  onClick?: () => void;
}

// ---- Archive Entry ----
export interface ArchiveEntry {
  id: string;
  title: string;
  subtitle?: string;
  subject: string;
  date: string;
  score: number;
  type: string;
  typeBadgeColor: string;
}

// ---- Daily Goal ----
export interface DailyGoal {
  current: number;
  total: number;
  label: string;
}

// ---- Achievement Plan Item ----
export interface PlanItem {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  detail?: string;
  detailType?: 'info' | 'warning' | 'success';
}

// ---- Theme ----
export type Theme = 'light' | 'dark';

// ---- Tab ----
export interface Tab {
  id: string;
  label: string;
  isActive?: boolean;
}

// ---- Error Category Stats ----
export interface CategoryStat {
  name: string;
  count: number;
  icon?: string;
}
