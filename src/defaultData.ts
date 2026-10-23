import { AppData, WeekEntry, AssessmentItem, AttendanceSummary, TasksSummary } from './types';

function buildWeeksFromSummary(
  code: string,
  att: AttendanceSummary,
  tasks: TasksSummary,
  hasLab: boolean,
  hasSec: boolean,
  topics: string[]
): WeekEntry[] {
  const weeks: WeekEntry[] = [];
  let lecDoneRem = att.lecDone;
  let lecMissRem = att.lecMissed;
  let secDoneRem = att.secDone;
  let secMissRem = att.secMissed;
  let labDoneRem = att.labDone;
  let labMissRem = att.labMissed;

  let studyRem = tasks.lecStudy;
  let sheetsRem = tasks.sheetsDone;
  let quizRem = tasks.quizzesDone;
  let assignRem = tasks.assignDone;

  for (let w = 1; w <= 16; w++) {
    let lecStatus: 'none' | 'done' | 'missed' = 'none';
    if (lecDoneRem > 0) {
      lecStatus = 'done';
      lecDoneRem--;
    } else if (lecMissRem > 0) {
      lecStatus = 'missed';
      lecMissRem--;
    }

    let secStatus: 'none' | 'done' | 'missed' = 'none';
    if (hasSec) {
      if (secDoneRem > 0) {
        secStatus = 'done';
        secDoneRem--;
      } else if (secMissRem > 0) {
        secStatus = 'missed';
        secMissRem--;
      }
    }

    let labStatus: 'none' | 'done' | 'missed' = 'none';
    if (hasLab) {
      if (labDoneRem > 0) {
        labStatus = 'done';
        labDoneRem--;
      } else if (labMissRem > 0) {
        labStatus = 'missed';
        labMissRem--;
      }
    }

    const lecStudy = studyRem > 0;
    if (studyRem > 0) studyRem--;

    const sheetDone = sheetsRem > 0;
    if (sheetsRem > 0) sheetsRem--;

    const quizDone = quizRem > 0;
    if (quizRem > 0) quizRem--;

    const assignDone = assignRem > 0;
    if (assignRem > 0) assignRem--;

    weeks.push({
      weekNumber: w,
      topic: topics[w - 1] || `${code} — Week ${String(w).padStart(2, '0')} Syllabus Topic`,
      lecStatus,
      secStatus,
      labStatus,
      lecStudy,
      sheetDone,
      refRead: w <= tasks.lecStudy,
      quizScheduled: w === 4 || w === 6 || w === 10 || w === 12,
      quizDone,
      assignScheduled: w <= tasks.totalAssign,
      assignDone,
      note: w === 8 ? 'Midterm Examinations Week' : w === 16 ? 'Final Examinations Prep' : '',
    });
  }
  return weeks;
}

