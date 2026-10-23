import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  X,
  Minus,
  Plus,
  Trash2,
  Edit3,
  Award,
  BookOpen,
  Calculator,
  Clock,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Sliders,
} from 'lucide-react';
import {
  Subject,
  WeekEntry,
  AssessmentItem,
  AttendanceState,
  getEAEATGrade,
  computeSubjectAttendance,
  computeSubjectTaskProgress,
} from '../types';

interface SubjectDetailViewProps {
  subject: Subject;
  academicWeek: number;
  onUpdateSubject: (updated: Subject) => void;
  onEditSubjectModal: (subject: Subject) => void;
  onBack: () => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subject,
  academicWeek,
  onUpdateSubject,
  onEditSubjectModal,
  onBack,
}) => {
  const [subTab, setSubTab] = useState<'weeks' | 'assessments' | 'simulator' | 'notes'>('weeks');
  const [autoSyncFromWeeks, setAutoSyncFromWeeks] = useState<boolean>(true);

  // What-if simulator state (simulated total marks)
  const [simulatedAdditionalMarks, setSimulatedAdditionalMarks] = useState<number>(
    Math.max(0, subject.targetMark - subject.earnedMarks)
  );

  // Focus Study Timer state
  const [timerMode, setTimerMode] = useState<25 | 50 | 15>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    setSimulatedAdditionalMarks(Math.max(0, subject.targetMark - subject.earnedMarks));
  }, [subject.code, subject.earnedMarks, subject.targetMark]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const changeTimerPreset = (mins: 25 | 50 | 15) => {
    setTimerRunning(false);
    setTimerMode(mins);
    setSecondsLeft(mins * 60);
  };

  const attStats = computeSubjectAttendance(subject);
  const taskStats = computeSubjectTaskProgress(subject);
  const scorePct = subject.maxMarks > 0 ? (subject.earnedMarks / subject.maxMarks) * 100 : 0;
  const gradeInfo = getEAEATGrade(scorePct);

  // Recalculate summary counters from weeklyLog when a week cell is toggled
  const updateWeeksAndRecalculate = (newWeeks: WeekEntry[]) => {
    if (!autoSyncFromWeeks) {
      onUpdateSubject({ ...subject, weeklyLog: newWeeks });
      return;
    }

    let lecDone = 0,
      lecMissed = 0,
      secDone = 0,
      secMissed = 0,
      labDone = 0,
      labMissed = 0;
    let lecStudy = 0,
      sheetsDone = 0,
      quizzesDone = 0,
      assignDone = 0;

    newWeeks.forEach((w) => {
      if (w.lecStatus === 'done') lecDone++;
      if (w.lecStatus === 'missed') lecMissed++;
      if (w.secStatus === 'done') secDone++;
      if (w.secStatus === 'missed') secMissed++;
      if (w.labStatus === 'done') labDone++;
      if (w.labStatus === 'missed') labMissed++;

      if (w.lecStudy) lecStudy++;
      if (w.sheetDone) sheetsDone++;
      if (w.quizDone) quizzesDone++;
      if (w.assignDone) assignDone++;
    });

    onUpdateSubject({
      ...subject,
      weeklyLog: newWeeks,
      attendance: {
        lecDone,
        lecMissed,
        secDone,
        secMissed,
        labDone,
        labMissed,
      },
      tasks: {
        ...subject.tasks,
        lecStudy,
        sheetsDone,
        quizzesDone,
        assignDone,
      },
    });
  };

  const cycleAttendanceState = (current: AttendanceState): AttendanceState => {
    if (current === 'none') return 'done';
    if (current === 'done') return 'missed';
    return 'none';
  };

  const handleToggleWeekAttendance = (weekNum: number, field: 'lecStatus' | 'secStatus' | 'labStatus') => {
    const updatedWeeks = subject.weeklyLog.map((w) => {
      if (w.weekNumber === weekNum) {
        return { ...w, [field]: cycleAttendanceState(w[field]) };
      }
      return w;
    });
    updateWeeksAndRecalculate(updatedWeeks);
  };

  const handleToggleWeekBoolean = (
    weekNum: number,
    field: 'lecStudy' | 'sheetDone' | 'refRead' | 'quizDone' | 'assignDone'
  ) => {
    const updatedWeeks = subject.weeklyLog.map((w) => {
      if (w.weekNumber === weekNum) {
        return { ...w, [field]: !w[field] };
      }
      return w;
    });
    updateWeeksAndRecalculate(updatedWeeks);
  };

  const handleWeekTopicChange = (weekNum: number, topic: string) => {
    const updatedWeeks = subject.weeklyLog.map((w) => (w.weekNumber === weekNum ? { ...w, topic } : w));
    onUpdateSubject({ ...subject, weeklyLog: updatedWeeks });
  };

  // Assessments CRUD handlers
  const updateAssessmentsList = (newAssessments: AssessmentItem[]) => {
    const sumEarned = newAssessments.reduce((acc, a) => acc + (Number(a.earnedMarks) || 0), 0);
    onUpdateSubject({
      ...subject,
      assessments: newAssessments,
      earnedMarks: Math.min(subject.maxMarks, Math.max(0, Number(sumEarned.toFixed(2)))),
    });
  };

  const handleAssessmentChange = (id: string, field: keyof AssessmentItem, value: any) => {
    const updated = subject.assessments.map((a) => {
      if (a.id !== id) return a;
      const copy = { ...a, [field]: value };
      if (field === 'earnedMarks') {
        const num = Math.max(0, Math.min(copy.maxMarks, Number(value) || 0));
        copy.earnedMarks = num;
        copy.status = num > 0 ? (num >= copy.maxMarks ? 'Completed' : 'In Progress') : copy.status;
      }
      return copy;
    });
    updateAssessmentsList(updated);
  };

  const handleAddAssessment = () => {
    const newItem: AssessmentItem = {
      id: `${subject.code}-assess-${Date.now()}`,
      title: 'New Assessment Component',
      arabicTitle: 'تقييم أو كويز جديد',
      category: 'Quiz',
      maxMarks: 10,
      earnedMarks: 0,
      status: 'Pending',
      dueDate: new Date().toISOString().slice(0, 10),
    };
    updateAssessmentsList([...subject.assessments, newItem]);
  };

  const handleDeleteAssessment = (id: string) => {
    updateAssessmentsList(subject.assessments.filter((a) => a.id !== id));
  };

  const totalAssessmentMax = subject.assessments.reduce((acc, a) => acc + (Number(a.maxMarks) || 0), 0);
  const remainingPossibleMarks = Math.max(0, subject.maxMarks - subject.earnedMarks);
  const simulatedTotal = Math.min(subject.maxMarks, subject.earnedMarks + simulatedAdditionalMarks);
  const simulatedGrade = getEAEATGrade((simulatedTotal / subject.maxMarks) * 100);

  const renderAttendanceBadge = (state: AttendanceState) => {
    if (state === 'done') {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
          <Check className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (state === 'missed') {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
          <X className="w-3.5 h-3.5" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-600">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Subject Header Panel */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium transition"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                العودة للوحة القيادة
              </button>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-indigo-300 font-semibold">{subject.code}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{subject.credits} ساعات معتمدة (Credits)</span>
              <span aria-hidden="true">·</span>
              <span>{subject.instructor || 'EAEAT Faculty'}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {subject.name} — <span className="text-slate-300 font-normal">{subject.arabicName}</span>
            </h1>
            {subject.scheduleInfo && (
              <p className="text-xs text-slate-400">{subject.scheduleInfo}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onEditSubjectModal(subject)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-slate-200 flex items-center gap-2 transition whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              تعديل إعدادات المادة
            </button>
          </div>
        </div>

        {/* 4 Subject KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {/* Attendance Rate */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>نسبة الحضور الجامعي</span>
              <span className={attStats.isDenialRisk ? 'text-rose-400 font-semibold' : attStats.isWarning ? 'text-amber-400' : 'text-emerald-400'}>
                {attStats.warningLabel}
              </span>
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-white">
              {attStats.rate.toFixed(1)}%
            </div>
            <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  attStats.isDenialRisk ? 'bg-rose-500' : attStats.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, attStats.rate)}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-mono-tabular">
              حضر {attStats.totalDone} · غياب {attStats.totalMissed} · {attStats.eligibilityLabel}
            </div>
          </div>

          {/* Coursework Progress */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>إنجاز المهام والشيتات</span>
              <span className="font-mono-tabular text-amber-400">متأخر: {subject.tasks.overdueCount}</span>
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-white">
              {taskStats.progressPct.toFixed(1)}%
            </div>
            <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.min(100, taskStats.progressPct)}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-mono-tabular">
              شيتات {subject.tasks.sheetsDone}/{subject.tasks.totalSheets} · كويزات {subject.tasks.quizzesDone}/{subject.tasks.totalQuizzes} · أساينمنت {subject.tasks.assignDone}/{subject.tasks.totalAssign}
            </div>
          </div>

          {/* Official 100-Mark Score */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>الدرجة المرصودة حالياً</span>
              <span className="font-mono-tabular text-indigo-300">المستهدف: {subject.targetMark}+</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono-tabular text-white">
                {subject.earnedMarks}
              </span>
              <span className="text-xs font-mono-tabular text-slate-400">/ {subject.maxMarks}</span>
              <span className="mr-auto text-sm font-bold font-mono-tabular text-indigo-400">
                ({gradeInfo.letter} · {gradeInfo.points.toFixed(2)})
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{ width: `${Math.min(100, scorePct)}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              حد النجاح الأدنى: <span className="font-mono-tabular">{subject.passingMark}/100</span> · {gradeInfo.arabicStanding}
            </div>
          </div>

          {/* Next Milestone Quick Edit */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between">
            <div className="text-xs text-slate-400 mb-1">المعلم المستهدف القادم (Next Milestone)</div>
            <input
              type="text"
              value={subject.nextMilestone}
              onChange={(e) => onUpdateSubject({ ...subject, nextMilestone: e.target.value })}
              className="glass-input w-full px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              placeholder="اكتب المهمة القادمة..."
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>الحالة:</span>
              <select
                value={subject.status}
                onChange={(e) => onUpdateSubject({ ...subject, status: e.target.value })}
                className="bg-transparent text-indigo-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="In Progress" className="bg-slate-900">In Progress</option>
                <option value="Midterm Prep" className="bg-slate-900">Midterm Prep</option>
                <option value="Backlog Focus" className="bg-slate-900">Backlog Focus</option>
                <option value="Completed" className="bg-slate-900">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs for Subject Workspace */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07] overflow-x-auto">
          <button
            onClick={() => setSubTab('weeks')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              subTab === 'weeks'
                ? 'bg-indigo-600 text-white led-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            سجل الـ 16 أسبوعاً (16-Week Matrix)
          </button>
          <button
            onClick={() => setSubTab('assessments')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              subTab === 'assessments'
                ? 'bg-indigo-600 text-white led-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            تقسيم الـ 100 درجة (Official 100-Mark Breakdown)
          </button>
          <button
            onClick={() => setSubTab('simulator')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              subTab === 'simulator'
                ? 'bg-indigo-600 text-white led-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            محاكي التقدير (What-If Grade Simulator)
          </button>
          <button
            onClick={() => setSubTab('notes')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              subTab === 'notes'
                ? 'bg-indigo-600 text-white led-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            ملاحظات المقرر ومؤقت المذاكرة
          </button>
        </div>

        {subTab === 'weeks' && (
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSyncFromWeeks}
              onChange={(e) => setAutoSyncFromWeeks(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0"
            />
            <span>تحديث إجمالي الحضور والشيتات تلقائياً عند تعليم الأسابيع</span>
          </label>
        )}
      </div>

      {/* ==================== SUB-TAB 1: 16-WEEK TRACKING MATRIX ==================== */}
      {subTab === 'weeks' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                مصفوفة المتابعة الأسبوعية — 16 أسبوعاً ({subject.code})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                اضغط على خانات الحضور (محاضرة / سكشن / معمل) للتبديل بين: <span className="text-emerald-400 font-semibold">حضر (✓)</span> · <span className="text-rose-400 font-semibold">غاب (✗)</span> · <span className="text-slate-500">لم يحن (-)</span>، وعلم على مهام المذاكرة الذاتية والشيتات.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono-tabular">
              الأسبوع الحالي: <span className="text-indigo-400 font-bold">Week {String(academicWeek).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-white/[0.02] text-slate-400 border-b border-white/[0.08]">
                  <th className="py-3 px-4 font-semibold w-20">الأسبوع</th>
                  <th className="py-3 px-4 font-semibold min-w-[230px]">موضوع المحاضرة / الأسبوع (Syllabus Topic)</th>
                  <th className="py-3 px-2.5 text-center font-semibold" title="Physical Lecture Attendance">محاضرة Lec</th>
                  <th className="py-3 px-2.5 text-center font-semibold" title="Section / Tutorial Attendance">سكشن Sec</th>
                  <th className="py-3 px-2.5 text-center font-semibold" title="Laboratory Session">معمل Lab</th>
                  <th className="py-3 px-2.5 text-center font-semibold" title="Lecture Self-Study at Home">مذاكرة Lec</th>
                  <th className="py-3 px-2.5 text-center font-semibold" title="Tutorial Sheet Solved">حل شيت</th>
                  <th className="py-3 px-2.5 text-center font-semibold" title="Reference Textbook Reading">مرجع Ref</th>
                  <th className="py-3 px-2.5 text-center font-semibold" title="In-Class Quiz Completed">كويز Quiz</th>
                  <th className="py-3 px-2.5 text-center font-semibold" title="Assignment Submitted">أساينمنت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {subject.weeklyLog.map((w) => {
                  const isCurrentWeek = w.weekNumber === academicWeek;
                  const isExamWeek = w.weekNumber === 8 || w.weekNumber === 16;
                  return (
                    <tr
                      key={w.weekNumber}
                      className={`transition-colors ${
                        isCurrentWeek
                          ? 'bg-indigo-500/[0.09] hover:bg-indigo-500/[0.14]'
                          : isExamWeek
                          ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono-tabular font-semibold whitespace-nowrap">
                        <span className={isCurrentWeek ? 'text-indigo-400 font-bold' : 'text-slate-300'}>
                          W{String(w.weekNumber).padStart(2, '0')}
                        </span>
                        {isCurrentWeek && (
                          <span className="mr-1.5 text-[10px] text-indigo-300 font-normal">· الحالي</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={w.topic}
                          onChange={(e) => handleWeekTopicChange(w.weekNumber, e.target.value)}
                          className="w-full bg-transparent text-slate-200 focus:text-white focus:outline-none border-b border-transparent focus:border-indigo-500/50 py-0.5 text-xs"
                        />
                      </td>

                      {/* Campus Attendance Tri-State Buttons */}
                      <td className="py-2.5 px-2.5 text-center">
                        <button
                          onClick={() => handleToggleWeekAttendance(w.weekNumber, 'lecStatus')}
                          title="اضغط للتبديل: حضر / غاب / لم يحن"
                        >
                          {renderAttendanceBadge(w.lecStatus)}
                        </button>
                      </td>

                      <td className="py-2.5 px-2.5 text-center">
                        {subject.hasSection ? (
                          <button
                            onClick={() => handleToggleWeekAttendance(w.weekNumber, 'secStatus')}
                            title="اضغط للتبديل: حضر / غاب / لم يحن"
                          >
                            {renderAttendanceBadge(w.secStatus)}
                          </button>
                        ) : (
                          <span className="text-slate-700 font-mono-tabular">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 text-center">
                        {subject.hasLab ? (
                          <button
                            onClick={() => handleToggleWeekAttendance(w.weekNumber, 'labStatus')}
                            title="اضغط للتبديل: حضر / غاب / لم يحن"
                          >
                            {renderAttendanceBadge(w.labStatus)}
                          </button>
                        ) : (
                          <span className="text-slate-700 font-mono-tabular">—</span>
                        )}
                      </td>

                      {/* Self-Study & Deliverables Checkboxes */}
                      {(['lecStudy', 'sheetDone', 'refRead', 'quizDone', 'assignDone'] as const).map((field) => {
                        const checked = w[field];
                        return (
                          <td key={field} className="py-2.5 px-2.5 text-center">
                            <button
                              onClick={() => handleToggleWeekBoolean(w.weekNumber, field)}
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-md border transition ${
                                checked
                                  ? 'bg-indigo-600/80 border-indigo-400 text-white'
                                  : 'bg-white/[0.02] border-white/[0.1] text-transparent hover:border-white/[0.25]'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: OFFICIAL 100-MARK BREAKDOWN ==================== */}
      {subTab === 'assessments' && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                تقسيم الـ 100 درجة الرسمي — Official 100-Mark Assessment & Grade Breakdown
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                أدخل درجاتك المحرزة في عمود <span className="text-indigo-300">Earned Marks</span> ليتم حساب النسبة المئوية والتقدير التراكمي للمادة تلقائياً (Row ∑).
              </p>
            </div>
            <button
              onClick={handleAddAssessment}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition led-glow-indigo whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              إضافة بند تقييم جديد
            </button>
          </div>

          {totalAssessmentMax !== subject.maxMarks && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <span>
                تنبيه: مجموع الدرجات العظمى لبنود التقييم حالياً هو <strong className="font-mono-tabular">{totalAssessmentMax}</strong> بينما الدرجة العظمى للمادة هي <strong className="font-mono-tabular">{subject.maxMarks}</strong>.
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-white/[0.02] text-slate-400 border-b border-white/[0.08]">
                  <th className="p-3 font-semibold">بند التقييم (Assessment Component)</th>
                  <th className="p-3 font-semibold">الوصف بالعربية</th>
                  <th className="p-3 text-center font-semibold">الفئة</th>
                  <th className="p-3 text-center font-semibold">الدرجة العظمى (Max)</th>
                  <th className="p-3 text-center font-semibold">الدرجة المحرزة (Earned)</th>
                  <th className="p-3 text-center font-semibold">النسبة (% Score)</th>
                  <th className="p-3 text-center font-semibold">الحالة (Status)</th>
                  <th className="p-3 text-center font-semibold">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {subject.assessments.map((item) => {
                  const itemPct = item.maxMarks > 0 ? (item.earnedMarks / item.maxMarks) * 100 : 0;
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleAssessmentChange(item.id, 'title', e.target.value)}
                          className="glass-input px-2.5 py-1.5 rounded-lg text-xs w-full text-white"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.arabicTitle}
                          onChange={(e) => handleAssessmentChange(item.id, 'arabicTitle', e.target.value)}
                          className="glass-input px-2.5 py-1.5 rounded-lg text-xs w-full text-slate-300"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={item.category}
                          onChange={(e) => handleAssessmentChange(item.id, 'category', e.target.value)}
                          className="glass-input px-2 py-1.5 rounded-lg text-xs text-slate-200"
                        >
                          <option value="Quiz" className="bg-slate-900">Quiz</option>
                          <option value="Assignment" className="bg-slate-900">Assignment</option>
                          <option value="Lab" className="bg-slate-900">Lab</option>
                          <option value="Midterm" className="bg-slate-900">Midterm</option>
                          <option value="Project" className="bg-slate-900">Project</option>
                          <option value="Final" className="bg-slate-900">Final</option>
                          <option value="Other" className="bg-slate-900">Other</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.maxMarks}
                          onChange={(e) => handleAssessmentChange(item.id, 'maxMarks', Number(e.target.value))}
                          className="glass-input w-20 px-2 py-1.5 rounded-lg text-center font-mono-tabular font-semibold text-slate-200"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={item.maxMarks}
                          step="0.5"
                          value={item.earnedMarks}
                          onChange={(e) => handleAssessmentChange(item.id, 'earnedMarks', Number(e.target.value))}
                          className="glass-input w-20 px-2 py-1.5 rounded-lg text-center font-mono-tabular font-bold text-indigo-300 border-indigo-500/40"
                        />
                      </td>
                      <td className="p-3 text-center font-mono-tabular font-semibold text-slate-300">
                        {itemPct.toFixed(1)}%
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={item.status}
                          onChange={(e) => handleAssessmentChange(item.id, 'status', e.target.value)}
                          className="glass-input px-2.5 py-1.5 rounded-lg text-xs text-slate-300"
                        >
                          <option value="Pending" className="bg-slate-900">Pending</option>
                          <option value="In Progress" className="bg-slate-900">In Progress</option>
                          <option value="Completed" className="bg-slate-900">Completed</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteAssessment(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="حذف البند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Row ∑ Summary Row */}
                <tr className="bg-indigo-950/30 border-t-2 border-indigo-500/30 font-bold text-white">
                  <td className="p-3.5" colSpan={3}>
                    Row ∑ — TOTAL COURSE GRADE & STANDING (إجمالي درجات المقرر)
                  </td>
                  <td className="p-3.5 text-center font-mono-tabular text-slate-300">
                    {totalAssessmentMax} / {subject.maxMarks}
                  </td>
                  <td className="p-3.5 text-center font-mono-tabular text-emerald-400 text-sm">
                    {subject.earnedMarks}
                  </td>
                  <td className="p-3.5 text-center font-mono-tabular text-indigo-300 text-sm">
                    {scorePct.toFixed(1)}%
                  </td>
                  <td className="p-3.5 text-center font-mono-tabular text-violet-300" colSpan={2}>
                    Grade: {gradeInfo.letter} ({gradeInfo.points.toFixed(2)} Pts)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 3: WHAT-IF GRADE SIMULATOR ==================== */}
      {subTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                محاكي التقدير الذكي (What-If Course Grade Simulator)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                حرك المؤشر لتجربة الدرجات المتوقعة في التقييمات المتبقية (الميدتيرم، الفاينل، المعمل) ومعرفة تقديرك النهائي ونقاط الـ GPA لهذه المادة.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">درجاتك المضمونة حالياً:</span>
                <span className="font-mono-tabular font-bold text-white">{subject.earnedMarks} / {subject.maxMarks}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-300 font-semibold">درجات إضافية متوقعة في باقي الترم:</span>
                  <span className="font-mono-tabular font-bold text-indigo-400">+{simulatedAdditionalMarks} درجة</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={remainingPossibleMarks}
                  step="1"
                  value={simulatedAdditionalMarks}
                  onChange={(e) => setSimulatedAdditionalMarks(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">المجموع النهائي المتوقع</div>
                  <div className="text-2xl font-bold font-mono-tabular text-white">
                    {simulatedTotal} <span className="text-sm font-normal text-slate-400">/ {subject.maxMarks}</span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-xs text-slate-400">التقدير والنقاط (EAEAT 4.00)</div>
                  <div className="text-2xl font-bold font-mono-tabular text-emerald-400">
                    {simulatedGrade.letter} · {simulatedGrade.points.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              كم درجة تحتاج في باقي الترم للوصول لكل تقدير؟
            </h3>
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'A+ (امتياز مرتفع جداً · 4.00)', minMark: 97 },
                { label: 'A (امتياز · 4.00)', minMark: 93 },
                { label: 'A- (امتياز منخفض · 3.70)', minMark: 89 },
                { label: 'B+ (جيد جداً مرتفع · 3.30)', minMark: 84 },
                { label: 'B (جيد جداً · 3.00)', minMark: 80 },
                { label: 'C (مقبول مرتفع · 2.00)', minMark: 70 },
                { label: 'D (حد النجاح الأدنى · 1.00)', minMark: 60 },
              ].map((tier) => {
                const needed = Math.max(0, tier.minMark - subject.earnedMarks);
                const achievable = needed <= remainingPossibleMarks;
                return (
                  <div
                    key={tier.label}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <span className="font-medium text-slate-200">{tier.label}</span>
                    <span className={`font-mono-tabular font-semibold ${needed === 0 ? 'text-emerald-400' : achievable ? 'text-indigo-300' : 'text-rose-400'}`}>
                      {needed === 0
                        ? 'تم تحقيقه بالفعل ✓'
                        : `تحتاج +${needed} درجة من أصل ${remainingPossibleMarks} متبقية`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 4: COURSE NOTES & FOCUS STUDY TIMER ==================== */}
      {subTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Focus Study Timer */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                مؤقت المذاكرة المركزة ({subject.code})
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                استخدم تقنية البومودورو للتركيز في مذاكرة المحاضرات أو حل شيتات {subject.name}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {([15, 25, 50] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => changeTimerPreset(m)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono-tabular font-semibold border transition ${
                    timerMode === m
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white'
                  }`}
                >
                  {m} د
                </button>
              ))}
            </div>

            <div className="py-6 text-center rounded-2xl bg-black/40 border border-white/[0.06]">
              <div className="text-5xl font-bold font-mono-tabular text-white tracking-wider">
                {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
                {String(secondsLeft % 60).padStart(2, '0')}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                {timerRunning ? 'جلسة تركيز نشطة الآن...' : 'جاهز لبدء جلسة مذاكرة'}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition led-glow-indigo"
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {timerRunning ? 'إيقاف مؤقت' : 'ابدأ المذاكرة'}
              </button>
              <button
                onClick={() => changeTimerPreset(timerMode)}
                className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 transition"
                title="إعادة ضبط المؤقت"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Course Study Notes Editor */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  ملاحظات المقرر، القوانين الهامة، ومحتوى الكويزات ({subject.code})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  يتم حفظ جميع ملاحظاتك تلقائياً ومزامنتها مع قاعدة البيانات والشيت.
                </p>
              </div>
            </div>

            <textarea
              rows={9}
              value={subject.notes}
              onChange={(e) => onUpdateSubject({ ...subject, notes: e.target.value })}
              placeholder="اكتب ملخص القوانين، ملاحظات الدكتور والمعيد، أو أرقام المسائل الهامة في الشيت..."
              className="glass-input w-full flex-1 p-4 rounded-xl text-sm text-slate-100 leading-relaxed resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
};
