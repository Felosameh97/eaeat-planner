import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  Copy,
  RefreshCw,
  Upload,
  Download,
  Cloud,
  ExternalLink,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { Subject, PriorityItem, SheetSyncConfig } from '../types';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../utils/sheetSync';

// ==================== 1. SUBJECT ADD/EDIT MODAL ====================
interface SubjectModalProps {
  subject: Subject | null; // null means Add New
  onClose: () => void;
  onSave: (subject: Subject, isNew: boolean) => void;
  onDelete?: (subjectId: string) => void;
}

export const SubjectEditorModal: React.FC<SubjectModalProps> = ({
  subject,
  onClose,
  onSave,
  onDelete,
}) => {
  const isNew = !subject;
  const [code, setCode] = useState(subject?.code || 'NEW101');
  const [name, setName] = useState(subject?.name || 'NEW101 Course Name');
  const [arabicName, setArabicName] = useState(subject?.arabicName || 'اسم المقرر بالعربية');
  const [credits, setCredits] = useState(subject?.credits ?? 3);
  const [targetMark, setTargetMark] = useState(subject?.targetMark ?? 85);
  const [passingMark, setPassingMark] = useState(subject?.passingMark ?? 60);
  const [hasSection, setHasSection] = useState(subject?.hasSection ?? true);
  const [hasLab, setHasLab] = useState(subject?.hasLab ?? true);
  const [instructor, setInstructor] = useState(subject?.instructor || 'EAEAT Faculty');
  const [scheduleInfo, setScheduleInfo] = useState(subject?.scheduleInfo || '');
  const [nextMilestone, setNextMilestone] = useState(subject?.nextMilestone || 'Quiz 1 Prep');
  const [totalSheets, setTotalSheets] = useState(subject?.tasks.totalSheets ?? 16);
  const [totalQuizzes, setTotalQuizzes] = useState(subject?.tasks.totalQuizzes ?? 2);
  const [totalAssign, setTotalAssign] = useState(subject?.tasks.totalAssign ?? 16);
  const [overdueCount, setOverdueCount] = useState(subject?.tasks.overdueCount ?? 0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase() || 'SUB100';

    const baseSubject: Subject = subject
      ? {
          ...subject,
          code: cleanCode,
          name: name.trim(),
          arabicName: arabicName.trim(),
          credits: Number(credits) || 3,
          targetMark: Number(targetMark) || 85,
          passingMark: Number(passingMark) || 60,
          hasSection,
          hasLab,
          instructor,
          scheduleInfo,
          nextMilestone,
          tasks: {
            ...subject.tasks,
            totalSheets: Number(totalSheets) || 16,
            totalQuizzes: Number(totalQuizzes) || 1,
            totalAssign: Number(totalAssign) || 16,
            overdueCount: Number(overdueCount) || 0,
          },
        }
      : {
          id: `sub-${Date.now()}`,
          code: cleanCode,
          name: name.trim(),
          arabicName: arabicName.trim(),
          credits: Number(credits) || 3,
          maxMarks: 100,
          earnedMarks: 0,
          targetMark: Number(targetMark) || 85,
          passingMark: Number(passingMark) || 60,
          hasSection,
          hasLab,
          instructor,
          scheduleInfo,
          nextMilestone,
          status: 'In Progress',
          notes: '',
          attendance: { lecDone: 0, lecMissed: 0, secDone: 0, secMissed: 0, labDone: 0, labMissed: 0 },
          tasks: {
            lecStudy: 0,
            sheetsDone: 0,
            totalSheets: Number(totalSheets) || 16,
            quizzesDone: 0,
            totalQuizzes: Number(totalQuizzes) || 2,
            assignDone: 0,
            totalAssign: Number(totalAssign) || 16,
            overdueCount: Number(overdueCount) || 0,
          },
          weeklyLog: Array.from({ length: 16 }, (_, idx) => ({
            weekNumber: idx + 1,
            topic: `${cleanCode} — Week ${String(idx + 1).padStart(2, '0')} Topic`,
            lecStatus: 'none',
            secStatus: 'none',
            labStatus: 'none',
            lecStudy: false,
            sheetDone: false,
            refRead: false,
            quizScheduled: false,
            quizDone: false,
            assignScheduled: true,
            assignDone: false,
          })),
          assessments: [
            { id: `${cleanCode}-q`, title: 'Quizzes', arabicTitle: 'الكويزات الدورية', category: 'Quiz', maxMarks: 15, earnedMarks: 0, status: 'Pending' },
            { id: `${cleanCode}-a`, title: 'Assignments & Sheets', arabicTitle: 'الشيتات والأساينمنت', category: 'Assignment', maxMarks: 15, earnedMarks: 0, status: 'Pending' },
            { id: `${cleanCode}-m`, title: 'Midterm Exam', arabicTitle: 'امتحان الميدتيرم', category: 'Midterm', maxMarks: 20, earnedMarks: 0, status: 'Pending' },
            { id: `${cleanCode}-f`, title: 'Final Exam', arabicTitle: 'الامتحان النهائي', category: 'Final', maxMarks: 50, earnedMarks: 0, status: 'Pending' },
          ],
        };

    onSave(baseSubject, isNew);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel rounded-2xl max-w-2xl w-full p-6 space-y-5 border border-white/[0.12]">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <h2 className="text-lg font-bold text-white">
            {isNew ? 'إضافة مقرر دراسي جديد' : `تعديل بيانات المقرر — ${subject.code}`}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1.5">كود المقرر (Code)</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl font-mono-tabular font-bold"
                placeholder="MEC333"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1.5">اسم المقرر بالإنجليزية (Subject Name)</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
                placeholder="MEC333 Control"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1.5">الاسم أو الوصف بالعربية</label>
              <input
                type="text"
                value={arabicName}
                onChange={(e) => setArabicName(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">المعلم المستهدف القادم (Next Milestone)</label>
              <input
                type="text"
                value={nextMilestone}
                onChange={(e) => setNextMilestone(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 mb-1.5">الساعات (Credits)</label>
              <input
                type="number"
                min="1"
                max="6"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="glass-input w-full px-3 py-2 rounded-xl font-mono-tabular text-center"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">الدرجة المستهدفة (Target)</label>
              <input
                type="number"
                min="60"
                max="100"
                value={targetMark}
                onChange={(e) => setTargetMark(Number(e.target.value))}
                className="glass-input w-full px-3 py-2 rounded-xl font-mono-tabular text-center"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">إجمالي الشيتات</label>
              <input
                type="number"
                min="1"
                max="30"
                value={totalSheets}
                onChange={(e) => setTotalSheets(Number(e.target.value))}
                className="glass-input w-full px-3 py-2 rounded-xl font-mono-tabular text-center"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">المهام المتأخرة (Overdue)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={overdueCount}
                onChange={(e) => setOverdueCount(Number(e.target.value))}
                className="glass-input w-full px-3 py-2 rounded-xl font-mono-tabular text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 mb-1.5">إجمالي الكويزات</label>
              <input
                type="number"
                min="0"
                max="20"
                value={totalQuizzes}
                onChange={(e) => setTotalQuizzes(Number(e.target.value))}
                className="glass-input w-full px-3 py-2 rounded-xl font-mono-tabular text-center"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">إجمالي الأساينمنتات</label>
              <input
                type="number"
                min="0"
                max="30"
                value={totalAssign}
                onChange={(e) => setTotalAssign(Number(e.target.value))}
                className="glass-input w-full px-3 py-2 rounded-xl font-mono-tabular text-center"
              />
            </div>
            <label className="flex items-center gap-2 pt-6 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSection}
                onChange={(e) => setHasSection(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-indigo-600"
              />
              <span className="text-slate-300">يوجد سكشن (Section)</span>
            </label>
            <label className="flex items-center gap-2 pt-6 cursor-pointer">
              <input
                type="checkbox"
                checked={hasLab}
                onChange={(e) => setHasLab(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-indigo-600"
              />
              <span className="text-slate-300">يوجد معمل (Lab)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1.5">القسم / أستاذ المقرر</label>
              <input
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">مواعيد المحاضرة والسكشن</label>
              <input
                type="text"
                value={scheduleInfo}
                onChange={(e) => setScheduleInfo(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
            {!isNew && onDelete ? (
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف المقرر
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDelete(subject.id)}
                      className="px-3 py-2 rounded-xl bg-rose-600 text-white font-bold"
                    >
                      تأكيد الحذف النهائي
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-2 text-slate-400 hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-semibold transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold led-glow-indigo transition"
              >
                {isNew ? 'إضافة المقرر' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== 2. PRIORITY ITEM ADD/EDIT MODAL ====================
interface PriorityModalProps {
  item: PriorityItem | null;
  subjects: Subject[];
  nextRank: number;
  onClose: () => void;
  onSave: (item: PriorityItem, isNew: boolean) => void;
  onDelete?: (id: string) => void;
}

export const PriorityEditorModal: React.FC<PriorityModalProps> = ({
  item,
  subjects,
  nextRank,
  onClose,
  onSave,
  onDelete,
}) => {
  const isNew = !item;
  const [rank, setRank] = useState(item?.rank ?? nextRank);
  const [code, setCode] = useState(item?.code || subjects[0]?.code || 'MEC333');
  const [priority, setPriority] = useState(item?.priority || 'عاجل اليوم (Urgent)');
  const [urgencyLevel, setUrgencyLevel] = useState<PriorityItem['urgencyLevel']>(item?.urgencyLevel || 'urgent');
  const [dueDate, setDueDate] = useState(item?.dueDate || new Date().toISOString().slice(0, 10));
  const [daysLeft, setDaysLeft] = useState(item?.daysLeft || '1 يوم (غداً)');
  const [task, setTask] = useState(item?.task || '');
  const [marks, setMarks] = useState(item?.marks || '5 درجات');
  const [urgencyReason, setUrgencyReason] = useState(item?.urgencyReason || '');
  const [targetContent, setTargetContent] = useState(item?.targetContent || '');
  const [action, setAction] = useState(item?.action || '');
  const [recommendation, setRecommendation] = useState(item?.recommendation || 'ساعتان مذاكرة مركزة');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedSub = subjects.find((s) => s.code === code);
    const totalDone = matchedSub
      ? matchedSub.attendance.lecDone + matchedSub.attendance.secDone + matchedSub.attendance.labDone
      : 0;
    const totalAll = matchedSub
      ? totalDone + matchedSub.attendance.lecMissed + matchedSub.attendance.secMissed + matchedSub.attendance.labMissed
      : 0;
    const attRateStr = totalAll > 0 ? `${((totalDone / totalAll) * 100).toFixed(1)}%` : item?.attendanceRate || '60.0%';

    const newItem: PriorityItem = {
      id: item?.id || `prio-${Date.now()}`,
      rank: Number(rank) || 1,
      code,
      name: matchedSub ? matchedSub.name : code,
      priority,
      urgencyLevel,
      daysLeft,
      dueDate,
      task,
      marks,
      attendanceRate: attRateStr,
      urgencyReason,
      targetContent,
      action,
      denialRisk: matchedSub && matchedSub.attendance.lecMissed >= 4 ? 'At Denial Risk' : 'Eligible / لائق',
      recommendation,
      completed: item?.completed ?? false,
    };

    onSave(newItem, isNew);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel rounded-2xl max-w-2xl w-full p-6 space-y-5 border border-white/[0.12]">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <h2 className="text-lg font-bold text-white">
            {isNew ? 'إضافة مهمة أو تقييم لمصفوفة الأولويات' : `تعديل الأولوية #${item.rank} — ${item.code}`}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1.5">الترتيب (# Rank)</label>
              <input
                type="number"
                min="1"
                max="20"
                value={rank}
                onChange={(e) => setRank(Number(e.target.value))}
                className="glass-input w-full px-3 py-2 rounded-xl font-mono-tabular font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">المادة (Subject)</label>
              <select
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
              >
                {subjects.map((s) => (
                  <option key={s.code} value={s.code} className="bg-slate-900">
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">درجة الاستعجال</label>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value as PriorityItem['urgencyLevel'])}
                className="glass-input w-full px-3 py-2 rounded-xl"
              >
                <option value="critical" className="bg-slate-900">قصوى (Critical)</option>
                <option value="urgent" className="bg-slate-900">عاجل اليوم (Urgent)</option>
                <option value="high" className="bg-slate-900">مرتفعة (High)</option>
                <option value="medium" className="bg-slate-900">متوسطة (Medium)</option>
                <option value="routine" className="bg-slate-900">دورية (Routine)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1.5">عنوان الأولوية</label>
              <input
                type="text"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
                placeholder="قصوى / غداً + حرمان"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">تاريخ التسليم / الامتحان</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">الأيام المتبقية</label>
              <input
                type="text"
                value={daysLeft}
                onChange={(e) => setDaysLeft(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
                placeholder="1 يوم (غداً)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1.5">المهمة / التقييم (Task / Assessment)</label>
              <input
                type="text"
                required
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
                placeholder="كويز 1 (أول 4 محاضرات) أو تسليم أساينمنت"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">الدرجات المرصودة</label>
              <input
                type="text"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
                placeholder="10 درجات"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1.5">المحتوى العلمي المستهدف (Target Content)</label>
              <input
                type="text"
                value={targetContent}
                onChange={(e) => setTargetContent(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
                placeholder="MOSFET Biasing & Small-Signal"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">سبب الاستعجال</label>
              <input
                type="text"
                value={urgencyReason}
                onChange={(e) => setUrgencyReason(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
                placeholder="كويز غداً + نسبة غياب مرتفعة"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1.5">الإجراء المطلوب فوراً</label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5">توصية اليوم</label>
              <input
                type="text"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
            {!isNew && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" />
                حذف المهمة
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-semibold transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold led-glow-indigo transition"
              >
                {isNew ? 'إضافة للمصفوفة' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== 3. GOOGLE SHEETS & VERCEL SYNC HUB MODAL ====================
interface GoogleSheetModalProps {
  config: SheetSyncConfig;
  onClose: () => void;
  onSaveConfig: (newConfig: SheetSyncConfig) => void;
  onPushToSheet: (scriptUrl: string) => Promise<void>;
  onPullFromSheet: (scriptUrl: string) => Promise<void>;
  onImportFromCsvUrl: (csvUrl: string) => Promise<void>;
  onExportCsvFile: () => void;
  onExportJsonFile: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  syncBusy: boolean;
  syncMessage: string | null;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetModalProps> = ({
  config,
  onClose,
  onSaveConfig,
  onPushToSheet,
  onPullFromSheet,
  onImportFromCsvUrl,
  onExportCsvFile,
  onExportJsonFile,
  onImportFile,
  syncBusy,
  syncMessage,
}) => {
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl || '');
  const [publishedCsvUrl, setPublishedCsvUrl] = useState(config.publishedCsvUrl || '');
  const [autoSync, setAutoSync] = useState(config.autoSync ?? true);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSaveSettings = () => {
    onSaveConfig({
      ...config,
      scriptUrl: scriptUrl.trim(),
      publishedCsvUrl: publishedCsvUrl.trim(),
      autoSync,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel rounded-2xl max-w-3xl w-full p-6 space-y-6 border border-white/[0.14] my-8">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                ربط الشيت كقاعدة بيانات سحابية (Google Sheets & Vercel Sync Hub)
              </h2>
              <p className="text-xs text-slate-400">
                مزامنة كاملة ثنائية الاتجاه بين الموبايل والكمبيوتر تعمل 100% عند رفع الموقع على Vercel
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {syncMessage && (
          <div className="p-3.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs font-medium flex items-center justify-between">
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Method 1: Two-Way Live Database via Google Apps Script (Recommended for Vercel) */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                1. المزامنة الحية ثنائية الاتجاه (قراءة وكتابة تلقائية داخل الشيت — موصى به لـ Vercel)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                لأن نشر الشيت العادي (Publish to web) يكون للقراءة فقط، يوفر لك هذا الكود الصغير داخل شيت جوجل الخاص بك حفظاً فورياً لكل تعديلاتك من الموبايل أو الكمبيوتر مباشرة داخل الشيت.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyScript}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedScript ? 'تم نسخ الكود بنجاح!' : 'نسخ كود Apps Script'}
              </button>
              <button
                type="button"
                onClick={() => setShowScriptCode(!showScriptCode)}
                className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 text-xs transition"
              >
                {showScriptCode ? 'إخفاء الكود' : 'عرض الكود والخطوات'}
              </button>
            </div>
          </div>

          {showScriptCode && (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 space-y-1 leading-relaxed">
                <p><strong>طريقة التفعيل في 30 ثانية داخل شيت جوجل:</strong></p>
                <p>1. افتح شيت جوجل الخاص بك ثم من القائمة العلوية اختر <strong>Extensions ➔ Apps Script</strong>.</p>
                <p>2. الصق الكود المنسوخ ثم اضغط <strong>Deploy ➔ New deployment</strong> واختر النوع <strong>Web app</strong>.</p>
                <p>3. اجعل <em>Who has access</em> على خيار <strong>Anyone</strong> ثم انسخ الـ <strong>Web app URL</strong> والصقه بالأسفل.</p>
              </div>
              <pre
                dir="ltr"
                className="p-3 rounded-xl bg-black/70 border border-white/[0.08] text-[11px] font-mono-tabular text-slate-300 max-h-44 overflow-y-auto text-left"
              >
                {GOOGLE_APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          )}

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                رابط Google Apps Script Web App URL (للحفظ والمزامنة التلقائية على Vercel):
              </label>
              <input
                dir="ltr"
                type="url"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="glass-input w-full px-3.5 py-2 rounded-xl text-xs font-mono-tabular text-left"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-indigo-600"
                />
                <span>مزامنة تلقائية مع الشيت عند أي تعديل (Auto-Sync on Edit)</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!scriptUrl.trim() || syncBusy}
                  onClick={() => {
                    handleSaveSettings();
                    onPushToSheet(scriptUrl);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  رفع البيانات الحالية للشيت (Push)
                </button>
                <button
                  type="button"
                  disabled={!scriptUrl.trim() || syncBusy}
                  onClick={() => {
                    handleSaveSettings();
                    onPullFromSheet(scriptUrl);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 border border-white/[0.1] text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  سحب أحدث البيانات من الشيت (Pull)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Method 2: Published Google Sheet CSV Link (Read-Only Pull) */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
          <h3 className="text-sm font-bold text-white">
            2. استيراد مباشر من رابط شيت منشور (Published Google Sheet CSV Link)
          </h3>
          <p className="text-xs text-slate-400">
            إذا قمت بعمل <strong>File ➔ Share ➔ Publish to web ➔ CSV</strong> للشيت الأصلي، أو جعلت رابط الشيت متاحاً للعرض، ضع الرابط هنا لسحب أرقام الحضور والشيتات والدرجات منه فوراً:
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              dir="ltr"
              type="url"
              value={publishedCsvUrl}
              onChange={(e) => setPublishedCsvUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
              className="glass-input flex-1 px-3.5 py-2 rounded-xl text-xs font-mono-tabular text-left"
            />
            <button
              type="button"
              disabled={!publishedCsvUrl.trim() || syncBusy}
              onClick={() => {
                handleSaveSettings();
                onImportFromCsvUrl(publishedCsvUrl);
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 border border-white/[0.1] text-white text-xs font-semibold whitespace-nowrap transition"
            >
              قراءة وتحديث من رابط CSV
            </button>
          </div>
        </div>

        {/* Method 3: Local File Import / Export (.CSV & .JSON) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportCsvFile}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              تحميل نسخة CSV (متوافقة مع Excel/Sheets)
            </button>
            <button
              type="button"
              onClick={onExportJsonFile}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              تحميل نسخة كاملة JSON
            </button>
            <label className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-violet-400" />
              رفع ملف CSV أو JSON
              <input type="file" accept=".csv,.json" onChange={onImportFile} className="hidden" />
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              handleSaveSettings();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold led-glow-indigo transition"
          >
            حفظ الإعدادات وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