function buildAssessments(code: string, earnedTotal: number, labWeight: number = 10): AssessmentItem[] {
  if (code === 'ECO335') {
    return [
      { id: `${code}-q1`, title: 'Quizzes (In-Class & Online)', arabicTitle: 'الكويزات الدورية', category: 'Quiz', maxMarks: 10, earnedMarks: 6, status: 'In Progress', dueDate: '2026-10-19' },
      { id: `${code}-as`, title: 'Assignments & Proteus Tasks', arabicTitle: 'تاسكات وأساينمنتات PIC', category: 'Assignment', maxMarks: 10, earnedMarks: 0, status: 'In Progress', dueDate: '2026-10-19' },
      { id: `${code}-lb`, title: 'Practical Lab & Hardware Project', arabicTitle: 'المعمل العملي والمشروع', category: 'Lab', maxMarks: 20, earnedMarks: 0, status: 'Pending' },
      { id: `${code}-mt`, title: 'Midterm Written Exam', arabicTitle: 'امتحان الميدتيرم', category: 'Midterm', maxMarks: 20, earnedMarks: 0, status: 'Pending', dueDate: '2026-11-14' },
      { id: `${code}-fn`, title: 'Final Comprehensive Exam', arabicTitle: 'الامتحان النهائي (الفاينل)', category: 'Final', maxMarks: 40, earnedMarks: 0, status: 'Pending' },
    ];
  }
  if (code === 'MEC341') {
    return [
      { id: `${code}-q1`, title: 'Quizzes (Velocity & Acceleration)', arabicTitle: 'كويزات مضلعات السرعة والعجلة', category: 'Quiz', maxMarks: 15, earnedMarks: 11, status: 'In Progress', dueDate: '2026-10-21' },
      { id: `${code}-as`, title: 'Drawing Sheets & Assignments', arabicTitle: 'شيتات الرسم والتكليفات', category: 'Assignment', maxMarks: 15, earnedMarks: 10, status: 'In Progress' },
      { id: `${code}-mt`, title: 'Midterm Written Exam', arabicTitle: 'امتحان الميدتيرم', category: 'Midterm', maxMarks: 20, earnedMarks: 0, status: 'Pending', dueDate: '2026-11-15' },
      { id: `${code}-fn`, title: 'Final Written Exam', arabicTitle: 'الامتحان النهائي (الفاينل)', category: 'Final', maxMarks: 50, earnedMarks: 0, status: 'Pending' },
    ];
  }
  return [
    { id: `${code}-q1`, title: 'Scheduled Course Quizzes', arabicTitle: 'الكويزات الفصلية', category: 'Quiz', maxMarks: 15, earnedMarks: earnedTotal, status: earnedTotal > 0 ? 'In Progress' : 'Pending' },
    { id: `${code}-as`, title: 'Sheets & Coursework Deliverables', arabicTitle: 'الشيتات والتكليفات الدراسية', category: 'Assignment', maxMarks: 15, earnedMarks: 0, status: 'In Progress' },
    { id: `${code}-lb`, title: 'Practical Lab / Section Evaluation', arabicTitle: 'تقييم المعمل والسكشن', category: 'Lab', maxMarks: labWeight, earnedMarks: 0, status: 'Pending' },
    { id: `${code}-mt`, title: 'Midterm Examination', arabicTitle: 'امتحان منتصف الفصل (Midterm)', category: 'Midterm', maxMarks: 20, earnedMarks: 0, status: 'Pending' },
    { id: `${code}-fn`, title: 'Final Examination', arabicTitle: 'الامتحان النهائي (Final)', category: 'Final', maxMarks: 50 - labWeight, earnedMarks: 0, status: 'Pending' },
  ];
}

