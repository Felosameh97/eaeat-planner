import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  GraduationCap,
  AlertTriangle,
  Calendar,
  Award,
  RefreshCw,
  Plus,
  Minus,
  FileText,
  BarChart3,
  UserCheck,
  HelpCircle,
  ChevronLeft,
  Edit3,
  Check,
  Target,
  Menu,
  X,
  FileSpreadsheet,
  Sliders,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  AppData,
  Subject,
  PriorityItem,
  AttendanceSummary,
  TasksSummary,
  SheetSyncConfig,
  getEAEATGrade,
  computeSubjectAttendance,
  computeSubjectTaskProgress,
} from './types';
import { DEFAULT_APP_DATA } from './defaultData';
import {
  pushToGoogleSheetScript,
  pullFromGoogleSheetScript,
  normalizeGoogleSheetCsvUrl,
  parseSheetCSVIntoAppData,
  exportAppDataToCSV,
} from './utils/sheetSync';
import { SubjectDetailView } from './components/SubjectDetailView';
import {
  SubjectEditorModal,
  PriorityEditorModal,
  GoogleSheetSyncModal,
} from './components/Modals';

const LOCAL_STORAGE_KEY = 'eaeat_study_os_v2_data';

export default function App() {
  const [data, setData] = useState<AppData>(DEFAULT_APP_DATA);
  const [activeView, setActiveView] = useState<
    'dashboard' | 'priority' | 'attendance' | 'tasks' | 'grades' | 'guide' | 'subject'
  >('dashboard');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('MEC333');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals state
  const [subjectModalTarget, setSubjectModalTarget] = useState<Subject | null | undefined>(undefined); // undefined = closed, null = new
  const [priorityModalTarget, setPriorityModalTarget] = useState<PriorityItem | null | undefined>(undefined);
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Sync status
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSavedLabel, setLastSavedLabel] = useState<string>('محفوظ محلياً');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data from localStorage / Server / Google Sheet Script
  useEffect(() => {
    initLoadData();
  }, []);

  const initLoadData = async () => {
    let loaded: AppData | null = null;

    // 1. Check localStorage first for zero-latency boot
    try {
      const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (parsed && Array.isArray(parsed.subjects) && parsed.subjects[0]?.weeklyLog) {
          loaded = parsed;
          setData(parsed);
        }
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }

    // 2. If user has a Google Sheet Script URL configured in local data, pull latest from Google Sheet
    if (loaded?.sheetSyncConfig?.scriptUrl && loaded.sheetSyncConfig.autoSync) {
      const pullRes = await pullFromGoogleSheetScript(loaded.sheetSyncConfig.scriptUrl);
      if (pullRes.ok && pullRes.data) {
        const merged: AppData = {
          ...pullRes.data,
          sheetSyncConfig: loaded.sheetSyncConfig,
        };
        setData(merged);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        setLastSavedLabel('متزامن مع Google Sheet');
        return;
      }
    }

    // 3. Otherwise try backend API (when running in AI Studio container)
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && Array.isArray(serverData.subjects) && serverData.subjects[0]?.weeklyLog) {
          // Prefer local if user already edited on Vercel/browser, else use serverData
          if (!loaded) {
            setData(serverData);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverData));
          }
          setLastSavedLabel('متزامن تلقائياً');
        }
      }
    } catch {
      // Running on static Vercel deployment without Express server — localStorage + Google Sheet handles it
    }
  };

  const persistData = async (nextData: AppData) => {
    setData(nextData);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextData));
    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    setLastSavedLabel(`تم الحفظ ${timeStr}`);

    // Save to Express backend if available
    try {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextData),
      }).catch(() => {});
    } catch {}

    // Auto-push to Google Sheet if configured
    if (nextData.sheetSyncConfig?.scriptUrl && nextData.sheetSyncConfig.autoSync) {
      const res = await pushToGoogleSheetScript(nextData.sheetSyncConfig.scriptUrl, nextData);
      if (res.ok) {
        setLastSavedLabel(`متزامن مع الشيت ${timeStr}`);
      }
    }
  };

  // Navigate to dedicated subject page
  const openSubjectPage = (code: string) => {
    setSelectedSubjectCode(code);
    setActiveView('subject');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Subject update handlers
  const handleUpdateSubject = (updatedSub: Subject) => {
    const nextSubjects = data.subjects.map((s) => (s.id === updatedSub.id || s.code === updatedSub.code ? updatedSub : s));
    persistData({ ...data, subjects: nextSubjects });
  };

  const handleSaveSubjectFromModal = (sub: Subject, isNew: boolean) => {
    const nextSubjects = isNew
      ? [...data.subjects, sub]
      : data.subjects.map((s) => (s.id === sub.id ? sub : s));
    persistData({ ...data, subjects: nextSubjects });
    setSubjectModalTarget(undefined);
    if (isNew) {
      openSubjectPage(sub.code);
    }
  };

  const handleDeleteSubject = (subjectId: string) => {
    const filtered = data.subjects.filter((s) => s.id !== subjectId);
    persistData({ ...data, subjects: filtered });
    setSubjectModalTarget(undefined);
    if (activeView === 'subject' && filtered.length > 0) {
      setSelectedSubjectCode(filtered[0].code);
    } else {
      setActiveView('dashboard');
    }
  };

  // Quick inline attendance update
  const handleQuickAttendanceDelta = (code: string, field: keyof AttendanceSummary, delta: number) => {
    const nextSubjects = data.subjects.map((s) => {
      if (s.code !== code) return s;
      const nextVal = Math.max(0, s.attendance[field] + delta);
      return {
        ...s,
        attendance: {
          ...s.attendance,
          [field]: nextVal,
        },
      };
    });
    persistData({ ...data, subjects: nextSubjects });
  };

  // Quick inline tasks update
  const handleQuickTaskDelta = (code: string, field: keyof TasksSummary, delta: number) => {
    const nextSubjects = data.subjects.map((s) => {
      if (s.code !== code) return s;
      const nextVal = Math.max(0, s.tasks[field] + delta);
      return {
        ...s,
        tasks: {
          ...s.tasks,
          [field]: nextVal,
        },
      };
    });
    persistData({ ...data, subjects: nextSubjects });
  };

  // Quick inline earned marks update
  const handleQuickEarnedMarks = (code: string, earned: number) => {
    const nextSubjects = data.subjects.map((s) => {
      if (s.code !== code) return s;
      const clamped = Math.max(0, Math.min(s.maxMarks, earned));
      return { ...s, earnedMarks: clamped };
    });
    persistData({ ...data, subjects: nextSubjects });
  };

  // Priority Matrix CRUD
  const handleSavePriorityItem = (item: PriorityItem, isNew: boolean) => {
    let nextList = isNew
      ? [...data.priorityMatrix, item]
      : data.priorityMatrix.map((p) => (p.id === item.id ? item : p));
    nextList = nextList.sort((a, b) => a.rank - b.rank);
    persistData({ ...data, priorityMatrix: nextList });
    setPriorityModalTarget(undefined);
  };

  const handleDeletePriorityItem = (id: string) => {
    const nextList = data.priorityMatrix.filter((p) => p.id !== id);
    persistData({ ...data, priorityMatrix: nextList });
    setPriorityModalTarget(undefined);
  };

  const handleTogglePriorityDone = (id: string) => {
    const nextList = data.priorityMatrix.map((p) =>
      p.id === id ? { ...p, completed: !p.completed } : p
    );
    persistData({ ...data, priorityMatrix: nextList });
  };

  // Google Sheets Sync Hub Handlers
  const handleSaveSheetConfig = (newConfig: SheetSyncConfig) => {
    persistData({ ...data, sheetSyncConfig: newConfig });
  };

  const handlePushToSheet = async (scriptUrl: string) => {
    setSyncBusy(true);
    setSyncMessage('جاري رفع جميع البيانات إلى Google Sheet...');
    const res = await pushToGoogleSheetScript(scriptUrl, data);
    setSyncBusy(false);
    if (res.ok) {
      setSyncMessage('تم رفع البيانات وحفظها داخل شيت جوجل بنجاح! يمكنك فتح الموقع الآن من الموبايل أو الكمبيوتر.');
      setLastSavedLabel('متزامن مع Google Sheet');
    } else {
      setSyncMessage(`تعذر الاتصال بالسكربت: ${res.error}`);
    }
  };

  const handlePullFromSheet = async (scriptUrl: string) => {
    setSyncBusy(true);
    setSyncMessage('جاري سحب أحدث البيانات من Google Sheet...');
    const res = await pullFromGoogleSheetScript(scriptUrl);
    setSyncBusy(false);
    if (res.ok && res.data) {
      const merged: AppData = {
        ...res.data,
        sheetSyncConfig: {
          ...(data.sheetSyncConfig || { scriptUrl, publishedCsvUrl: '', autoSync: true }),
          scriptUrl,
        },
      };
      persistData(merged);
      setSyncMessage('تم تحديث التطبيق بأحدث البيانات من الشيت بنجاح!');
    } else {
      setSyncMessage(res.error || 'تعذر سحب البيانات من الشيت.');
    }
  };

  const handleImportFromCsvUrl = async (rawUrl: string) => {
    setSyncBusy(true);
    setSyncMessage('جاري قراءة الشيت المنشور (CSV)...');
    try {
      const csvUrl = normalizeGoogleSheetCsvUrl(rawUrl);
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csvText = await res.text();
      const updated = parseSheetCSVIntoAppData(csvText, data);
      persistData(updated);
      setSyncMessage('تم استيراد بيانات الحضور والمهام والدرجات من رابط الشيت بنجاح!');
    } catch (err: any) {
      setSyncMessage(
        'تعذر قراءة الرابط مباشرة. تأكد من عمل File -> Share -> Publish to web -> CSV داخل شيت جوجل.'
      );
    } finally {
      setSyncBusy(false);
    }
  };

  const handleExportCsvFile = () => {
    const csvStr = exportAppDataToCSV(data);
    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EAEAT_Study_Planner_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJsonFile = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EAEAT_Study_Planner_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (!content) return;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed && Array.isArray(parsed.subjects)) {
            persistData(parsed);
            setSyncMessage('تم استيراد ملف JSON بنجاح!');
          }
        } catch {
          setSyncMessage('ملف JSON غير صالح.');
        }
      } else {
        const updated = parseSheetCSVIntoAppData(content, data);
        persistData(updated);
        setSyncMessage('تم استيراد ملف الشيت (CSV) وتحديث المواد بنجاح!');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // ==================== AGGREGATE CALCULATIONS ====================
  const totalCredits = data.subjects.reduce((acc, s) => acc + s.credits, 0);
  const totalEarnedMarks = data.subjects.reduce((acc, s) => acc + s.earnedMarks, 0);
  const totalMaxMarks = data.subjects.reduce((acc, s) => acc + s.maxMarks, 0);
  const overallMarksPct = totalMaxMarks > 0 ? (totalEarnedMarks / totalMaxMarks) * 100 : 0;

  let totalQualityPoints = 0;
  let projectedTargetQualityPoints = 0;
  data.subjects.forEach((s) => {
    const pct = s.maxMarks > 0 ? (s.earnedMarks / s.maxMarks) * 100 : 0;
    const { points } = getEAEATGrade(pct);
    totalQualityPoints += points * s.credits;

    const targetPct = s.maxMarks > 0 ? (s.targetMark / s.maxMarks) * 100 : 85;
    const targetGrade = getEAEATGrade(targetPct);
    projectedTargetQualityPoints += targetGrade.points * s.credits;
  });

  const currentGPA = totalCredits > 0 ? totalQualityPoints / totalCredits : 0;
  const projectedGPAFromTargets = totalCredits > 0 ? projectedTargetQualityPoints / totalCredits : 0;
  const gpaGap = Math.max(0, data.targetGPA - currentGPA);
  const requiredQualityPointsForTarget = data.targetGPA * totalCredits;

  // Attendance aggregates
  let aggLecDone = 0,
    aggLecMissed = 0,
    aggSecDone = 0,
    aggSecMissed = 0,
    aggLabDone = 0,
    aggLabMissed = 0;
  data.subjects.forEach((s) => {
    aggLecDone += s.attendance.lecDone;
    aggLecMissed += s.attendance.lecMissed;
    aggSecDone += s.attendance.secDone;
    aggSecMissed += s.attendance.secMissed;
    aggLabDone += s.attendance.labDone;
    aggLabMissed += s.attendance.labMissed;
  });
  const aggTotalDone = aggLecDone + aggSecDone + aggLabDone;
  const aggTotalMissed = aggLecMissed + aggSecMissed + aggLabMissed;
  const aggAttendanceRate =
    aggTotalDone + aggTotalMissed > 0 ? (aggTotalDone / (aggTotalDone + aggTotalMissed)) * 100 : 0;

  // Deliverables aggregates
  let aggLecStudy = 0,
    aggSheetsDone = 0,
    aggTotalSheets = 0,
    aggQuizzesDone = 0,
    aggTotalQuizzes = 0,
    aggAssignDone = 0,
    aggTotalAssign = 0,
    aggOverdue = 0;

  data.subjects.forEach((s) => {
    aggLecStudy += s.tasks.lecStudy;
    aggSheetsDone += s.tasks.sheetsDone;
    aggTotalSheets += s.tasks.totalSheets;
    aggQuizzesDone += s.tasks.quizzesDone;
    aggTotalQuizzes += s.tasks.totalQuizzes;
    aggAssignDone += s.tasks.assignDone;
    aggTotalAssign += s.tasks.totalAssign;
    aggOverdue += s.tasks.overdueCount;
  });

  const aggDeliverablesDone = aggLecStudy + aggSheetsDone + aggQuizzesDone + aggAssignDone;
  const aggDeliverablesTotal = data.subjects.length * 16 + aggTotalSheets + aggTotalQuizzes + aggTotalAssign;
  const pendingQuizzes = Math.max(0, aggTotalQuizzes - aggQuizzesDone);
  const pendingAssigns = Math.max(0, aggTotalAssign - aggAssignDone);

  const activeSubject =
    data.subjects.find((s) => s.code === selectedSubjectCode) || data.subjects[0];

  const filteredSubjects = data.subjects.filter(
    (s) =>
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.arabicName.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-[#040508] text-slate-100 flex flex-col relative selection:bg-indigo-500/40">
      {/* Subtle Ambient LED Background Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 right-1/4 w-[520px] h-[520px] rounded-full bg-indigo-600/[0.07] blur-[130px]" />
        <div className="absolute top-1/2 -left-32 w-[460px] h-[460px] rounded-full bg-violet-600/[0.06] blur-[140px]" />
        <div className="absolute -bottom-40 right-10 w-[420px] h-[420px] rounded-full bg-emerald-600/[0.04] blur-[130px]" />
      </div>

      {/* ==================== TOP BAR CONTRACT (3 ZONES) ==================== */}
      <header className="sticky top-0 z-40 bg-[#05070c]/85 backdrop-blur-2xl border-b border-white/[0.08] px-4 lg:px-8 py-3.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setActiveView('dashboard')}
              className="text-base lg:text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
            >
              EAEAT Study OS
            </button>
          </div>

          {/* Zone 2: 5 Single-line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
            {[
              { id: 'dashboard', label: 'لوحة القيادة' },
              { id: 'priority', label: 'مصفوفة الأولويات' },
              { id: 'attendance', label: 'سجل الحضور' },
              { id: 'tasks', label: 'الشيتات والمهام' },
              { id: 'grades', label: 'الدرجات و GPA' },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => setActiveView(nav.id as any)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  activeView === nav.id
                    ? 'text-white border-indigo-500'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setSyncMessage(null);
                setSheetModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition led-glow-indigo whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              مزامنة Google Sheet
            </button>
          </div>
        </div>
      </header>

      {/* ==================== WORKSPACE SHELL (SIDEBAR + MAIN VIEWPORT) ==================== */}
      <div className="max-w-[1440px] mx-auto w-full flex-1 flex relative z-10">
        {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-y-0 right-0 z-50 w-72 bg-[#070911]' : 'hidden lg:flex lg:w-64'
          } flex-col justify-between border-l border-white/[0.08] p-4 shrink-0`}
        >
          <div className="space-y-6">
            {/* Academic Week Selector */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>الأسبوع الدراسي</span>
                <span className="font-mono-tabular text-indigo-400 font-bold">
                  W{String(data.academicWeek).padStart(2, '0')} / 16
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    persistData({ ...data, academicWeek: Math.max(1, data.academicWeek - 1) })
                  }
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-300"
                  title="الأسبوع السابق"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 text-center font-mono-tabular text-sm font-bold text-white">
                  Week {String(data.academicWeek).padStart(2, '0')}
                </div>
                <button
                  onClick={() =>
                    persistData({ ...data, academicWeek: Math.min(16, data.academicWeek + 1) })
                  }
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-300"
                  title="الأسبوع التالي"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-slate-500 text-center">{lastSavedLabel}</div>
            </div>

            {/* Primary Views */}
            <div className="space-y-1">
              <div className="px-2.5 text-[11px] font-semibold text-slate-500 mb-2">
                الأقسام الرئيسية
              </div>
              {[
                { id: 'dashboard', label: 'لوحة القيادة الشاملة', icon: BarChart3 },
                { id: 'priority', label: 'مصفوفة الأولويات الذكية', icon: Target },
                { id: 'attendance', label: 'متابعة الحضور والالتزام', icon: UserCheck },
                { id: 'tasks', label: 'الشيتات والمهام الدراسية', icon: FileText },
                { id: 'grades', label: 'الدرجات والمعدل التراكمي', icon: Award },
                { id: 'guide', label: 'دليل الاستخدام ونظام 4.00', icon: HelpCircle },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                      active
                        ? 'bg-indigo-600/20 text-white border border-indigo-500/40'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dedicated Subject Pages List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2.5 mb-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  صفحات المواد ({data.subjects.length})
                </span>
                <button
                  onClick={() => setSubjectModalTarget(null)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  إضافة مادة
                </button>
              </div>

              <div className="space-y-1 max-h-[320px] overflow-y-auto pr-0.5">
                {data.subjects.map((sub) => {
                  const isSelected = activeView === 'subject' && selectedSubjectCode === sub.code;
                  const att = computeSubjectAttendance(sub);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => openSubjectPage(sub.code)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white led-glow-indigo font-bold'
                          : 'text-slate-300 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className="flex flex-col items-start truncate">
                        <span className="font-mono-tabular font-semibold">{sub.code}</span>
                        <span className={`text-[10px] truncate max-w-[130px] ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {sub.name.replace(sub.code, '').trim()}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-mono-tabular ${
                          isSelected
                            ? 'text-white'
                            : att.isDenialRisk
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {att.rate.toFixed(0)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Bottom Actions */}
          <div className="pt-4 border-t border-white/[0.08] space-y-2 text-xs">
            <div className="px-2 text-[11px] text-slate-500">
              Architect: <span className="text-slate-300">{data.creator}</span>
            </div>
            {!confirmResetOpen ? (
              <button
                onClick={() => setConfirmResetOpen(true)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 text-[11px] flex items-center justify-center gap-1.5 transition"
              >
                <RotateCcw className="w-3 h-3" />
                إعادة ضبط لبيانات الشيت الأصلية
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-2">
                <p className="text-[11px] text-rose-200 text-center">استعادة البيانات الافتراضية للشيت؟</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      persistData(DEFAULT_APP_DATA);
                      setConfirmResetOpen(false);
                    }}
                    className="flex-1 py-1 rounded bg-rose-600 text-white text-[11px] font-bold"
                  >
                    تأكيد
                  </button>
                  <button
                    onClick={() => setConfirmResetOpen(false)}
                    className="flex-1 py-1 rounded bg-white/10 text-slate-300 text-[11px]"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ==================== MAIN VIEWPORT CONTENT ==================== */}
        <main className="flex-1 p-4 lg:p-8 min-w-0 space-y-6">
          {/* ==================== VIEW: DEDICATED SUBJECT PAGE ==================== */}
          {activeView === 'subject' && activeSubject && (
            <SubjectDetailView
              subject={activeSubject}
              academicWeek={data.academicWeek}
              onUpdateSubject={handleUpdateSubject}
              onEditSubjectModal={(s) => setSubjectModalTarget(s)}
              onBack={() => setActiveView('dashboard')}
            />
          )}

          {/* ==================== VIEW: DASHBOARD OVERVIEW ==================== */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* 1. Target GPA & Semester Goal Ambition Hub */}
              <section className="glass-panel rounded-2xl p-6 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-1.5 lg:max-w-md">
                    <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold">
                      <Target className="w-4 h-4" />
                      <span>هدف الفصل الدراسي والمعدل التراكمي المستهدف (Semester Ambition Tracker)</span>
                    </div>
                    <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
                      {data.semesterName}
                    </h1>
                    <p className="text-xs text-slate-400">
                      {data.institution} · متابعة شاملة لـ {data.subjects.length} مقررات ({totalCredits} ساعة معتمدة)
                    </p>
                  </div>

                  {/* Interactive Inputs: Target GPA + Semester Goal Description */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3">
                      <label
                        htmlFor="target-gpa-input"
                        className="block text-xs text-slate-300 font-semibold mb-1.5"
                      >
                        Target GPA (من 4.00)
                      </label>
                      <div className="relative">
                        <input
                          id="target-gpa-input"
                          type="number"
                          min="0"
                          max="4.0"
                          step="0.05"
                          value={data.targetGPA}
                          onChange={(e) =>
                            persistData({
                              ...data,
                              targetGPA: Math.max(0, Math.min(4.0, parseFloat(e.target.value) || 0)),
                            })
                          }
                          className="glass-input w-full px-3.5 py-2.5 rounded-xl font-mono-tabular text-lg font-extrabold text-indigo-300 text-center"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-9">
                      <label
                        htmlFor="semester-goal-input"
                        className="block text-xs text-slate-300 font-semibold mb-1.5"
                      >
                        هدف الفصل الدراسي (Semester Goal & Study Ambition)
                      </label>
                      <input
                        id="semester-goal-input"
                        type="text"
                        value={data.semesterGoal}
                        onChange={(e) => persistData({ ...data, semesterGoal: e.target.value })}
                        placeholder="اكتب هدفك الأكاديمي لهذا الترم..."
                        className="glass-input w-full px-4 py-2.5 rounded-xl text-xs lg:text-sm text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Ambition vs Current Progress Bar */}
                <div className="mt-5 pt-4 border-t border-white/[0.07] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex items-center justify-between bg-white/[0.02] px-4 py-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-slate-400">المعدل الحالي / المستهدف:</span>
                    <span className="font-mono-tabular font-bold text-white">
                      {currentGPA.toFixed(2)} <span className="text-slate-500">/</span>{' '}
                      <span className="text-indigo-400">{data.targetGPA.toFixed(2)}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white/[0.02] px-4 py-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-slate-400">المعدل المتوقع عند تحقيق أهداف المواد:</span>
                    <span className="font-mono-tabular font-bold text-emerald-400">
                      {projectedGPAFromTargets.toFixed(2)} / 4.00
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white/[0.02] px-4 py-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-slate-400">نقاط الجودة المطلوبة للهدف:</span>
                    <span className="font-mono-tabular font-bold text-violet-300">
                      {totalQualityPoints.toFixed(1)} / {requiredQualityPointsForTarget.toFixed(1)} Pts
                    </span>
                  </div>
                </div>
              </section>

              {/* 2. 6-Metric KPI Strip (Matching Spreadsheet Header Row) */}
              <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div className="glass-panel rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 mb-1">الأسبوع الحالي</div>
                  <div className="text-2xl font-extrabold font-mono-tabular text-white">
                    Week {String(data.academicWeek).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">يتجدد كل سبت</div>
                </div>

                <div className="glass-panel rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 mb-1">المهام المتأخرة</div>
                  <div className="text-2xl font-extrabold font-mono-tabular text-amber-400">
                    {aggOverdue}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">تحتاج إنجاز عاجل</div>
                </div>

                <div className="glass-panel rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 mb-1">نسبة الحضور</div>
                  <div className="text-2xl font-extrabold font-mono-tabular text-emerald-400">
                    {aggAttendanceRate.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">المستهدف ≥ 85%</div>
                </div>

                <div className="glass-panel rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 mb-1">التسليمات المنجزة</div>
                  <div className="text-2xl font-extrabold font-mono-tabular text-indigo-400">
                    {aggDeliverablesDone}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono-tabular">
                    من أصل {aggDeliverablesTotal} مهمة
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 mb-1">كويزات وأساينمنت متبقية</div>
                  <div className="text-2xl font-extrabold font-mono-tabular text-white">
                    {pendingQuizzes} <span className="text-sm font-normal text-slate-500">·</span> {pendingAssigns}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">كويز · أساينمنت</div>
                </div>

                <div className="glass-panel rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 mb-1">مجموع الدرجات النشط</div>
                  <div className="text-2xl font-extrabold font-mono-tabular text-violet-400">
                    {totalEarnedMarks} <span className="text-xs font-normal text-slate-500">/ {totalMaxMarks}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono-tabular">
                    الهدف: {data.targetGPA.toFixed(2)} GPA
                  </div>
                </div>
              </section>

              {/* 3. Dedicated Subject Cards Grid (Click to open full Subject Page) */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      المقررات الدراسية — اضغط على أي مادة لفتح صفحتها الكاملة (16 أسبوعاً + تقسيم الـ 100 درجة)
                    </h2>
                    <p className="text-xs text-slate-400">
                      يمكنك تعديل أي مادة أو إضافة مادة جديدة أو الدخول لصفحة المادة التفصيلية.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بكود أو اسم المادة..."
                      className="glass-input px-3.5 py-2 rounded-xl text-xs w-48"
                    />
                    <button
                      onClick={() => setSubjectModalTarget(null)}
                      className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4 text-indigo-400" />
                      إضافة مقرر
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSubjects.map((sub) => {
                    const att = computeSubjectAttendance(sub);
                    const taskProg = computeSubjectTaskProgress(sub);
                    const scorePct = sub.maxMarks > 0 ? (sub.earnedMarks / sub.maxMarks) * 100 : 0;

                    return (
                      <div
                        key={sub.id}
                        className="glass-panel-interactive rounded-2xl p-5 flex flex-col justify-between"
                      >
                        <div>
                          {/* Clean unboxed metadata kicker */}
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                            <div className="flex items-center gap-2 font-mono-tabular">
                              <span className="text-indigo-400 font-bold">{sub.code}</span>
                              <span aria-hidden="true">·</span>
                              <span>{sub.credits} Cr</span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={
                                  att.isDenialRisk
                                    ? 'text-rose-400 font-semibold'
                                    : att.isWarning
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {att.warningLabel}
                              </span>
                            </div>
                            <button
                              onClick={() => setSubjectModalTarget(sub)}
                              className="p-1 text-slate-500 hover:text-white transition"
                              title="تعديل بيانات المادة"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => openSubjectPage(sub.code)}
                            className="text-right block w-full group"
                          >
                            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                              {sub.name}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">{sub.arabicName}</p>
                          </button>

                          {/* Progress Bars */}
                          <div className="mt-4 space-y-2.5 text-xs">
                            <div>
                              <div className="flex justify-between text-slate-300 mb-1">
                                <span>الحضور (Lec {sub.attendance.lecDone} · Sec {sub.attendance.secDone} · Lab {sub.attendance.labDone})</span>
                                <span className="font-mono-tabular font-semibold">{att.rate.toFixed(1)}%</span>
                              </div>
                              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    att.isDenialRisk ? 'bg-rose-500' : att.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, att.rate)}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-slate-300 mb-1">
                                <span>إنجاز المهام (شيتات {sub.tasks.sheetsDone}/{sub.tasks.totalSheets})</span>
                                <span className="font-mono-tabular font-semibold">{taskProg.progressPct.toFixed(1)}%</span>
                              </div>
                              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${Math.min(100, taskProg.progressPct)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                            <span className="truncate max-w-[200px]">القادم: {sub.nextMilestone}</span>
                            <span className="font-mono-tabular font-bold text-white">
                              {sub.earnedMarks}/{sub.maxMarks} ({scorePct.toFixed(0)}%)
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                          <button
                            onClick={() => openSubjectPage(sub.code)}
                            className="w-full py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                          >
                            <span>فتح صفحة المادة وسجل الـ 16 أسبوعاً</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 4. Smart Priority Matrix Preview on Dashboard */}
              <section className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      مصفوفة أولوية المذاكرة الفورية (Smart Study Priority Matrix)
                    </h2>
                    <p className="text-xs text-slate-400">
                      مرتبة حسب المهام المتأخرة، قرب موعد الكويزات، وخطر الحرمان (&gt;25% غياب).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPriorityModalTarget(null)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة مهمة أولوية
                    </button>
                    <button
                      onClick={() => setActiveView('priority')}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold transition"
                    >
                      عرض الجدول الكامل
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {data.priorityMatrix.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                        item.completed
                          ? 'bg-white/[0.01] border-white/[0.05] opacity-60'
                          : 'bg-white/[0.02] border-white/[0.08] hover:border-indigo-500/40'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-mono-tabular">
                            <span className="font-bold text-indigo-400">#{item.rank}</span>
                            <span aria-hidden="true">·</span>
                            <button
                              onClick={() => openSubjectPage(item.code)}
                              className="font-bold text-white hover:text-indigo-300 underline-offset-2 hover:underline"
                            >
                              {item.code}
                            </button>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-400">{item.daysLeft}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTogglePriorityDone(item.id)}
                              className={`p-1 rounded border ${
                                item.completed
                                  ? 'bg-emerald-600 border-emerald-400 text-white'
                                  : 'border-white/20 text-transparent hover:border-white/40'
                              }`}
                              title="تعليم كمنجز"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setPriorityModalTarget(item)}
                              className="p-1 text-slate-500 hover:text-white"
                              title="تعديل المهمة"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className={`text-sm font-bold ${item.completed ? 'line-through text-slate-400' : 'text-white'}`}>
                          {item.task} <span className="text-xs font-normal text-indigo-300">({item.marks})</span>
                        </h4>
                        <p className="text-xs text-slate-400">{item.targetContent}</p>
                      </div>

                      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">{item.action}</span>
                        <span className="text-indigo-400 font-semibold shrink-0">{item.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ==================== VIEW: SMART PRIORITY MATRIX (FULL CRUD TABLE) ==================== */}
          {activeView === 'priority' && (
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h1 className="text-xl font-bold text-white">
                    مصفوفة أولوية المذاكرة الفورية — Smart Study Priority Matrix
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    أضف أو عدل الكويزات والتسليمات القادمة لترتيب خطة مذاكرتك اليومية.
                  </p>
                </div>
                <button
                  onClick={() => setPriorityModalTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 led-glow-indigo transition whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مهمة أو كويز جديد
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-white/[0.02] text-slate-400 border-b border-white/[0.08]">
                      <th className="p-3 font-semibold">تم</th>
                      <th className="p-3 font-semibold">الترتيب / الكود</th>
                      <th className="p-3 font-semibold">الأولوية والوقت</th>
                      <th className="p-3 font-semibold">المهمة / التقييم</th>
                      <th className="p-3 font-semibold">الدرجة</th>
                      <th className="p-3 font-semibold">المحتوى العلمي المستهدف</th>
                      <th className="p-3 font-semibold">الإجراء المطلوب فوراً</th>
                      <th className="p-3 font-semibold">توصية اليوم</th>
                      <th className="p-3 text-center font-semibold">تعديل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {data.priorityMatrix.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-white/[0.03] transition ${item.completed ? 'opacity-50' : ''}`}
                      >
                        <td className="p-3">
                          <button
                            onClick={() => handleTogglePriorityDone(item.id)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition ${
                              item.completed
                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                : 'bg-white/[0.02] border-white/[0.15] text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="p-3 font-mono-tabular">
                          <div className="font-bold text-indigo-300">
                            #{item.rank} ·{' '}
                            <button
                              onClick={() => openSubjectPage(item.code)}
                              className="hover:underline text-white"
                            >
                              {item.code}
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-500">{item.dueDate}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-amber-400">{item.priority}</div>
                          <div className="text-[11px] text-slate-400">{item.daysLeft}</div>
                        </td>
                        <td className="p-3 font-semibold text-white">{item.task}</td>
                        <td className="p-3 font-mono-tabular text-indigo-300">{item.marks}</td>
                        <td className="p-3 text-slate-300">{item.targetContent}</td>
                        <td className="p-3 text-emerald-300 font-medium">{item.action}</td>
                        <td className="p-3 text-slate-300">{item.recommendation}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setPriorityModalTarget(item)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-300"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== VIEW: CAMPUS ATTENDANCE MASTER TRACKER ==================== */}
          {activeView === 'attendance' && (
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h1 className="text-xl font-bold text-white">
                    جدول متابعة الحضور والالتزام الجامعي (Semester Attendance Tracker)
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    متابعة دقيقة لنسب حضور المحاضرات والسكاشن والمعامل لجميع المقررات. اضغط على اسم أي مادة لفتح سجل الـ 16 أسبوعاً التفصيلي.
                  </p>
                </div>
                <div className="font-mono-tabular text-sm font-bold text-emerald-400">
                  إجمالي الحضور: {aggAttendanceRate.toFixed(1)}% (المستهدف ≥ 85%)
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-white/[0.02] text-slate-400 border-b border-white/[0.08]">
                      <th className="p-3 font-semibold">الكود والمقرر</th>
                      <th className="p-3 text-center font-semibold">محاضرات (Lec Done / Missed)</th>
                      <th className="p-3 text-center font-semibold">سكاشن (Sec Done / Missed)</th>
                      <th className="p-3 text-center font-semibold">معامل (Lab Done / Missed)</th>
                      <th className="p-3 text-center font-semibold">نسبة الحضور</th>
                      <th className="p-3 text-center font-semibold">إجمالي الغياب</th>
                      <th className="p-3 text-center font-semibold">الإنذار والأهلية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {data.subjects.map((s) => {
                      const att = computeSubjectAttendance(s);
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3">
                            <button
                              onClick={() => openSubjectPage(s.code)}
                              className="text-right group"
                            >
                              <div className="font-mono-tabular font-bold text-indigo-400 group-hover:underline">
                                {s.code}
                              </div>
                              <div className="text-slate-300 font-medium">{s.name}</div>
                            </button>
                          </td>

                          {/* Lectures */}
                          <td className="p-3 text-center font-mono-tabular">
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'lecDone', 1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-emerald-600 text-white"
                                >
                                  +
                                </button>
                                <span className="text-emerald-400 font-bold w-5">{s.attendance.lecDone}</span>
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'lecDone', -1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-400"
                                >
                                  -
                                </button>
                              </div>
                              <span className="text-slate-600">/</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'lecMissed', 1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-rose-600 text-white"
                                >
                                  +
                                </button>
                                <span className="text-rose-400 font-bold w-5">{s.attendance.lecMissed}</span>
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'lecMissed', -1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-400"
                                >
                                  -
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Sections */}
                          <td className="p-3 text-center font-mono-tabular">
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'secDone', 1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-emerald-600 text-white"
                                >
                                  +
                                </button>
                                <span className="text-emerald-400 font-bold w-5">{s.attendance.secDone}</span>
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'secDone', -1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-400"
                                >
                                  -
                                </button>
                              </div>
                              <span className="text-slate-600">/</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'secMissed', 1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-rose-600 text-white"
                                >
                                  +
                                </button>
                                <span className="text-rose-400 font-bold w-5">{s.attendance.secMissed}</span>
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'secMissed', -1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-400"
                                >
                                  -
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Labs */}
                          <td className="p-3 text-center font-mono-tabular">
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'labDone', 1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-emerald-600 text-white"
                                >
                                  +
                                </button>
                                <span className="text-emerald-400 font-bold w-5">{s.attendance.labDone}</span>
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'labDone', -1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-400"
                                >
                                  -
                                </button>
                              </div>
                              <span className="text-slate-600">/</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'labMissed', 1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-rose-600 text-white"
                                >
                                  +
                                </button>
                                <span className="text-rose-400 font-bold w-5">{s.attendance.labMissed}</span>
                                <button
                                  onClick={() => handleQuickAttendanceDelta(s.code, 'labMissed', -1)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-400"
                                >
                                  -
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 text-center font-mono-tabular font-bold text-white">
                            {att.rate.toFixed(1)}%
                          </td>

                          <td className="p-3 text-center font-mono-tabular font-bold text-rose-400">
                            {att.totalMissed}
                          </td>

                          <td className="p-3 text-center">
                            <span
                              className={`font-semibold ${
                                att.isDenialRisk
                                  ? 'text-rose-400'
                                  : att.isWarning
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {att.warningLabel} · {att.eligibilityLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Aggregate Row */}
                    <tr className="bg-indigo-950/30 border-t-2 border-indigo-500/30 font-bold text-white font-mono-tabular">
                      <td className="p-3.5">الإجمالي (Semester Aggregate)</td>
                      <td className="p-3.5 text-center">
                        <span className="text-emerald-400">{aggLecDone}</span> /{' '}
                        <span className="text-rose-400">{aggLecMissed}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-emerald-400">{aggSecDone}</span> /{' '}
                        <span className="text-rose-400">{aggSecMissed}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-emerald-400">{aggLabDone}</span> /{' '}
                        <span className="text-rose-400">{aggLabMissed}</span>
                      </td>
                      <td className="p-3.5 text-center text-emerald-400">
                        {aggAttendanceRate.toFixed(1)}%
                      </td>
                      <td className="p-3.5 text-center text-rose-400">{aggTotalMissed}</td>
                      <td className="p-3.5 text-center text-slate-300">Eligible for Exams</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== VIEW: DELIVERABLES & STUDY TASKS TRACKER ==================== */}
          {activeView === 'tasks' && (
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h1 className="text-xl font-bold text-white">
                    جدول متابعة المهام والتكليفات الدراسية (Coursework & Deliverables Tracker)
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    متابعة الشيتات المحلولة، الكويزات المؤداة، الأساينمنتات المسلمة، ومذاكرة المحاضرات.
                  </p>
                </div>
                <div className="font-mono-tabular text-sm font-bold text-indigo-400">
                  المنجز: {aggDeliverablesDone} / {aggDeliverablesTotal} مهمة
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-white/[0.02] text-slate-400 border-b border-white/[0.08]">
                      <th className="p-3 font-semibold">الكود والمقرر</th>
                      <th className="p-3 text-center font-semibold">مذاكرة محاضرات (Lec Study)</th>
                      <th className="p-3 text-center font-semibold">الشيتات (Sheets)</th>
                      <th className="p-3 text-center font-semibold">الكويزات (Quizzes)</th>
                      <th className="p-3 text-center font-semibold">الأساينمنت (Assigns)</th>
                      <th className="p-3 text-center font-semibold">الإنجاز %</th>
                      <th className="p-3 text-center font-semibold">المتأخر (Overdue)</th>
                      <th className="p-3 font-semibold">المعلم القادم (Next Milestone)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {data.subjects.map((s) => {
                      const prog = computeSubjectTaskProgress(s);
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3">
                            <button onClick={() => openSubjectPage(s.code)} className="text-right group">
                              <div className="font-mono-tabular font-bold text-indigo-400 group-hover:underline">
                                {s.code}
                              </div>
                              <div className="text-slate-300">{s.name}</div>
                            </button>
                          </td>

                          {/* Lec Study */}
                          <td className="p-3 text-center font-mono-tabular">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleQuickTaskDelta(s.code, 'lecStudy', 1)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-indigo-600 text-white"
                              >
                                +
                              </button>
                              <span className="font-bold text-white w-6">{s.tasks.lecStudy}</span>
                              <button
                                onClick={() => handleQuickTaskDelta(s.code, 'lecStudy', -1)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-400"
                              >
                                -
                              </button>
                            </div>
                          </td>

                          {/* Sheets */}
                          <td className="p-3 text-center font-mono-tabular">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleQuickTaskDelta(s.code, 'sheetsDone', 1)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-emerald-600 text-white"
                              >
                                +
                              </button>
                              <span className="font-bold text-emerald-400">
                                {s.tasks.sheetsDone}/{s.tasks.totalSheets}
                              </span>
                              <button
                                onClick={() => handleQuickTaskDelta(s.code, 'sheetsDone', -1)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-400"
                              >
                                -
                              </button>
                            </div>
                          </td>

                          {/* Quizzes */}
                          <td className="p-3 text-center font-mono-tabular">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleQuickTaskDelta(s.code, 'quizzesDone', 1)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-violet-600 text-white"
                              >
                                +
                              </button>
                              <span className="font-bold text-violet-400">
                                {s.tasks.quizzesDone}/{s.tasks.totalQuizzes}
                              </span>
                              <button
                                onClick={() => handleQuickTaskDelta(s.code, 'quizzesDone', -1)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-400"
                              >
                                -
                              </button>
                            </div>
                          </td>

                          {/* Assignments */}
                          <td className="p-3 text-center font-mono-tabular">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleQuickTaskDelta(s.code, 'assignDone', 1)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-amber-600 text-white"
                              >
                                +
                              </button>
                              <span className="font-bold text-amber-400">
                                {s.tasks.assignDone}/{s.tasks.totalAssign}
                              </span>
                              <button
                                onClick={() => handleQuickTaskDelta(s.code, 'assignDone', -1)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-400"
                              >
                                -
                              </button>
                            </div>
                          </td>

                          <td className="p-3 text-center font-mono-tabular font-bold text-indigo-300">
                            {prog.progressPct.toFixed(1)}%
                          </td>

                          <td className="p-3 text-center font-mono-tabular">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleQuickTaskDelta(s.code, 'overdueCount', 1)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 hover:text-white"
                              >
                                +
                              </button>
                              <span className="font-bold text-amber-400 w-5">{s.tasks.overdueCount}</span>
                              <button
                                onClick={() => handleQuickTaskDelta(s.code, 'overdueCount', -1)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 hover:text-white"
                              >
                                -
                              </button>
                            </div>
                          </td>

                          <td className="p-3">
                            <input
                              type="text"
                              value={s.nextMilestone}
                              onChange={(e) => handleUpdateSubject({ ...s, nextMilestone: e.target.value })}
                              className="glass-input px-2.5 py-1 rounded-lg text-xs w-full text-slate-200"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== VIEW: OFFICIAL GRADES & GPA BREAKDOWN ==================== */}
          {activeView === 'grades' && (
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h1 className="text-xl font-bold text-white">
                    جدول الدرجات الفعلية والمعدل التراكمي (Official Course Grades & Semester GPA)
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    رصد الدرجات المحرزة من 100 لكل مقرر. اضغط على أي مقرر لفتح جدول تقسيم الـ 100 درجة التفصيلي الخاص به.
                  </p>
                </div>
                <div className="flex items-center gap-4 font-mono-tabular text-sm">
                  <div>
                    <span className="text-slate-400 text-xs">CGPA الحالي: </span>
                    <strong className="text-white text-lg">{currentGPA.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Target GPA: </span>
                    <strong className="text-indigo-400 text-lg">{data.targetGPA.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-white/[0.02] text-slate-400 border-b border-white/[0.08]">
                      <th className="p-3 font-semibold">الكود والمقرر</th>
                      <th className="p-3 text-center font-semibold">الساعات (Credits)</th>
                      <th className="p-3 text-center font-semibold">العظمى (Max)</th>
                      <th className="p-3 text-center font-semibold">الدرجة المحرزة (Earned)</th>
                      <th className="p-3 text-center font-semibold">النسبة %</th>
                      <th className="p-3 text-center font-semibold">التقدير (Letter)</th>
                      <th className="p-3 text-center font-semibold">النقاط (4.00)</th>
                      <th className="p-3 text-center font-semibold">نقاط الجودة</th>
                      <th className="p-3 text-center font-semibold">المستهدف (Target)</th>
                      <th className="p-3 text-center font-semibold">تفاصيل الـ 100 درجة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {data.subjects.map((s) => {
                      const pct = s.maxMarks > 0 ? (s.earnedMarks / s.maxMarks) * 100 : 0;
                      const g = getEAEATGrade(pct);
                      const qPts = g.points * s.credits;
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3">
                            <button onClick={() => openSubjectPage(s.code)} className="text-right group">
                              <div className="font-mono-tabular font-bold text-indigo-400 group-hover:underline">
                                {s.code}
                              </div>
                              <div className="text-slate-300">{s.name}</div>
                            </button>
                          </td>
                          <td className="p-3 text-center font-mono-tabular font-bold text-slate-200">
                            {s.credits}
                          </td>
                          <td className="p-3 text-center font-mono-tabular text-slate-400">
                            {s.maxMarks}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={s.maxMarks}
                              step="0.5"
                              value={s.earnedMarks}
                              onChange={(e) => handleQuickEarnedMarks(s.code, Number(e.target.value))}
                              className="glass-input w-20 px-2 py-1.5 rounded-lg text-center font-mono-tabular font-bold text-white"
                            />
                          </td>
                          <td className="p-3 text-center font-mono-tabular font-bold text-indigo-300">
                            {pct.toFixed(1)}%
                          </td>
                          <td className="p-3 text-center font-mono-tabular font-bold text-emerald-400">
                            {g.letter}
                          </td>
                          <td className="p-3 text-center font-mono-tabular text-slate-200">
                            {g.points.toFixed(2)}
                          </td>
                          <td className="p-3 text-center font-mono-tabular font-bold text-violet-300">
                            {qPts.toFixed(2)}
                          </td>
                          <td className="p-3 text-center font-mono-tabular text-slate-300">
                            {s.targetMark}+
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => openSubjectPage(s.code)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold transition"
                            >
                              تقسيم الدرجات
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    <tr className="bg-indigo-950/30 border-t-2 border-indigo-500/30 font-bold text-white font-mono-tabular">
                      <td className="p-3.5">الإجمالي (Semester Aggregate & GPA)</td>
                      <td className="p-3.5 text-center text-indigo-300">{totalCredits}</td>
                      <td className="p-3.5 text-center text-slate-400">{totalMaxMarks}</td>
                      <td className="p-3.5 text-center text-emerald-400">{totalEarnedMarks}</td>
                      <td className="p-3.5 text-center text-indigo-300">{overallMarksPct.toFixed(1)}%</td>
                      <td className="p-3.5 text-center text-violet-300">IP</td>
                      <td className="p-3.5 text-center text-emerald-400">{currentGPA.toFixed(2)}</td>
                      <td className="p-3.5 text-center text-violet-300">{totalQualityPoints.toFixed(2)}</td>
                      <td className="p-3.5 text-center text-indigo-300" colSpan={2}>
                        Target GPA: {data.targetGPA.toFixed(2)} / 4.00
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== VIEW: EAEAT 4.00 GRADING SCALE & GUIDE ==================== */}
          {activeView === 'guide' && (
            <div className="glass-panel rounded-2xl p-6 space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">
                  لائحة التقديرات الرسمية — Official EAEAT 4.00 Academic Grading System
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  الأكاديمية المصرية للهندسة والتكنولوجيا المتقدمة (EAEAT) — جدول تحويل النسب المئوية إلى تقديرات حرفية ونقاط معدل تراكمي.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-white/[0.02] text-slate-400 border-b border-white/[0.08]">
                      <th className="p-3 font-semibold">مدى النسبة المئوية (Percentage Range)</th>
                      <th className="p-3 text-center font-semibold">التقدير (Letter Grade)</th>
                      <th className="p-3 text-center font-semibold">النقاط (Grade Points 4.00)</th>
                      <th className="p-3 font-semibold">التعريف الأكاديمي واللوائح (EAEAT Bylaw)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] text-slate-300">
                    {[
                      { range: '97% to 100%', letter: 'A+', pts: '4.00', desc: 'Distinction / Highest Honors — الحد الأقصى لنقاط الجودة.' },
                      { range: '93% to < 97%', letter: 'A', pts: '4.00', desc: 'Excellent / High Honors — امتياز كامل وإتقان شامل للمنهج.' },
                      { range: '89% to < 93%', letter: 'A-', pts: '3.70', desc: 'Excellent — مرتبة الشرف.' },
                      { range: '84% to < 89%', letter: 'B+', pts: '3.30', desc: 'Very Good — جيد جداً مرتفع.' },
                      { range: '80% to < 84%', letter: 'B', pts: '3.00', desc: 'Good / Standard Passing — مستوى أكاديمي قوي.' },
                      { range: '76% to < 80%', letter: 'B-', pts: '2.70', desc: 'Satisfactory Plus — يؤهل لتسجيل العبء الكامل (حتى 18 ساعة).' },
                      { range: '73% to < 76%', letter: 'C+', pts: '2.30', desc: 'Satisfactory — فوق حد التخرج الآمن (2.00).' },
                      { range: '70% to < 73%', letter: 'C', pts: '2.00', desc: 'Average Passing — الحد الأدنى للمعدل التراكمي للتخرج بدون إنذار أكاديمي.' },
                      { range: '67% to < 70%', letter: 'C-', pts: '1.70', desc: 'Below Average Passing — المعدل الفصلي أقل من 2.00 يقيد العبء بـ 14 ساعة.' },
                      { range: '64% to < 67%', letter: 'D+', pts: '1.30', desc: 'Conditional Pass — نجاح مشروط.' },
                      { range: '60% to < 64%', letter: 'D', pts: '1.00', desc: 'Minimum Pass — أقل درجة نجاح في اللائحة (60/100).' },
                      { range: '< 60%', letter: 'F', pts: '0.00', desc: 'Fail / Repeat Course — رسوب وإعادة تسجيل المقرر.' },
                    ].map((row) => (
                      <tr key={row.letter} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-mono-tabular font-semibold text-white">{row.range}</td>
                        <td className="p-3 text-center font-mono-tabular font-bold text-indigo-400">{row.letter}</td>
                        <td className="p-3 text-center font-mono-tabular font-bold text-emerald-400">{row.pts}</td>
                        <td className="p-3">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== MODALS ==================== */}
      {subjectModalTarget !== undefined && (
        <SubjectEditorModal
          subject={subjectModalTarget}
          onClose={() => setSubjectModalTarget(undefined)}
          onSave={handleSaveSubjectFromModal}
          onDelete={handleDeleteSubject}
        />
      )}

      {priorityModalTarget !== undefined && (
        <PriorityEditorModal
          item={priorityModalTarget}
          subjects={data.subjects}
          nextRank={data.priorityMatrix.length + 1}
          onClose={() => setPriorityModalTarget(undefined)}
          onSave={handleSavePriorityItem}
          onDelete={handleDeletePriorityItem}
        />
      )}

      {sheetModalOpen && (
        <GoogleSheetSyncModal
          config={
            data.sheetSyncConfig || {
              scriptUrl: '',
              publishedCsvUrl: '',
              autoSync: true,
            }
          }
          onClose={() => setSheetModalOpen(false)}
          onSaveConfig={handleSaveSheetConfig}
          onPushToSheet={handlePushToSheet}
          onPullFromSheet={handlePullFromSheet}
          onImportFromCsvUrl={handleImportFromCsvUrl}
          onExportCsvFile={handleExportCsvFile}
          onExportJsonFile={handleExportJsonFile}
          onImportFile={handleImportFile}
          syncBusy={syncBusy}
          syncMessage={syncMessage}
        />
      )}
    </div>
  );
}
