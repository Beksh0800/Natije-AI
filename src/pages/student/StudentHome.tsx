import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, Plus, KeyRound, Award, Loader, Mail } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { sendMessage } from '../../services/messages';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Submission } from '../../types';
import './StudentHome.css';

interface SchoolClass {
  id: string;
  name: string;
  teacherId: string;
  inviteCode?: string;
  studentsCount?: number;
}

export default function StudentHome() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentDocIds, setStudentDocIds] = useState<string[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);

  const handleMessageTeacher = async (teacherId: string, className: string) => {
    if (!teacherId) { alert('Мұғалім табылмады'); return; }
    const text = window.prompt(`Хабарлама мәтіні (${className} мұғаліміне):`);
    if (text) {
      try {
        await sendMessage({
          senderId: user?.id || '',
          senderName: user?.name || 'Оқушы',
          receiverId: teacherId,
          text
        });
        alert('Хабарлама жіберілді!');
      } catch(e) { alert('Қате шықты'); }
    }
  };

  // Generate parent code for existing students if missing
  useEffect(() => {
    if (!db || !user || user.role !== 'student') return;
    if (!user.parentCode) {
      const generateAndSave = async () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        try {
          await updateDoc(doc(db, 'users', user.id), { parentCode: code });
          // Note: The UI will update when the user refreshes or auth state syncs, 
          // or we can just rely on the next login. Since this is an edge case 
          // for old users, it's fine if they need to refresh.
        } catch (err) {
          console.error("Failed to generate parent code", err);
        }
      };
      generateAndSave();
    }
  }, [user]);

  useEffect(() => {
    if (!db || !user) return;

    setLoading(true);

    // 1. Listen to student's memberships in classes
    const studentQuery = query(
      collection(db, 'students'), 
      where("email", "==", user.email)
    );

    const unsubscribeStudents = onSnapshot(studentQuery, async (querySnapshot) => {
      const classIds: string[] = [];
      const docIds = [user.id];
      querySnapshot.forEach(async (docSnap) => {
        docIds.push(docSnap.id);
        const data = docSnap.data();
        if (!data.studentId && user?.id) {
          try {
            await updateDoc(doc(db, 'students', docSnap.id), { studentId: user.id });
          } catch(e) {}
        }
        if (data.classId && !classIds.includes(data.classId)) {
          classIds.push(data.classId);
        }
      });
      setStudentDocIds(Array.from(new Set(docIds)));
      setClassIds(classIds);

      if (classIds.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      // Fetch class details
      const classesData: SchoolClass[] = [];
      for (const cid of classIds) {
        try {
          const classDoc = await getDoc(doc(db, 'classes', cid));
          if (classDoc.exists()) {
            classesData.push({ id: classDoc.id, ...classDoc.data() } as SchoolClass);
          }
        } catch (err) {
          console.error("Error fetching class details:", err);
        }
      }
      setClasses(classesData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync student classes:", error);
      setLoading(false);
    });

    return () => unsubscribeStudents();
  }, [user]);

  // 2. Listen to student's submissions once studentDocIds are resolved
  useEffect(() => {
    if (!db || !user || studentDocIds.length === 0) return;

    const mergedSubmissions = new Map<string, Submission>();

    const updateSubmissions = () => {
      const subs = Array.from(mergedSubmissions.values());
      subs.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
      });
      setSubmissions(subs);
    };

    // Query 1: Assignments given directly to the student
    const subQuery1 = query(
      collection(db, 'submissions'),
      where("studentId", "in", studentDocIds)
    );

    const unsubscribe1 = onSnapshot(subQuery1, (querySnapshot) => {
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === "removed") {
          mergedSubmissions.delete(change.doc.id);
        } else {
          mergedSubmissions.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Submission);
        }
      });
      updateSubmissions();
    });

    // Query 2: Assignments given to the whole class
    let unsubscribe2 = () => {};
    if (classIds.length > 0) {
      const subQuery2 = query(
        collection(db, 'submissions'),
        where("studentId", "==", "all"),
        where("classId", "in", classIds)
      );
      unsubscribe2 = onSnapshot(subQuery2, (querySnapshot) => {
        querySnapshot.docChanges().forEach((change) => {
          if (change.type === "removed") {
            mergedSubmissions.delete(change.doc.id);
          } else {
            mergedSubmissions.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Submission);
          }
        });
        updateSubmissions();
      });
    }

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [studentDocIds, classIds, user]);

  // Calculations
  const reviewedSubmissions = submissions.filter(s => s.status === 'reviewed');
  const totalScore = reviewedSubmissions.reduce((sum, s) => {
    return sum + (s.score || 85);
  }, 0);
  const averageScore = reviewedSubmissions.length > 0 ? Math.round(totalScore / reviewedSubmissions.length) : 0;

  return (
    <MainLayout breadcrumbs={[{ label: 'Басты бет' }]}>
      {/* Welcome Header */}
      <div className="student-home-welcome">
        <div>
          <h1 className="welcome-title">Сәлем, {user?.name}! 👋</h1>
          <p className="welcome-subtitle">NÄTIJE AI білім беру жүйесіне қош келдіңіз. Бүгінгі үлгеріміңізді тексеріңіз.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={16} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ата-анаға арналған код:</span>
            <strong style={{ fontSize: '1rem', letterSpacing: '1px', userSelect: 'all' }}>{user?.parentCode || '...'}</strong>
          </div>
          <Link to="/join-class" style={{ textDecoration: 'none' }}>
            <Button variant="primary" icon={<Plus size={16} />}>
              Сыныпқа қосылу
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="student-home-stats">
        <Card className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
            <BookOpen size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Қосылған сыныптар</span>
            <span className="stat-value">{classes.length}</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <FileText size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Жүктелген жұмыстар</span>
            <span className="stat-value">{submissions.length}</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <Award size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Орташа балл</span>
            <span className="stat-value">{averageScore > 0 ? `${averageScore}%` : '—'}</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Classes & Submissions */}
      <div className="student-home-grid">
        {/* Left Column: Classes */}
        <div className="grid-left">
          <div className="section-header-row">
            <h2 className="section-title">Менің сыныптарым ({classes.length})</h2>
          </div>

          {loading ? (
            <div className="loading-container">
              <Loader className="spin" size={24} />
            </div>
          ) : classes.length > 0 ? (
            <div className="classes-list-grid">
              {classes.map((c) => (
                <Card key={c.id} variant="hover" className="class-card">
                  <div className="class-card-header">
                    <div className="class-avatar">
                      {c.name.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="class-name">{c.name} сыныбы</h3>
                      <div className="class-code-badge">
                        <KeyRound size={12} />
                        <span>Код: {c.inviteCode}</span>
                      </div>
                    </div>
                  </div>
                  <div className="class-card-footer" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <span className="student-count">Оқушылар саны: {c.studentsCount || 1}</span>
                    <Badge color="green" filled style={{ marginLeft: '8px' }}>Белсенді</Badge>
                    <button onClick={() => handleMessageTeacher(c.teacherId, c.name)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', marginLeft: 'auto' }} title="Мұғалімге хабарлама жазу">
                      <Mail size={18} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="empty-classes-card">
              <BookOpen size={48} className="empty-icon" />
              <h3>Сыныптарға әлі қосылмағансыз</h3>
              <p>Үй жұмыстарын жіберу және баға алу үшін мұғалімнен алған код арқылы сыныпқа қосылыңыз.</p>
              <Link to="/join-class" style={{ textDecoration: 'none', marginTop: '16px', display: 'inline-block' }}>
                <Button variant="outline" size="sm" icon={<Plus size={14} />}>Сыныпқа қосылу</Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Right Column: Recent Activity / Submissions */}
        <div className="grid-right">
          <div className="section-header-row">
            <h2 className="section-title">Соңғы жұмыстар</h2>
            {submissions.length > 3 && (
              <Link to="/assignments" className="view-all-link">Барлығын көру</Link>
            )}
          </div>

          <Card className="recent-submissions-card">
            {submissions.length > 0 ? (
              <div className="recent-submissions-list">
                {submissions.slice(0, 4).map((sub) => (
                  <Link key={sub.id} to={`/assignments/${sub.id}`} className="submission-item-link">
                    <div className="submission-item-row">
                      <div className="submission-info-group">
                        <div className="submission-file-icon">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h4 className="submission-title">{sub.title}</h4>
                          <span className="submission-subject">{sub.subject}</span>
                          {sub.dueDate && (
                            <span className="submission-dueDate" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                              Дедлайн: {new Date(sub.dueDate).toLocaleString('kk-KZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="submission-status-group">
                        {sub.status === 'reviewed' ? (
                          <span className="score-badge">{sub.score || 85}/100</span>
                        ) : (
                          <Badge color="yellow">Тексерілуде</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-submissions">
                <FileText size={36} className="empty-icon" />
                <p>Жүктелген жұмыстар жоқ</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
