const fs = require('fs');
const path = require('path');

const files = [
  'functions/src/index.ts',
  'src/components/chat/ChatPanel.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/ui/Card.tsx',
  'src/contexts/AuthContext.tsx',
  'src/contexts/ThemeContext.tsx',
  'src/contexts/ToastContext.tsx',
  'src/contexts/__tests__/AuthContext.test.tsx',
  'src/lib/firebase.ts',
  'src/lib/utils.ts',
  'src/pages/auth/ForgotPasswordPage.tsx',
  'src/pages/auth/LoginPage.tsx',
  'src/pages/auth/RegisterPage.tsx',
  'src/pages/parent/ParentDashboard.tsx',
  'src/pages/settings/ProfileSettings.tsx',
  'src/pages/student/ArchivePage.tsx',
  'src/pages/student/JoinClassPage.tsx',
  'src/pages/student/StudentArchivePage.tsx',
  'src/pages/student/StudentDashboard.tsx',
  'src/pages/student/StudentHome.tsx',
  'src/pages/student/StudentProgressPage.tsx',
  'src/pages/teacher/AssignmentsPage.tsx',
  'src/pages/teacher/ClassDetailsPage.tsx',
  'src/pages/teacher/TeacherClassesPage.tsx',
  'src/pages/teacher/TeacherDashboard.tsx',
  'src/pages/teacher/TeacherHome.tsx',
  'src/pages/teacher/TeacherReview.tsx',
  'src/pages/teacher/TeacherStudentsPage.tsx',
  'src/pages/teacher/UploadWorkPage.tsx',
  'src/services/__tests__/ai.test.ts',
  'src/services/ai.ts',
  'src/services/storage.ts'
];

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Remove @ts-nocheck
  content = content.replace(/\/\/\s*@ts-nocheck\n?/g, '');

  // Replace basic 'any' with 'unknown' for catch clauses
  content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)/g, 'catch ($1: unknown)');

  // Fix unthrown cause errors: add /* eslint-disable preserve-caught-error */ or change to include cause
  // Actually, we can just replace 'throw new Error(msg)' with 'throw new Error(msg, { cause: err })' if err is around.
  content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*unknown\s*\)\s*{([^}]+)throw new Error\('([^']+)'\)/g, "catch ($1: unknown) {$2throw new Error('$3', { cause: $1 })");

  // Fix unused vars in catch blocks (e.g., err -> _err)
  content = content.replace(/catch\s*\(\s*err\s*:\s*unknown\s*\)\s*{\s*console\.error/g, 'catch (err: unknown) { console.error');

  // Quick fixes for any generic usages where appropriate
  // We'll leave some 'any' that are harder to replace but replace simple ones with unknown
  content = content.replace(/:\s*any/g, ': unknown');

  // In AuthContext and testing contexts, there are many 'as any'
  content = content.replace(/as\s*any/g, 'as unknown');

  fs.writeFileSync(fullPath, content, 'utf8');
});

console.log('Automated replacements applied.');
