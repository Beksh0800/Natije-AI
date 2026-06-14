import { useState, useEffect } from 'react';
import {
  BarChart2, FileText, Users, CheckCircle, Award,
  TrendingUp, BookOpen, Loader
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Submission } from '../../types';
import './TeacherStatsPage.css';

interface StudentStat {
  name: string;
  email: string;
  totalScore: number;
  count: number;
  avg: number;
}

export default function TeacherStatsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [classesCount, setClassesCount] = useState(0);
  const [studentsMap, setStudentsMap] = useState<Map<string, { name: string; email: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch classes
        const classesQ = query(collection(db, 'classes'), where('teacherId', '==', user.id));
        const classesSnap = await getDocs(classesQ);
        setClassesCount(classesSnap.size);

        const classIds = classesSnap.docs.map((d) => d.id);

        // 2. Fetch students count and build details map
        const tempStudentsMap = new Map<string, { name: string; email: string }>();
        if (classIds.length > 0) {
          const studentsQ = query(collection(db, 'students'), where('classId', 'in', classIds.slice(0, 30)));
          const studentsSnap = await getDocs(studentsQ);
          setStudentsCount(studentsSnap.size);
          studentsSnap.forEach((doc) => {
            const data = doc.data();
            tempStudentsMap.set(doc.id, { name: data.name || '', email: data.email || '' });
          });
        }
        setStudentsMap(tempStudentsMap);

        // 3. Fetch all submissions
        const subQ = query(collection(db, 'submissions'), where('teacherId', '==', user.id));
        const subSnap = await getDocs(subQ);
        const subs: Submission[] = [];
        subSnap.forEach((d) => subs.push({ id: d.id, ...d.data() } as Submission));
        setSubmissions(subs);
      } catch (err) {
        console.error('Failed to fetch stats data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculations
  const reviewed = submissions.filter((s) => s.status === 'reviewed');
  const pending = submissions.filter((s) => s.status === 'uploaded' || s.status === 'processing');
  const totalAvg = reviewed.length > 0
    ? Math.round(reviewed.reduce((sum, s) => sum + (s.score || 0), 0) / reviewed.length)
    : 0;

  // Score distribution
  const highCount = reviewed.filter((s) => (s.score || 0) >= 85).length;
  const midCount = reviewed.filter((s) => (s.score || 0) >= 60 && (s.score || 0) < 85).length;
  const lowCount = reviewed.filter((s) => (s.score || 0) < 60).length;
  const maxDist = Math.max(highCount, midCount, lowCount, 1);

  // Top students by average score
  const studentMap = new Map<string, StudentStat>();
  for (const sub of reviewed) {
    const key = sub.studentId;
    if (!studentMap.has(key)) {
      const studentDetails = studentsMap.get(key) || { name: `Оқушы #${key.substring(0, 6)}`, email: '' };
      studentMap.set(key, { name: studentDetails.name, email: studentDetails.email, totalScore: 0, count: 0, avg: 0 });
    }
    const stat = studentMap.get(key)!;
    stat.totalScore += sub.score || 0;
    stat.count += 1;
  }
  const topStudents: (StudentStat & { id: string })[] = [];
  studentMap.forEach((stat, id) => {
    stat.avg = Math.round(stat.totalScore / stat.count);
    topStudents.push({ ...stat, id });
  });
  topStudents.sort((a, b) => b.avg - a.avg);

  // Subjects breakdown
  const subjectMap = new Map<string, number>();
  for (const sub of submissions) {
    const s = sub.subject || 'Белгісіз';
    subjectMap.set(s, (subjectMap.get(s) || 0) + 1);
  }
  const subjects = Array.from(subjectMap.entries())
    .sort((a, b) => b[1] - a[1]);

  return (
    <MainLayout breadcrumbs={[{ label: 'Мұғалім', path: '/teacher' }, { label: 'Статистика' }]}>
      <div className="stats-page-header">
        <h1>
          <BarChart2 size={24} style={{ color: 'var(--accent-primary)' }} />
          Статистика
        </h1>
        <p>Оқушылардың жалпы үлгерімі мен бағалау нәтижелерін бақылаңыз.</p>
      </div>

      {/* Top Stats */}
      <div className="stats-top-row">
        <Card className="stats-top-card">
          <div className="stats-top-icon" style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
            <FileText size={20} />
          </div>
          <div className="stats-top-info">
            <span className="stats-top-label">Барлық жұмыстар</span>
            <span className="stats-top-value">{submissions.length}</span>
          </div>
        </Card>

        <Card className="stats-top-card">
          <div className="stats-top-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <CheckCircle size={20} />
          </div>
          <div className="stats-top-info">
            <span className="stats-top-label">Тексерілген</span>
            <span className="stats-top-value">{reviewed.length}</span>
          </div>
        </Card>

        <Card className="stats-top-card">
          <div className="stats-top-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stats-top-info">
            <span className="stats-top-label">Орташа балл</span>
            <span className="stats-top-value">{totalAvg > 0 ? `${totalAvg}%` : '—'}</span>
          </div>
        </Card>

        <Card className="stats-top-card">
          <div className="stats-top-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <Users size={20} />
          </div>
          <div className="stats-top-info">
            <span className="stats-top-label">Оқушылар / Сыныптар</span>
            <span className="stats-top-value">{studentsCount} / {classesCount}</span>
          </div>
        </Card>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <Loader className="spin" size={28} />
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <div className="stats-empty">
            <BarChart2 size={48} style={{ opacity: 0.3 }} />
            <p>Деректер жоқ. Оқушылардың жұмыстарын жүктеп, AI арқылы тексергенде статистика пайда болады.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Distribution + Top Students */}
          <div className="stats-main-grid">
            {/* Score Distribution */}
            <Card>
              <h2 className="stats-section-title">
                <Award size={18} style={{ color: 'var(--accent-primary)' }} />
                Бағалар бөлінісі
              </h2>

              <div className="dist-bar-row">
                <span className="dist-bar-label">85–100</span>
                <div className="dist-bar-track">
                  <div
                    className="dist-bar-fill"
                    style={{ width: `${(highCount / maxDist) * 100}%`, background: 'var(--color-success)' }}
                  />
                </div>
                <span className="dist-bar-count">{highCount}</span>
              </div>

              <div className="dist-bar-row">
                <span className="dist-bar-label">60–84</span>
                <div className="dist-bar-track">
                  <div
                    className="dist-bar-fill"
                    style={{ width: `${(midCount / maxDist) * 100}%`, background: 'var(--color-warning)' }}
                  />
                </div>
                <span className="dist-bar-count">{midCount}</span>
              </div>

              <div className="dist-bar-row">
                <span className="dist-bar-label">0–59</span>
                <div className="dist-bar-track">
                  <div
                    className="dist-bar-fill"
                    style={{ width: `${(lowCount / maxDist) * 100}%`, background: '#ef4444' }}
                  />
                </div>
                <span className="dist-bar-count">{lowCount}</span>
              </div>

              {pending.length > 0 && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '16px' }}>
                  ⏳ Тексерілмеген жұмыстар: {pending.length}
                </p>
              )}
            </Card>

            {/* Top Students */}
            <Card>
              <h2 className="stats-section-title">
                <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
                Үздік оқушылар (орташа балл)
              </h2>

              {topStudents.length > 0 ? (
                <div className="top-students-list">
                  {topStudents.slice(0, 8).map((st, i) => (
                    <div key={st.id} className="top-student-item">
                      <span className={`top-student-rank ${i < 3 ? `rank-${i + 1}` : ''}`}>
                        {i + 1}
                      </span>
                      <div className="top-student-avatar">
                        {st.name ? st.name.substring(0, 2).toUpperCase() : '👤'}
                      </div>
                      <div className="top-student-info">
                        <div className="top-student-name">{st.name}</div>
                        <div className="top-student-count">{st.count} жұмыс</div>
                      </div>
                      <span className="top-student-score">{st.avg}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="stats-empty">
                  <p>Тексерілген жұмыстар жоқ</p>
                </div>
              )}
            </Card>
          </div>

          {/* Subjects */}
          {subjects.length > 0 && (
            <Card>
              <h2 className="stats-section-title">
                <BookOpen size={18} style={{ color: 'var(--accent-primary)' }} />
                Пәндер бойынша жұмыстар
              </h2>
              {subjects.map(([name, count]) => (
                <div key={name} className="subject-stat-item">
                  <span className="subject-stat-name">{name}</span>
                  <span className="subject-stat-count">{count} жұмыс</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </MainLayout>
  );
}
