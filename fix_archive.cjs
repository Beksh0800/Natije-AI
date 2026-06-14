const fs = require('fs');
const path = require('path');

const targetStr = `  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentDocIds, setStudentDocIds] = useState<string[]>([]);

  useEffect(() => {
    if (!db || !user) return;

    const studentQuery = query(
      collection(db, 'students'), 
      where("email", "==", user.email)
    );

    const unsubscribe = onSnapshot(studentQuery, (querySnapshot) => {
      const ids = [user.id];
      querySnapshot.forEach((docSnap) => {
        ids.push(docSnap.id);
      });
      setStudentDocIds(Array.from(new Set(ids)));
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!db || !user || studentDocIds.length === 0) return;

    setLoading(true);
    const q = query(collection(db, 'submissions'), where("studentId", "in", studentDocIds));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const submissionsData: Submission[] = [];
      querySnapshot.forEach((docSnap) => {
        submissionsData.push({ id: docSnap.id, ...docSnap.data() } as Submission);
      });
      // Sort newest first
      submissionsData.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
      });
      setSubmissions(submissionsData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync student submissions", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentDocIds, user]);`;

const replacementStr = `  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [directSubs, setDirectSubs] = useState<Submission[]>([]);
  const [classSubs, setClassSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentDocIds, setStudentDocIds] = useState<string[]>([]);
  const [studentClassIds, setStudentClassIds] = useState<string[]>([]);

  useEffect(() => {
    if (!db || !user) return;

    const studentQuery = query(
      collection(db, 'students'), 
      where("email", "==", user.email)
    );

    const unsubscribe = onSnapshot(studentQuery, (querySnapshot) => {
      const ids = [user.id];
      const cIds: string[] = [];
      querySnapshot.forEach((docSnap) => {
        ids.push(docSnap.id);
        const data = docSnap.data();
        if (data.classId) cIds.push(data.classId);
      });
      setStudentDocIds(Array.from(new Set(ids)));
      setStudentClassIds(Array.from(new Set(cIds)));
    });

    return () => unsubscribe();
  }, [user]);

  // Direct submissions
  useEffect(() => {
    if (!db || studentDocIds.length === 0) return;
    const q = query(collection(db, 'submissions'), where("studentId", "in", studentDocIds));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Submission[] = [];
      querySnapshot.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() } as Submission));
      setDirectSubs(data);
    });
    return () => unsubscribe();
  }, [studentDocIds]);

  // Class submissions
  useEffect(() => {
    if (!db || studentClassIds.length === 0) return;
    const q = query(collection(db, 'submissions'), where("classId", "in", studentClassIds), where("studentId", "==", "all"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Submission[] = [];
      querySnapshot.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() } as Submission));
      setClassSubs(data);
    });
    return () => unsubscribe();
  }, [studentClassIds]);

  // Merge Submissions
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
    
    if (studentDocIds.length > 0 || studentClassIds.length > 0) {
      setLoading(false);
    }
  }, [directSubs, classSubs, studentDocIds, studentClassIds]);`;

const targetStr2 = `  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [studentDocIds, setStudentDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // 1. Resolve student document IDs
  useEffect(() => {
    if (!db || !user) return;

    const studentQuery = query(
      collection(db, 'students'), 
      where("email", "==", user.email)
    );

    const unsubscribe = onSnapshot(studentQuery, (querySnapshot) => {
      const ids = [user.id];
      querySnapshot.forEach((docSnap) => {
        ids.push(docSnap.id);
      });
      setStudentDocIds(Array.from(new Set(ids)));
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Listen to reviewed submissions only
  useEffect(() => {
    if (!db || !user || studentDocIds.length === 0) return;

    setLoading(true);
    const q = query(
      collection(db, 'submissions'), 
      where("studentId", "in", studentDocIds),
      where("status", "==", "reviewed")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const submissionsData: Submission[] = [];
      querySnapshot.forEach((docSnap) => {
        submissionsData.push({ id: docSnap.id, ...docSnap.data() } as Submission);
      });
      // Sort newest first
      submissionsData.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
      });
      setSubmissions(submissionsData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync student archive submissions", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentDocIds, user]);`;

const replacementStr2 = `  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [directSubs, setDirectSubs] = useState<Submission[]>([]);
  const [classSubs, setClassSubs] = useState<Submission[]>([]);
  const [studentDocIds, setStudentDocIds] = useState<string[]>([]);
  const [studentClassIds, setStudentClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // 1. Resolve student document IDs
  useEffect(() => {
    if (!db || !user) return;

    const studentQuery = query(
      collection(db, 'students'), 
      where("email", "==", user.email)
    );

    const unsubscribe = onSnapshot(studentQuery, (querySnapshot) => {
      const ids = [user.id];
      const cIds: string[] = [];
      querySnapshot.forEach((docSnap) => {
        ids.push(docSnap.id);
        const data = docSnap.data();
        if (data.classId) cIds.push(data.classId);
      });
      setStudentDocIds(Array.from(new Set(ids)));
      setStudentClassIds(Array.from(new Set(cIds)));
    });

    return () => unsubscribe();
  }, [user]);

  // Direct submissions
  useEffect(() => {
    if (!db || studentDocIds.length === 0) return;
    const q = query(
      collection(db, 'submissions'), 
      where("studentId", "in", studentDocIds),
      where("status", "==", "reviewed")
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Submission[] = [];
      querySnapshot.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() } as Submission));
      setDirectSubs(data);
    });
    return () => unsubscribe();
  }, [studentDocIds]);

  // Class submissions
  useEffect(() => {
    if (!db || studentClassIds.length === 0) return;
    const q = query(
      collection(db, 'submissions'), 
      where("classId", "in", studentClassIds), 
      where("studentId", "==", "all"),
      where("status", "==", "reviewed")
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Submission[] = [];
      querySnapshot.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() } as Submission));
      setClassSubs(data);
    });
    return () => unsubscribe();
  }, [studentClassIds]);

  // Merge Submissions
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
    if (studentDocIds.length > 0 || studentClassIds.length > 0) {
      setLoading(false);
    }
  }, [directSubs, classSubs, studentDocIds, studentClassIds]);`;


const apPath = path.join(process.cwd(), 'src/pages/student/ArchivePage.tsx');
let apContent = fs.readFileSync(apPath, 'utf8');
apContent = apContent.replace(targetStr, replacementStr);
fs.writeFileSync(apPath, apContent, 'utf8');

const sapPath = path.join(process.cwd(), 'src/pages/student/StudentArchivePage.tsx');
let sapContent = fs.readFileSync(sapPath, 'utf8');
sapContent = sapContent.replace(targetStr2, replacementStr2);
fs.writeFileSync(sapPath, sapContent, 'utf8');

console.log('Fixed Archive and StudentArchive pages');
