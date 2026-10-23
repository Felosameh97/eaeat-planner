import { AppData, Subject } from '../types';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// ============================================================================
// EAEAT Academic Study Planner 2026/2027 — Two-Way Cloud Sync Script (Vercel Ready)
// خطوات التفعيل داخل شيت جوجل:
// 1. افتح الشيت الخاص بك -> من القائمة العلوية اختر Extensions ثم Apps Script
// 2. امسح أي كود موجود والصق هذا الكود بالكامل ثم اضغط Save (أيقونة الحفظ)
// 3. اضغط Deploy (في الأعلى) -> New deployment
// 4. اختر النوع: Web app
// 5. في خانة Execute as اختر: Me
// 6. في خانة Who has access اختر: Anyone (مهم جداً ليعمل على الموبايل وفيرسل)
// 7. اضغط Deploy وانسخ رابط الـ Web app URL وضعه في إعدادات المزامنة داخل التطبيق!
// ============================================================================

const DB_SHEET_NAME = "_AppDatabase";
const SUMMARY_SHEET_NAME = "App_Live_Summary";

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dbSheet = ss.getSheetByName(DB_SHEET_NAME);
    if (!dbSheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "empty", data: null }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const rawJson = dbSheet.getRange("A1").getValue();
    if (!rawJson) {
      return ContentService.createTextOutput(JSON.stringify({ status: "empty", data: null }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      updatedAt: dbSheet.getRange("B1").getValue(),
      data: JSON.parse(rawJson)
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Save full state in _AppDatabase tab
    let dbSheet = ss.getSheetByName(DB_SHEET_NAME);
    if (!dbSheet) {
      dbSheet = ss.insertSheet(DB_SHEET_NAME);
    }
    const nowStr = new Date().toISOString();
    dbSheet.getRange("A1").setValue(JSON.stringify(payload));
    dbSheet.getRange("B1").setValue(nowStr);
    
    // 2. Also update human-readable App_Live_Summary tab in the Google Sheet
    let sumSheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
    if (!sumSheet) {
      sumSheet = ss.insertSheet(SUMMARY_SHEET_NAME);
    }
    sumSheet.clearContents();
    sumSheet.appendRow(["EAEAT ACADEMIC PLANNER LIVE SYNC", "Last Synced:", nowStr, "Target GPA:", payload.targetGPA || 3.8]);
    sumSheet.appendRow(["Semester Goal:", payload.semesterGoal || ""]);
    sumSheet.appendRow([]);
    sumSheet.appendRow(["Code", "Subject Name", "Credits", "Lec Done", "Lec Missed", "Sec Done", "Sec Missed", "Lab Done", "Lab Missed", "Sheets Done", "Total Sheets", "Quizzes Done", "Assign Done", "Earned Marks", "Max Marks", "Target Mark", "Next Milestone"]);
    
    if (payload.subjects && Array.isArray(payload.subjects)) {
      payload.subjects.forEach(function(s) {
        sumSheet.appendRow([
          s.code,
          s.name,
          s.credits,
          s.attendance.lecDone,
          s.attendance.lecMissed,
          s.attendance.secDone,
          s.attendance.secMissed,
          s.attendance.labDone,
          s.attendance.labMissed,
          s.tasks.sheetsDone,
          s.tasks.totalSheets,
          s.tasks.quizzesDone,
          s.tasks.assignDone,
          s.earnedMarks,
          s.maxMarks,
          s.targetMark,
          s.nextMilestone
        ]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok", updatedAt: nowStr }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export async function pushToGoogleSheetScript(scriptUrl: string, data: AppData): Promise<{ ok: boolean; updatedAt?: string; error?: string }> {
  try {
    const cleanUrl = scriptUrl.trim();
    if (!cleanUrl) return { ok: false, error: 'Empty Script URL' };

    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        // Using text/plain prevents CORS preflight failure on Google Apps Script Web Apps
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json();
    if (result.status === 'ok') {
      return { ok: true, updatedAt: result.updatedAt || new Date().toLocaleTimeString() };
    }
    return { ok: false, error: result.message || 'Unknown script error' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network or CORS error' };
  }
}

export async function pullFromGoogleSheetScript(scriptUrl: string): Promise<{ ok: boolean; data?: AppData; error?: string }> {
  try {
    const cleanUrl = scriptUrl.trim();
    if (!cleanUrl) return { ok: false, error: 'Empty Script URL' };

    const response = await fetch(cleanUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json();
    if (result.status === 'ok' && result.data && Array.isArray(result.data.subjects)) {
      return { ok: true, data: result.data as AppData };
    }
    if (result.status === 'empty') {
      return { ok: false, error: 'الشيت متصل ولكنه فارغ حالياً — اضغط "رفع البيانات للشيت (Push)" أولاً لتهيئة قاعدة البيانات.' };
    }
    return { ok: false, error: result.message || 'No valid data found in sheet' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to fetch from Google Sheet Script' };
  }
}

export function normalizeGoogleSheetCsvUrl(inputUrl: string): string {
  const url = inputUrl.trim();
  // If it's already a pub?output=csv or export?format=csv link, keep it
  if (url.includes('output=csv') || url.includes('format=csv')) {
    return url;
  }
  // If user pasted a normal Google Sheet sharing link: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
  }
  return url;
}

function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const nextCh = csvText[i + 1];

    if (ch === '"') {
      if (inQuotes && nextCh === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && nextCh === '\n') i++;
      currentRow.push(currentVal.trim());
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += ch;
    }
  }
  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }
  return rows;
}

export function parseSheetCSVIntoAppData(csvText: string, baseData: AppData): AppData {
  const rows = parseCSVRows(csvText);
  const updatedSubjects: Subject[] = JSON.parse(JSON.stringify(baseData.subjects));
  let academicWeek = baseData.academicWeek;

  // Detect current academic week e.g. "Week 05"
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const firstCell = rows[r][0] || '';
    const weekMatch = firstCell.match(/Week\s*0?(\d+)/i);
    if (weekMatch) {
      academicWeek = parseInt(weekMatch[1], 10);
    }
  }

  // Parse Attendance, Coursework, and Grades sections by matching subject codes in column 0
  let currentSection: 'none' | 'attendance' | 'tasks' | 'grades' = 'none';

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const col0 = (row[0] || '').trim();
    const col1 = (row[1] || '').trim();
    const col2 = (row[2] || '').trim();

    if (col2.includes('Lec Done') || (col0 === 'Code' && col2.includes('Lec'))) {
      currentSection = 'attendance';
      continue;
    }
    if (col2.includes('Lec Study') || (col0 === 'Code' && col3IncludesSheets(row))) {
      currentSection = 'tasks';
      continue;
    }
    if (col2 === 'Credits' && col3IncludesMaxMarks(row)) {
      currentSection = 'grades';
      continue;
    }

    const subj = updatedSubjects.find((s) => s.code.toUpperCase() === col0.toUpperCase());
    if (subj && currentSection !== 'none') {
      if (currentSection === 'attendance') {
        subj.attendance.lecDone = parseInt(row[2], 10) || 0;
        subj.attendance.lecMissed = parseInt(row[3], 10) || 0;
        subj.attendance.secDone = parseInt(row[4], 10) || 0;
        subj.attendance.secMissed = parseInt(row[5], 10) || 0;
        subj.attendance.labDone = parseInt(row[6], 10) || 0;
        subj.attendance.labMissed = parseInt(row[7], 10) || 0;
      } else if (currentSection === 'tasks') {
        subj.tasks.lecStudy = parseInt(row[2], 10) || 0;
        subj.tasks.sheetsDone = parseInt(row[3], 10) || 0;
        subj.tasks.totalSheets = parseInt(row[4], 10) || subj.tasks.totalSheets;
        subj.tasks.quizzesDone = parseInt(row[5], 10) || 0;
        subj.tasks.totalQuizzes = parseInt(row[6], 10) || subj.tasks.totalQuizzes;
        subj.tasks.assignDone = parseInt(row[7], 10) || 0;
        subj.tasks.totalAssign = parseInt(row[8], 10) || subj.tasks.totalAssign;
        subj.tasks.overdueCount = parseInt(row[11], 10) || 0;
        if (row[13]) subj.nextMilestone = row[13];
      } else if (currentSection === 'grades') {
        subj.credits = parseInt(row[2], 10) || subj.credits;
        subj.maxMarks = parseFloat(row[3]) || 100;
        subj.earnedMarks = parseFloat(row[4]) || 0;
      }
    }
  }

  return {
    ...baseData,
    academicWeek,
    subjects: updatedSubjects,
  };
}

function col3IncludesSheets(row: string[]): boolean {
  return (row[3] || '').includes('Sheets');
}

function col3IncludesMaxMarks(row: string[]): boolean {
  return (row[3] || '').includes('Max Marks');
}

export function exportAppDataToCSV(data: AppData): string {
  const lines: string[] = [];
  lines.push(`"${data.semesterName}",Target GPA,${data.targetGPA},Semester Goal,"${data.semesterGoal.replace(/"/g, '""')}"`);
  lines.push(`Week ${String(data.academicWeek).padStart(2, '0')},Created by ${data.creator}`);
  lines.push('');
  lines.push('SEMESTER ATTENDANCE & CAMPUS ENGAGEMENT TRACKER');
  lines.push('Code,Subject Name,Lec Done,Lec Missed,Sec Done,Sec Missed,Lab Done,Lab Missed');
  data.subjects.forEach((s) => {
    lines.push(
      `${s.code},"${s.name}",${s.attendance.lecDone},${s.attendance.lecMissed},${s.attendance.secDone},${s.attendance.secMissed},${s.attendance.labDone},${s.attendance.labMissed}`
    );
  });
  lines.push('');
  lines.push('COURSEWORK, DELIVERABLES & STUDY TASKS TRACKER');
  lines.push('Code,Subject Name,Lec Study,Sheets,Total Sheets,Quizzes,Total Quizzes,Assigns,Total Assigns,Progress,Visual,Overdue,Status,Next Milestone');
  data.subjects.forEach((s) => {
    lines.push(
      `${s.code},"${s.name}",${s.tasks.lecStudy},${s.tasks.sheetsDone},${s.tasks.totalSheets},${s.tasks.quizzesDone},${s.tasks.totalQuizzes},${s.tasks.assignDone},${s.tasks.totalAssign},,,${s.tasks.overdueCount},"${s.status}","${s.nextMilestone.replace(/"/g, '""')}"`
    );
  });
  lines.push('');
  lines.push('OFFICIAL COURSE GRADES & SEMESTER GPA BREAKDOWN');
  lines.push('Code,Subject Name,Credits,Max Marks,Earned Marks,Target Mark');
  data.subjects.forEach((s) => {
    lines.push(`${s.code},"${s.name}",${s.credits},${s.maxMarks},${s.earnedMarks},${s.targetMark}`);
  });

  return lines.join('\n');
}
