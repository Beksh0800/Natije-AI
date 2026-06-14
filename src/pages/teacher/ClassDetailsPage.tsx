import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Plus, Loader, ArrowLeft, Copy, KeyRound } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { db } from '../../lib/firebase';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { addStudent } from '../../services/students';
import { useToast } from '../../contexts/ToastContext';
import type { Student, SchoolClass } from '../../types';

export default function ClassDetailsPage() {
  const { classId } = useParams();
  const toast = useToast();
  
  const [classInfo, setClassInfo] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!db || !classId) return;

    setLoading(true);

    // 1. Listen to class doc
    const classDocRef = doc(db, 'classes', classId);
    const unsubscribeClass = onSnapshot(classDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setClassInfo({ id: docSnap.id, ...docSnap.data() } as SchoolClass);
      }
    });

    // 2. Listen to students collection
    const studentsQuery = query(collection(db, 'students'), where("classId", "==", classId));
    const unsubscribeStudents = onSnapshot(studentsQuery, (querySnapshot) => {
      const studentsData: Student[] = [];
      querySnapshot.forEach((docSnap) => {
        studentsData.push({ id: docSnap.id, ...docSnap.data() } as Student);
      });
      // Sort alphabetically or by creation time if desired
      setStudents(studentsData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync students", error);
      setLoading(false);
    });

    return () => {
      unsubscribeClass();
      unsubscribeStudents();
    };
  }, [classId]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !newStudentName.trim()) return;

    try {
      setIsAdding(true);
      await addStudent(classId, newStudentName.trim(), newStudentEmail.trim());
      setNewStudentName('');
      setNewStudentEmail('');
      toast.success(`Оқушы "${newStudentName.trim()}" сәтті қосылды!`);
    } catch (error) {
      console.error("Failed to add student", error);
      toast.error("Оқушы қосу кезінде қате пайда болды.");
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <MainLayout breadcrumbs={[{ label: 'Мұғалім', path: '/teacher' }, { label: 'Сыныптар' }]}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <Loader className="spin" size={32} />
        </div>
      </MainLayout>
    );
  }

  if (!classInfo) {
    return (
      <MainLayout breadcrumbs={[{ label: 'Мұғалім', path: '/teacher' }, { label: 'Қате' }]}>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <h2>Сынып табылмады</h2>
          <Link to="/teacher" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Артқа қайту</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Мұғалім', path: '/teacher' },
        { label: 'Сыныптар', path: '/teacher' },
        { label: classInfo.name },
      ]}
    >
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <Link to="/teacher" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.5rem', fontWeight: 700 }}>
            {classInfo.name} сыныбы
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Оқушыларды басқару</p>
        </div>
      </div>

      {/* Invite Code */}
      {classInfo.inviteCode && (
        <Card padding="md" style={{ marginBottom: 'var(--space-4)', background: 'var(--accent-primary-light)', border: '1px dashed var(--accent-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <KeyRound size={20} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Сынып коды (оқушыларға жіберіңіз)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '4px', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{classInfo.inviteCode}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(classInfo.inviteCode!); toast.success('Код көшірілді!'); }}>
              <Copy size={16} /> Көшіру
            </Button>
          </div>
        </Card>
      )}

      <div className="grid-layout-sidebar">
        {/* Left Col: Students List */}
        <div>
          <Card padding="md">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Оқушылар тізімі ({students.length})</h2>
            
            {students.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {students.map((student, idx) => (
                  <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--bg-primary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{student.name}</div>
                        {student.email && <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{student.email}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <Users size={40} style={{ margin: '0 auto var(--space-3)' }} />
                <p>Бұл сыныпта әзірге оқушылар жоқ.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Add Student Form */}
        <div>
          <Card padding="lg">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Оқушы қосу</h3>
            <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                  Толық аты-жөні
                </label>
                <input 
                  type="text" 
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  placeholder="Оқушының атын енгізіңіз"
                  style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  required
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                  Email (міндетті емес)
                </label>
                <input 
                  type="email" 
                  value={newStudentEmail}
                  onChange={e => setNewStudentEmail(e.target.value)}
                  placeholder="student@mail.com"
                  style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
              </div>

              <Button type="submit" variant="primary" fullWidth disabled={isAdding}>
                {isAdding ? <Loader size={16} className="spin" /> : <><Plus size={16} /> Қосу</>}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
