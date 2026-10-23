export type AttendanceState = 'none' | 'done' | 'missed';

export interface WeekEntry {
  weekNumber: number; // 1 to 16
  topic: string;
  lecStatus: AttendanceState;
  secStatus: AttendanceState;
  labStatus: AttendanceState;
  lecStudy: boolean;
  sheetDone: boolean;
  refRead: boolean;
  quizScheduled: boolean;
  quizDone: boolean;
  quizScore?: string;
  assignScheduled: boolean;
  assignDone: boolean;
  note?: string;
}

export interface AssessmentItem {
  id: string;
  title: string;
  arabicTitle: string;
  category: 'Quiz' | 'Assignment' | 'Midterm' | 'Lab' | 'Project' | 'Final' | 'Other';
  maxMarks: number;
  earnedMarks: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate?: string;
  weightNote?: string;
}

export interface AttendanceSummary {
  lecDone: number;
  lecMissed: number;
  secDone: number;
  secMissed: number;
  labDone: number;
  labMissed: number;
}

export interface TasksSummary {
  lecStudy: number;
  sheetsDone: number;
  totalSheets: number;
  quizzesDone: number;
  totalQuizzes: number;
  assignDone: number;
  totalAssign: number;
  overdueCount: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  arabicName: string;
  credits: number;
  maxMarks: number;
  earnedMarks: number;
  targetMark: number;
  passingMark: number;
  hasLab: boolean;
  hasSection: boolean;
  instructor?: string;
  scheduleInfo?: string;
  nextMilestone: string;
  status: string;
  notes: string;
  attendance: AttendanceSummary;
  tasks: TasksSummary;
  weeklyLog: WeekEntry[];
  assessments: AssessmentItem[];
}

export interface PriorityItem {
  id: string;
  rank: number;
  code: string;
  name: string;
  priority: string;
  urgencyLevel: 'critical' | 'urgent' | 'high' | 'medium' | 'routine';
  daysLeft: string;
  dueDate: string;
  task: string;
  marks: string;
  attendanceRate: string;
  urgencyReason: string;
  targetContent: string;
  action: string;
  denialRisk: string;
  recommendation: string;
  completed?: boolean;
}

export interface SheetSyncConfig {
  scriptUrl: string;
  publishedCsvUrl: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface AppData {
  academicWeek: number;
  semesterName: string;
  creator: string;
  institution: string;
  targetGPA: number;
  semesterGoal: string;
  targetAttendanceRate: number;
  subjects: Subject[];
  priorityMatrix: PriorityItem[];
  sheetSyncConfig?: SheetSyncConfig;
}

export interface GradeConversion {
  letter: string;
  points: number;
  definition: string;
  arabicStanding: string;
}

export function getEAEATGrade(percentage: number): GradeConversion {
  if (percentage >= 97) return { letter: 'A+', points: 4.0, definition: 'Distinction / Highest Honors', arabicStanding: 'امتياز مرتفع جداً' };
  if (percentage >= 93) return { letter: 'A', points: 4.0, definition: 'Excellent / High Honors', arabicStanding: 'امتياز' };
  if (percentage >= 89) return { letter: 'A-', points: 3.7, definition: 'Excellent', arabicStanding: 'امتياز منخفض' };
  if (percentage >= 84) return { letter: 'B+', points: 3.3, definition: 'Very Good', arabicStanding: 'جيد جداً مرتفع' };
  if (percentage >= 80) return { letter: 'B', points: 3.0, definition: 'Good / Standard Passing', arabicStanding: 'جيد جداً' };
  if (percentage >= 76) return { letter: 'B-', points: 2.7, definition: 'Satisfactory Plus', arabicStanding: 'جيد مرتفع' };
  if (percentage >= 73) return { letter: 'C+', points: 2.3, definition: 'Satisfactory', arabicStanding: 'جيد' };
  if (percentage >= 70) return { letter: 'C', points: 2.0, definition: 'Average Passing', arabicStanding: 'مقبول مرتفع' };
  if (percentage >= 67) return { letter: 'C-', points: 1.7, definition: 'Below Average Passing', arabicStanding: 'مقبول' };
  if (percentage >= 64) return { letter: 'D+', points: 1.3, definition: 'Conditional Pass', arabicStanding: 'مقبول منخفض' };
  if (percentage >= 60) return { letter: 'D', points: 1.0, definition: 'Minimum Pass', arabicStanding: 'نجاح بالحد الأدنى' };
  return { letter: 'F', points: 0.0, definition: 'Fail / Repeat Course', arabicStanding: 'دون حد النجاح (Ongoing / F)' };
}

export function computeSubjectAttendance(s: Subject) {
  const totalDone = s.attendance.lecDone + s.attendance.secDone + s.attendance.labDone;
  const totalMissed = s.attendance.lecMissed + s.attendance.secMissed + s.attendance.labMissed;
  const totalSessions = totalDone + totalMissed;
  const rate = totalSessions > 0 ? (totalDone / totalSessions) * 100 : 0;

  // Denial risk check: missed >= 4 lectures/sessions or rate < 50% with >= 4 missed
  const isDenialRisk = s.attendance.lecMissed >= 4 || totalMissed >= 7 || (totalSessions >= 4 && rate < 30);
  const isWarning = !isDenialRisk && (rate < 75 || totalMissed >= 4);

  let warningLabel = 'منتظم وآمن';
  let eligibilityLabel = 'Eligible / لائق';
  let standingLabel = 'Satisfactory / مقبول';

  if (isDenialRisk) {
    warningLabel = 'خطر حرمان (>25%)';
    eligibilityLabel = 'At Denial Risk';
    standingLabel = 'Warning / تحت الملاحظة';
  } else if (isWarning) {
    warningLabel = 'إنذار غياب';
    eligibilityLabel = 'Eligible / لائق';
    standingLabel = 'Warning / تحت الملاحظة';
  }

  return {
    totalDone,
    totalMissed,
    totalSessions,
    rate,
    isDenialRisk,
    isWarning,
    warningLabel,
    eligibilityLabel,
    standingLabel,
  };
}

export function computeSubjectTaskProgress(s: Subject) {
  const totalDeliverablesDone = s.tasks.lecStudy + s.tasks.sheetsDone + s.tasks.quizzesDone + s.tasks.assignDone;
  // Total possible across 16 lectures + totalSheets + totalQuizzes + totalAssign
  const totalDeliverablesTarget = 16 + s.tasks.totalSheets + s.tasks.totalQuizzes + s.tasks.totalAssign;
  const progressPct = totalDeliverablesTarget > 0 ? (totalDeliverablesDone / totalDeliverablesTarget) * 100 : 0;
  return {
    totalDeliverablesDone,
    totalDeliverablesTarget,
    progressPct,
  };
}
