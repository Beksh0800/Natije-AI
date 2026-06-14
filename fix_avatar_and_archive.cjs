const fs = require('fs');
const path = require('path');

// 1. Fix AuthContext
const authPath = path.join(process.cwd(), 'src/contexts/AuthContext.tsx');
let authContent = fs.readFileSync(authPath, 'utf8');
authContent = authContent.replace(
  `              createdAt: userData.createdAt || new Date().toISOString(),`,
  `              createdAt: userData.createdAt || new Date().toISOString(),\n              avatar: userData.avatar,`
);
fs.writeFileSync(authPath, authContent, 'utf8');

// 2. Fix ArchivePage
const apPath = path.join(process.cwd(), 'src/pages/student/ArchivePage.tsx');
let apContent = fs.readFileSync(apPath, 'utf8');
apContent = apContent.replace(
  `const q = query(collection(db, 'submissions'), where("classId", "in", studentClassIds), where("studentId", "==", "all"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Submission[] = [];
      querySnapshot.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() } as Submission));`,
  `const q = query(collection(db, 'submissions'), where("classId", "in", studentClassIds));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Submission[] = [];
      querySnapshot.forEach(docSnap => {
        const sub = { id: docSnap.id, ...docSnap.data() } as Submission;
        if (sub.studentId === 'all') data.push(sub);
      });`
);
fs.writeFileSync(apPath, apContent, 'utf8');

// 3. Fix StudentArchivePage
const sapPath = path.join(process.cwd(), 'src/pages/student/StudentArchivePage.tsx');
let sapContent = fs.readFileSync(sapPath, 'utf8');
sapContent = sapContent.replace(
  `const q = query(
      collection(db, 'submissions'), 
      where("classId", "in", studentClassIds), 
      where("studentId", "==", "all"),
      where("status", "==", "reviewed")
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Submission[] = [];
      querySnapshot.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() } as Submission));`,
  `const q = query(
      collection(db, 'submissions'), 
      where("classId", "in", studentClassIds)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Submission[] = [];
      querySnapshot.forEach(docSnap => {
        const sub = { id: docSnap.id, ...docSnap.data() } as Submission;
        if (sub.studentId === 'all' && sub.status === 'reviewed') data.push(sub);
      });`
);
fs.writeFileSync(sapPath, sapContent, 'utf8');

console.log('Fixed AuthContext and Archive queries');
