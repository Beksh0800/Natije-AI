import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, CheckCircle, Clock, Plus, Upload, Play, Loader } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import type { Submission, SchoolClass } from '../../types';
import { createClass } from '../../services/classes';
import { useToast } from '../../contexts/ToastContext';
import { STATUS_MAP } from '../../lib/constants';
import './TeacherHome.css';

export default function TeacherHome() {
  const { user } = useAuth();
  const toast = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    if (!db || !user?.id) return;

    setLoading(true);

    // 1. Sync classes
    const classesQuery = query(collection(db, 'classes'), where("teacherId", "==", user.id));
    const unsubscribeClasses = onSnapshot(classesQuery, async (classSnapshot) => {
      const classesData: SchoolClass[] = [];
      const classIds: string[] = [];
      
      classSnapshot.forEach((docSnap) => {
        classesData.push({ id: docSnap.id, ...docSnap.data() } as SchoolClass);
        classIds.push(docSnap.id);
      });
      setClasses(classesData);

      // Fetch students count in teacher's classes
      if (classIds.length > 0) {
        const studentsQuery = query(collection(db, 'students'), where("classId", "in", classIds));
        const studentsSnapshot = await getDocs(studentsQuery);
        setStudentsCount(studentsSnapshot.size);
      } else {
        setStudentsCount(0);
      }
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync teacher classes", error);
      setLoading(false);
    });

    // 2. Sync submissions
    const subQuery = query(collection(db, 'submissions'), where("teacherId", "==", user.id));
    const unsubscribeSubmissions = onSnapshot(subQuery, (querySnapshot) => {
      const subs: Submission[] = [];
      querySnapshot.forEach((docSnap) => {
        subs.push({ id: docSnap.id, ...docSnap.data() } as Submission);
      });
      subs.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
      });
      setSubmissions(subs);
    });

    return () => {
      unsubscribeClasses();
      unsubscribeSubmissions();
    };
  }, [user]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !user) return;

    try {
      setIsCreating(true);
      await createClass(user.id, newClassName.trim());
      setNewClassName('');
      toast.success(`Сынып "${newClassName.trim()}" сәтті қосылды!`);
    } catch (error) {
      console.error("Failed to create class", error);
      toast.error("Сынып қосу кезінде қате пайда болды.");
    } finally {
      setIsCreating(false);
    }
  };

  // Stats Calculations
  const pendingSubmissions = submissions.filter(s => s.status === 'uploaded' || s.status === 'processing' || s.status === 'pending_teacher_review');
  const reviewedSubmissions = submissions.filter(s => s.status === 'reviewed');

  return (
    <MainLayout breadcrumbs={[{ label: 'Мұғалім', path: '/teacher' }, { label: 'Басты бет' }]}>
      {/* Welcome Header */}
      <div className="teacher-home-welcome">
        <div>
          <h1 className="welcome-title">Қайырлы күн, {user?.name}! 👨‍🏫</h1>
          <p className="welcome-subtitle">NÄTIJE AI басқару жүйесі. Оқушылардың жұмыстарын тексеріп, үлгерімді бақылаңыз.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="teacher-home-stats">
        <Card className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
            <BookOpen size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Сыныптар саны</span>
            <span className="stat-value">{classes.length}</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Users size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Жалпы оқушылар</span>
            <span className="stat-value">{studentsCount}</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Тексерілмеген жұмыстар</span>
            <span className="stat-value">{pendingSubmissions.length}</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <CheckCircle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Тексерілген жұмыстар</span>
            <span className="stat-value">{reviewedSubmissions.length}</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Pending Reviews & Sidebar */}
      <div className="teacher-home-grid">
        {/* Left Column: Pending Reviews */}
        <div className="grid-left">
          <div className="section-header-row">
            <h2 className="section-title">Тексеруді күтетін соңғы жұмыстар ({pendingSubmissions.length})</h2>
            {submissions.length > 0 && (
              <Link to="/teacher/assignments" className="view-all-link">Барлық жұмыстар</Link>
            )}
          </div>

          <Card>
            {loading ? (
              <div className="loading-container">
                <Loader className="spin" size={24} />
              </div>
            ) : pendingSubmissions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="pending-table">
                  <thead>
                    <tr>
                      <th>Тапсырма</th>
                      <th>Пән</th>
                      <th>Статусы</th>
                      <th>Жүктелді</th>
                      <th>Әрекет</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSubmissions.slice(0, 5).map((sub) => (
                      <tr key={sub.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{sub.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Файл: {sub.fileName}</div>
                        </td>
                        <td>
                          <Badge color="blue">{sub.subject}</Badge>
                        </td>
                        <td>
                          <StatusBadge 
                            status={sub.status === 'error' ? 'error' : sub.status === 'reviewed' ? 'success' : sub.status === 'pending_teacher_review' ? 'warning' : 'info'} 
                            label={STATUS_MAP[sub.status]?.label || sub.status} 
                          />
                        </td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {new Date((sub.createdAt as any)?.toDate?.() || Date.now()).toLocaleDateString('kk-KZ')}
                        </td>
                        <td>
                          <Link to={`/teacher/assignments/${sub.id}`} style={{ textDecoration: 'none' }}>
                            <Button variant="primary" size="sm" icon={<Play size={12} />}>
                              Тексеру
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-pending-container">
                <CheckCircle size={48} className="success-icon" style={{ color: 'var(--color-success)', marginBottom: '16px' }} />
                <h3>Тексерілмеген жұмыстар жоқ!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
                  Барлық тапсырмалар сәтті бағаланды немесе оқушылар әлі жұмыс жүктемеді.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Quick Actions & Create Class */}
        <div className="grid-right">
          {/* Quick Actions */}
          <Card style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Қысқа әрекеттер</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/teacher/upload" style={{ textDecoration: 'none' }}>
                <Button variant="primary" fullWidth icon={<Upload size={16} />}>
                  Оқушы жұмысын жүктеу
                </Button>
              </Link>
              <Link to="/teacher/classes" style={{ textDecoration: 'none' }}>
                <Button variant="outline" fullWidth icon={<BookOpen size={16} />}>
                  Сыныптар тізіміне өту
                </Button>
              </Link>
            </div>
          </Card>

          {/* Create Class */}
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Жаңа сынып қосу</h3>
            <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  Сынып атауы (мысалы, 6 "А")
                </label>
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder="Сынып атауын енгізіңіз"
                  className="form-input"
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <Button type="submit" variant="primary" fullWidth disabled={isCreating}>
                {isCreating ? <Loader size={16} className="spin" /> : <><Plus size={16} /> Сынып қосу</>}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
