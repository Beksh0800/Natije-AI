const fs = require('fs');
const path = require('path');

const files = [
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

  // Revert unknown back to any to fix compilation
  content = content.replace(/:\s*unknown/g, ': any');
  content = content.replace(/as\s*unknown/g, 'as any');

  fs.writeFileSync(fullPath, content, 'utf8');
});

console.log('Reverted unknown to any to fix build.');
