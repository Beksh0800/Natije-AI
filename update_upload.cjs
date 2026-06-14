const fs = require('fs');
let content = fs.readFileSync('src/pages/teacher/UploadWorkPage.tsx', 'utf8');
content = content.replace(
  "import { createSubmission } from '../../services/submissions';",
  "import { createSubmission } from '../../services/submissions';\nimport { createNotification } from '../../services/notifications';"
);
const insertStr = `
      // 4. Send notifications
      const classStudents = await getClassStudents(selectedClass);
      const notifPromises = classStudents.map(student => 
        createNotification({
          userId: student.id,
          title: 'Жаңа тапсырма',
          message: \`\${finalSubject} пәнінен жаңа тапсырма қосылды: \${title}\`,
          type: 'assignment',
          link: '/student'
        })
      );
      await Promise.all(notifPromises);
`;
content = content.replace(
  '      toast.success("Жұмыс сәтті жүктелді!");',
  insertStr + '\n      toast.success("Жұмыс сәтті жүктелді!");'
);
fs.writeFileSync('src/pages/teacher/UploadWorkPage.tsx', content);