export const DEFAULT_APP_DATA: AppData = {
  academicWeek: 5,
  semesterName: 'ACADEMIC SEMESTER STUDY PLANNER 2026/2027',
  creator: 'Philopatir Sameh (@felosameh97)',
  institution: 'EAEAT • Egyptian Academy for Engineering & Advanced Technology',
  targetGPA: 3.80,
  semesterGoal: 'تحقيق مرتبة الشرف (A / A-) والوصول لنسبة حضور ≥ 85% مع إنهاء جميع الشيتات المتأخرة قبل الميدتيرم',
  targetAttendanceRate: 85,
  sheetSyncConfig: {
    scriptUrl: '',
    publishedCsvUrl: '',
    autoSync: true,
    lastSyncedAt: '',
  },
  subjects: [
    {
      id: 'sub-mec333',
      code: 'MEC333',
      name: 'MEC333 Control',
      arabicName: 'هندسة التحكم الآلي (Automatic Control)',
      credits: 3,
      maxMarks: 100,
      earnedMarks: 0,
      targetMark: 85,
      passingMark: 60,
      hasLab: true,
      hasSection: true,
      instructor: 'قسم الميكاترونكس • EAEAT',
      scheduleInfo: 'الأحد والثلاثاء • محاضرة + سكشن + معمل Matlab/Simulink',
      nextMilestone: 'Midterm Prep & W06 Sheet',
      status: 'In Progress',
      notes: 'التركيز على: Laplace Transform, Transfer Functions, Block Diagram Reduction, 1st & 2nd Order Transient Response, Simulink Modeling.',
      attendance: { lecDone: 3, lecMissed: 1, secDone: 4, secMissed: 1, labDone: 2, labMissed: 3 },
      tasks: { lecStudy: 1, sheetsDone: 1, totalSheets: 16, quizzesDone: 0, totalQuizzes: 1, assignDone: 0, totalAssign: 16, overdueCount: 4 },
      weeklyLog: buildWeeksFromSummary(
        'MEC333',
        { lecDone: 3, lecMissed: 1, secDone: 4, secMissed: 1, labDone: 2, labMissed: 3 },
        { lecStudy: 1, sheetsDone: 1, totalSheets: 16, quizzesDone: 0, totalQuizzes: 1, assignDone: 0, totalAssign: 16, overdueCount: 4 },
        true,
        true,
        [
          'Intro to Control Systems & Open/Closed Loop',
          'Laplace Transform & Differential Equations',
          'Transfer Functions & Mechanical Modeling',
          'Electrical & Electromechanical Systems Modeling',
          'Block Diagrams & Signal Flow Graphs (Mason Rule)',
          'Time Domain Analysis & 1st Order Systems',
          '2nd Order Systems & Transient Specifications',
          'Midterm Exam & Simulink Practical Review',
          'Routh-Hurwitz Stability Criterion',
          'Steady-State Error Analysis & System Types',
          'Root Locus Technique — Rules & Construction',
          'Controller Design via Root Locus (PID)',
          'Frequency Response Analysis — Bode Plots',
          'Nyquist Stability Criterion & Gain/Phase Margin',
          'State-Space Representation & Controllability',
          'Comprehensive Final Revision & Solved Exams',
        ]
      ),
      assessments: buildAssessments('MEC333', 0, 10),
    },
    {
      id: 'sub-eco335',
      code: 'ECO335',
      name: 'ECO335 Microcontrollers',
      arabicName: 'الميكروكنترولر والأنظمة المدمجة (PIC/AVR)',
      credits: 3,
      maxMarks: 100,
      earnedMarks: 6,
      targetMark: 85,
      passingMark: 60,
      hasLab: true,
      hasSection: true,
      instructor: 'قسم الإلكترونيات والاتصالات • EAEAT',
      scheduleInfo: 'الإثنين والأربعاء • محاضرة + سكشن + معمل Embedded C',
      nextMilestone: 'Push Button & Timer0 Delay',
      status: 'In Progress',
      notes: 'مراجعة معمارية PIC16F877A، سجلات TRIS/PORT، التعامل مع 7-Segment، الـ Push Buttons، وحسابات Timer0 Prescaler.',
      attendance: { lecDone: 4, lecMissed: 0, secDone: 4, secMissed: 1, labDone: 3, labMissed: 2 },
      tasks: { lecStudy: 0, sheetsDone: 0, totalSheets: 12, quizzesDone: 1, totalQuizzes: 1, assignDone: 0, totalAssign: 12, overdueCount: 4 },
      weeklyLog: buildWeeksFromSummary(
        'ECO335',
        { lecDone: 4, lecMissed: 0, secDone: 4, secMissed: 1, labDone: 3, labMissed: 2 },
        { lecStudy: 0, sheetsDone: 0, totalSheets: 12, quizzesDone: 1, totalQuizzes: 1, assignDone: 0, totalAssign: 12, overdueCount: 4 },
        true,
        true,
        [
          'Microprocessor vs Microcontroller Architecture',
          'PIC 14-Bit Core Memory Organization & Registers',
          'GPIO Ports (TRIS & PORT) & LED Interfacing',
          '7-Segment Displays & Multiplexing in Assembly/C',
          'Push Buttons, Debouncing & Keypad Matrix',
          'Timer0 Module & Hardware Delay Calculations',
          'Interrupts Architecture (INTCON, External & Timer)',
          'Midterm Examination & Proteus Simulation Test',
          'LCD 16x2 Character Display Interfacing',
          'Analog-to-Digital Converter (ADC) Module',
          'CCP Module: Capture, Compare & PWM Generation',
          'DC Motor & Servo Control via PWM & H-Bridge',
          'UART Serial Communication Protocol',
          'SPI & I2C Synchronous Serial Buses',
          'Embedded Project Integration & PCB Testing',
          'Final Practical & Written Exam Preparation',
        ]
      ),
      assessments: buildAssessments('ECO335', 6, 20),
    },
    {
      id: 'sub-bas361',
      code: 'BAS361',
      name: 'BAS361 Economy',
      arabicName: 'الاقتصاد الهندسي وإدارة المشروعات',
      credits: 2,
      maxMarks: 100,
      earnedMarks: 0,
      targetMark: 90,
      passingMark: 60,
      hasLab: false,
      hasSection: false,
      instructor: 'قسم العلوم الأساسية • EAEAT',
      scheduleInfo: 'الخميس • محاضرة نظرية (تحذير غياب: 4 محاضرات فائتة)',
      nextMilestone: 'Quiz 1 Prep (Lec 1-2)',
      status: 'In Progress',
      notes: 'تنبيه هام: يجب حضور جميع المحاضرات القادمة لتفادي الحرمان. التركيز على قوانين الفائدة البسيطة والمركبة و Time Value of Money.',
      attendance: { lecDone: 0, lecMissed: 4, secDone: 0, secMissed: 0, labDone: 0, labMissed: 0 },
      tasks: { lecStudy: 0, sheetsDone: 0, totalSheets: 15, quizzesDone: 1, totalQuizzes: 1, assignDone: 0, totalAssign: 15, overdueCount: 4 },
      weeklyLog: buildWeeksFromSummary(
        'BAS361',
        { lecDone: 0, lecMissed: 4, secDone: 0, secMissed: 0, labDone: 0, labMissed: 0 },
        { lecStudy: 0, sheetsDone: 0, totalSheets: 15, quizzesDone: 1, totalQuizzes: 1, assignDone: 0, totalAssign: 15, overdueCount: 4 },
        false,
        false,
        [
          'Foundations of Engineering Economy & Cash Flows',
          'Simple & Compound Interest Formulas',
          'Time Value of Money & Equivalence (Ch. 3)',
          'Uniform Series Present Worth & Capital Recovery',
          'Arithmetic & Geometric Gradient Cash Flows',
          'Nominal vs Effective Interest Rates',
          'Present Worth (PW) & Annual Worth (AW) Analysis',
          'Midterm Examination',
          'Internal Rate of Return (IRR) Evaluation',
          'Benefit/Cost Ratio & Public Sector Projects',
          'Breakeven & Payback Period Analysis',
          'Depreciation Methods (Straight-Line, MACRS)',
          'Replacement & Retention Decisions',
          'Inflation & Price Change in Engineering',
          'After-Tax Economic Analysis',
          'Final Exam Comprehensive Review',
        ]
      ),
      assessments: buildAssessments('BAS361', 0, 0),
    },
    {
      id: 'sub-mec381',
      code: 'MEC381',
      name: 'MEC381 Materials',
      arabicName: 'هندسة المواد المتقدمة والمركبات (Composites)',
      credits: 3,
      maxMarks: 100,
      earnedMarks: 0,
      targetMark: 85,
      passingMark: 60,
      hasLab: false,
      hasSection: true,
      instructor: 'قسم الهندسة الميكانيكية • EAEAT',
      scheduleInfo: 'الثلاثاء • محاضرة + سكشن (تنبيه: نسبة الحضور 12.5%)',
      nextMilestone: 'Quiz 1 Prep (Composites)',
      status: 'In Progress',
      notes: 'مراجعة أول 4 محاضرات لكويز 1: تصنيف المواد المركبة (PMC, MMC, CMC)، قانون المخاليط (Rule of Mixtures) في الاتجاه الطولي والعرضي.',
      attendance: { lecDone: 0, lecMissed: 4, secDone: 1, secMissed: 3, labDone: 0, labMissed: 0 },
      tasks: { lecStudy: 0, sheetsDone: 0, totalSheets: 15, quizzesDone: 1, totalQuizzes: 1, assignDone: 0, totalAssign: 15, overdueCount: 4 },
      weeklyLog: buildWeeksFromSummary(
        'MEC381',
        { lecDone: 0, lecMissed: 4, secDone: 1, secMissed: 3, labDone: 0, labMissed: 0 },
        { lecStudy: 0, sheetsDone: 0, totalSheets: 15, quizzesDone: 1, totalQuizzes: 1, assignDone: 0, totalAssign: 15, overdueCount: 4 },
        false,
        true,
        [
          'Introduction to Advanced Engineering Materials',
          'Classification of Composite Materials (PMC, MMC, CMC)',
          'Fibers, Matrices & Interface Mechanics',
          'Rule of Mixtures — Longitudinal & Transverse Loading',
          'Short Fiber Composites & Critical Fiber Length',
          'Polymer Matrix Composites Manufacturing Processes',
          'Metal & Ceramic Matrix Composites Properties',
          'Midterm Examination',
          'Laminate Theory & Stacking Sequences',
          'Failure Criteria of Composite Laminates',
          'Smart Materials: Piezoelectrics & Shape Memory Alloys',
          'Nanomaterials & Carbon Nanotube Reinforcements',
          'Corrosion, Degradation & Environmental Effects',
          'Non-Destructive Testing (NDT) of Composites',
          'Material Selection Case Studies (Ashby Charts)',
          'Final Examination Revision',
        ]
      ),
      assessments: buildAssessments('MEC381', 0, 10),
    },
    {
      id: 'sub-eco362',
      code: 'ECO362',
      name: 'ECO362 Electronics',
      arabicName: 'الدوائر الإلكترونية التناظرية والمتقدمة',
      credits: 3,
      maxMarks: 100,
      earnedMarks: 0,
      targetMark: 85,
      passingMark: 60,
      hasLab: true,
      hasSection: true,
      instructor: 'قسم الإلكترونيات • EAEAT',
      scheduleInfo: 'الأحد والأربعاء • محاضرة منتظمة + سكشن + معمل دوائر',
      nextMilestone: 'Quiz AC Analysis & Assign 3',
      status: 'In Progress',
      notes: 'الأولوية القصوى: تسليم Assignment 3 ومراجعة MOSFET DC Biasing & Small-Signal AC Model (gm, ro) استعداداً للكويز.',
      attendance: { lecDone: 6, lecMissed: 0, secDone: 2, secMissed: 3, labDone: 1, labMissed: 3 },
      tasks: { lecStudy: 0, sheetsDone: 0, totalSheets: 16, quizzesDone: 2, totalQuizzes: 2, assignDone: 2, totalAssign: 16, overdueCount: 4 },
      weeklyLog: buildWeeksFromSummary(
        'ECO362',
        { lecDone: 6, lecMissed: 0, secDone: 2, secMissed: 3, labDone: 1, labMissed: 3 },
        { lecStudy: 0, sheetsDone: 0, totalSheets: 16, quizzesDone: 2, totalQuizzes: 2, assignDone: 2, totalAssign: 16, overdueCount: 4 },
        true,
        true,
        [
          'MOSFET Physics, Operation & I-V Characteristics',
          'MOSFET DC Biasing Circuits & Load Lines',
          'Small-Signal Modeling & Transconductance (gm)',
          'Single-Stage MOS Amplifiers (CS, CG, CD)',
          'BJT & MOSFET Frequency Response (Low & High Freq)',
          'Multistage Amplifiers & Cascode Configurations',
          'Differential Amplifiers & Current Mirrors',
          'Midterm Examination',
          'Operational Amplifiers Ideal & Non-Ideal Models',
          'Negative Feedback Topologies & Stability',
          'Active Filters Design (Butterworth & Chebyshev)',
          'Oscillators (Wien Bridge, Phase-Shift, Crystal)',
          'Power Amplifiers (Class A, B, AB, C)',
          'Voltage Regulators & Switching Power Supplies',
          'Mixed-Signal Converters (DAC & ADC Circuits)',
          'Final Comprehensive Review',
        ]
      ),
      assessments: buildAssessments('ECO362', 0, 15),
    },
    {
      id: 'sub-mec341',
      code: 'MEC341',
      name: 'MEC341 Kinematics',
      arabicName: 'كينيماتيكا وديناميكا الآلات (Kinematics of Machines)',
      credits: 3,
      maxMarks: 100,
      earnedMarks: 21,
      targetMark: 85,
      passingMark: 60,
      hasLab: false,
      hasSection: true,
      instructor: 'قسم التصميم الميكانيكي • EAEAT',
      scheduleInfo: 'الإثنين والثلاثاء • محاضرة + سكشن رسم وتحليل حركي',
      nextMilestone: 'Quiz Sheet 1 & 2 Prep',
      status: 'In Progress',
      notes: 'أداء ممتاز حتى الآن (21 درجة مرصودة). التركيز القادم: حل شيت 1 و 2 بالكامل وإتقان مضلعات السرعة والعجلة (Velocity & Acceleration Polygons).',
      attendance: { lecDone: 2, lecMissed: 2, secDone: 3, secMissed: 2, labDone: 0, labMissed: 0 },
      tasks: { lecStudy: 3, sheetsDone: 3, totalSheets: 16, quizzesDone: 2, totalQuizzes: 2, assignDone: 2, totalAssign: 16, overdueCount: 1 },
      weeklyLog: buildWeeksFromSummary(
        'MEC341',
        { lecDone: 2, lecMissed: 2, secDone: 3, secMissed: 2, labDone: 0, labMissed: 0 },
        { lecStudy: 3, sheetsDone: 3, totalSheets: 16, quizzesDone: 2, totalQuizzes: 2, assignDone: 2, totalAssign: 16, overdueCount: 1 },
        false,
        true,
        [
          'Kinematics Fundamentals, Links, Pairs & Mobility (Gruebler)',
          'Kinematic Inversions of Four-Bar & Slider-Crank Chains',
          'Analytical Position Analysis of Planar Mechanisms',
          'Graphical Velocity Analysis — Relative Velocity Polygons',
          'Instantaneous Centers of Velocity & Kennedy Theorem',
          'Graphical Acceleration Analysis — Normal & Tangential',
          'Coriolis Acceleration Component in Sliding Links',
          'Midterm Examination',
          'Analytical Velocity & Acceleration using Complex Numbers',
          'Cam & Follower Systems — Displacement Diagrams',
          'Cam Profile Synthesis (Knife-Edge, Roller, Flat-Faced)',
          'Spur Gears Geometry & Law of Gearing',
          'Gear Trains: Simple, Compound & Reverted',
          'Planetary (Epicyclic) Gear Trains Tabular Analysis',
          'Synthesis of Linkages for Function & Path Generation',
          'Final Examination Comprehensive Review',
        ]
      ),
      assessments: buildAssessments('MEC341', 21, 0),
    },
  ],
  priorityMatrix: [
    {
      id: 'prio-1',
      rank: 1,
      code: 'ECO362',
      name: 'ECO362 Electronics',
      priority: 'قصوى (Critical)',
      urgencyLevel: 'critical',
      daysLeft: 'متأخر (-1d)',
      dueDate: '2026-10-18',
      task: 'أساينمنت 3 + كويز AC',
      marks: '4.7 درجات',
      attendanceRate: '60.0%',
      urgencyReason: 'أساينمنت متأخر + كويز غداً',
      targetContent: 'MOSFET Biasing & Small-Signal',
      action: 'تسليم أساينمنت 3 فوراً + مراجعة AC',
      denialRisk: 'Eligible / لائق',
      recommendation: 'أولوية قصوى الليلة (ساعتان)',
      completed: false,
    },
    {
      id: 'prio-2',
      rank: 2,
      code: 'ECO335',
      name: 'ECO335 Microcontrollers',
      priority: 'عاجل اليوم (Urgent Today)',
      urgencyLevel: 'urgent',
      daysLeft: '0 يوم (اليوم)',
      dueDate: '2026-10-19',
      task: 'تاسك كاونتر 7-Segment',
      marks: '2.5 درجات',
      attendanceRate: '78.6%',
      urgencyReason: 'موعد تسليم التاسك اليوم',
      targetContent: 'GPIO & 14-Bit Core Assembly/C',
      action: 'إنهاء وتجربة كود PIC والتسليم',
      denialRisk: 'Eligible / لائق',
      recommendation: 'إنهاء وتسليم اليوم (ساعة)',
      completed: false,
    },
    {
      id: 'prio-3',
      rank: 3,
      code: 'MEC381',
      name: 'MEC381 Materials',
      priority: 'غداً + حرمان (Tomorrow + Risk)',
      urgencyLevel: 'high',
      daysLeft: '1 يوم (غداً)',
      dueDate: '2026-10-20',
      task: 'كويز 1 (أول 4 محاضرات)',
      marks: '6.25 درجات',
      attendanceRate: '12.5%',
      urgencyReason: 'كويز غداً + حضور 12.5% فقط',
      targetContent: 'Matrix & Reinforcement (PMC)',
      action: 'مذاكرة المصفوفات وقانون المخاليط',
      denialRisk: 'At Denial Risk',
      recommendation: 'مذاكرة كويز غداً (ساعتان)',
      completed: false,
    },
    {
      id: 'prio-4',
      rank: 4,
      code: 'MEC341',
      name: 'MEC341 Kinematics',
      priority: 'الأربعاء + حرمان (Wed + Risk)',
      urgencyLevel: 'high',
      daysLeft: '2 يوم',
      dueDate: '2026-10-21',
      task: 'كويز شيت 1 و 2',
      marks: '5 درجات',
      attendanceRate: '55.6%',
      urgencyReason: 'كويز بعد يومين + غياب مرتفع',
      targetContent: 'Analytical Kinematics Polygons',
      action: 'حل شيت 1 و 2 ومضلعات السرعة',
      denialRisk: 'Eligible / لائق',
      recommendation: 'حل شيتات (ساعة ونصف)',
      completed: false,
    },
    {
      id: 'prio-5',
      rank: 5,
      code: 'BAS361',
      name: 'BAS361 Economy',
      priority: 'الخميس (10 درجات)',
      urgencyLevel: 'medium',
      daysLeft: '3 أيام',
      dueDate: '2026-10-22',
      task: 'كويز 1 (محاضرة 1 و 2)',
      marks: '10 درجات',
      attendanceRate: '0.0%',
      urgencyReason: 'كويز بـ 10 درجات + غياب كامل (0%)',
      targetContent: 'Time Value of Money (Ch. 3)',
      action: 'مذاكرة القيمة الزمنية للنقود والفائدة',
      denialRisk: 'At Denial Risk',
      recommendation: 'تجهيز ملخص القوانين (ساعة)',
      completed: false,
    },
    {
      id: 'prio-6',
      rank: 6,
      code: 'MEC333',
      name: 'MEC333 Control',
      priority: 'متابعة دورية (Routine)',
      urgencyLevel: 'routine',
      daysLeft: '6 أيام',
      dueDate: '2026-10-25',
      task: 'شيت W06 + مراجعة ميدتيرم',
      marks: 'ميدتيرم (20 درجة)',
      attendanceRate: '64.3%',
      urgencyReason: 'الاستعداد للميدتيرم وشيت الأسبوع 6',
      targetContent: '2nd Order Systems & Simulink',
      action: 'متابعة حل الشيت والـ Transfer Func',
      denialRisk: 'Eligible / لائق',
      recommendation: 'جدول نهاية الأسبوع',
      completed: false,
    },
  ],
};
