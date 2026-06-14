const fs = require('fs');
const path = require('path');

const targetStr = `  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [studentDocIds, setStudentDocIds] = useState<string[]>([]);`;

const replacementStr = `  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [directSubs, setDirectSubs] = useState<Submission[]>([]);
  const [classSubs, setClassSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [studentDocIds, setStudentDocIds] = useState<string[]>([]);
  const [studentClassIds, setStudentClassIds] = useState<string[]>([]);`;

const targetStr2 = `      setStudentDocIds(Array.from(new Set(docIds)));

      if (classIds.length === 0) {`;

const replacementStr2 = `      setStudentDocIds(Array.from(new Set(docIds)));
      setStudentClassIds(Array.from(new Set(classIds)));

      if (classIds.length === 0) {`;

const targetStr3 = `  // 2. Listen to student's submissions once studentDocIds are resolved
  useEffect(() => {
    if (!db || !user || studentDocIds.length === 0) return;

    const subQuery = query(
      collection(db, 'submissions'),
      where("studentId", "in", studentDocIds)
    );

    const unsubscribeSubmissions = onSnapshot(subQuery, (querySnapshot) => {
      const subs: Submission[] = [];
      querySnapshot.forEach((docSnap) => {
        subs.push({ id: docSnap.id, ...docSnap.data() } as Submission);
      });
      // Sort newest first
      subs.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
      });
      setSubmissions(subs);
    });

    return () => unsubscribeSubmissions();
  }, [studentDocIds, user]);`;

const replacementStr3 = `  // 2. Direct submissions
  useEffect(() => {
    if (!db || !user || studentDocIds.length === 0) return;
    const q = query(collection(db, 'submissions'), where("studentId", "in", studentDocIds));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const subs: Submission[] = [];
      querySnapshot.forEach((docSnap) => {
        subs.push({ id: docSnap.id, ...docSnap.data() } as Submission);
      });
      setDirectSubs(subs);
    });
    return () => unsubscribe();
  }, [studentDocIds, user]);

  // 3. Class submissions
  useEffect(() => {
    if (!db || studentClassIds.length === 0) return;
    const q = query(collection(db, 'submissions'), where("classId", "in", studentClassIds));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const subs: Submission[] = [];
      querySnapshot.forEach((docSnap) => {
        const sub = { id: docSnap.id, ...docSnap.data() } as Submission;
        if (sub.studentId === 'all') subs.push(sub);
      });
      setClassSubs(subs);
    });
    return () => unsubscribe();
  }, [studentClassIds]);

  // 4. Merge
  useEffect(() => {
    const map = new Map<string, Submission>();
    directSubs.forEach(s => map.set(s.id, s));
    classSubs.forEach(s => map.set(s.id, s));
    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      const timeA = (a.createdAt as any)?.seconds || 0;
      const timeB = (b.createdAt as any)?.seconds || 0;
      return timeB - timeA;
    });
    setSubmissions(merged);
  }, [directSubs, classSubs]);`;


const apPath = path.join(process.cwd(), 'src/pages/student/StudentHome.tsx');
let apContent = fs.readFileSync(apPath, 'utf8');
apContent = apContent.replace(targetStr, replacementStr);
apContent = apContent.replace(targetStr2, replacementStr2);
apContent = apContent.replace(targetStr3, replacementStr3);
fs.writeFileSync(apPath, apContent, 'utf8');

console.log('Fixed StudentHome.tsx');
