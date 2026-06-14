const fs = require('fs');
let content = fs.readFileSync('src/pages/teacher/TeacherReview.tsx', 'utf8');
content = content.replace(
  "import { doc, collection, query, where, onSnapshot, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';",
  "import { doc, collection, query, where, onSnapshot, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';\nimport { createNotification } from '../../services/notifications';"
);

const insertStr = `
      // Notify student
      await createNotification({
        userId: submission.studentId,
        title: 'Жұмыс бағаланды',
        message: \`\${submission.title} жұмысыңыз мұғаліммен бағаланды: \${finalScore} балл\`,
        type: 'grade',
        link: \`/assignments/\${submission.id}\`
      });
`;
content = content.replace(
  "toast.success('Оқушының бағасы сақталды!');",
  insertStr + "\n      toast.success('Оқушының бағасы сақталды!');"
);

fs.writeFileSync('src/pages/teacher/TeacherReview.tsx', content);
