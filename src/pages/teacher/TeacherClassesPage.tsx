import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Loader, BookOpen, KeyRound } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { createClass } from '../../services/classes';
import type { SchoolClass } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { CLASS_NUMBERS, CLASS_LETTERS } from '../../lib/constants';

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [classNum, setClassNum] = useState<number | ''>('');
  const [classLetter, setClassLetter] = useState<string>('');

  useEffect(() => {
    if (!db || !user?.id) return;

    setLoading(true);
    const q = query(collection(db, 'classes'), where("teacherId", "==", user.id));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const classesData: SchoolClass[] = [];
      querySnapshot.forEach((doc) => {
        classesData.push({ id: doc.id, ...doc.data() } as SchoolClass);
      });
      setClasses(classesData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync classes", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNum || !classLetter || !user) return;
    
    const finalClassName = `${classNum} "${classLetter}"`;
    
    try {
      setIsCreating(true);
      await createClass(user.id, finalClassName);
      setClassNum('');
      setClassLetter('');
      toast.success(`Сынып "${finalClassName}" сәтті қосылды!`);
    } catch (error) {
      console.error("Failed to create class", error);
      toast.error("Сынып қосу кезінде қате пайда болды.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Мұғалім', path: '/teacher' },
        { label: 'Сыныптар' },
      ]}
    >
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          Сыныптарды басқару
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Жаңа сыныптар қосыңыз және оқушыларды инвайт-код арқылы шақырыңыз.
        </p>
      </div>

      <div className="grid-layout-sidebar">
        {/* Left Col: Classes */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Сыныптар тізімі ({classes.length})</h2>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <Loader className="spin" />
            </div>
          ) : classes.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              {classes.map(c => (
                <Card key={c.id} variant="hover">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <div style={{ padding: 'var(--space-2)', background: 'var(--accent-primary-light)', borderRadius: 'var(--border-radius-md)', color: 'var(--accent-primary)' }}>
                      <BookOpen size={20} />
                    </div>
                    <h3 style={{ fontWeight: 600 }}>{c.name} сыныбы</h3>
                  </div>
                  
                  {c.inviteCode && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', border: '1px dashed var(--accent-primary)' }}>
                      <KeyRound size={12} style={{ color: 'var(--accent-primary)' }} />
                      <span>Инвайт-код: <strong>{c.inviteCode}</strong></span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <span>Оқушылар: {c.studentsCount || 0}</span>
                    <Link to={`/teacher/classes/${c.id}`} style={{ textDecoration: 'none' }}>
                      <Button variant="ghost" size="sm">Ашу</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card style={{ textAlign: 'center' }}>
              <Users size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--text-tertiary)' }} />
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Сыныптар жоқ</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Оқушыларды қосу үшін алдымен оң жақтағы блоктан сынып жасаңыз.</p>
            </Card>
          )}
        </div>

        {/* Right Col: Create Class */}
        <div>
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Жаңа сынып қосу</h3>
            <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                    Сынып
                  </label>
                  <select 
                    value={classNum}
                    onChange={e => setClassNum(Number(e.target.value) || '')}
                    className="form-input"
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="">Таңдаңыз</option>
                    {CLASS_NUMBERS.map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                    Әріп
                  </label>
                  <select 
                    value={classLetter}
                    onChange={e => setClassLetter(e.target.value)}
                    className="form-input"
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="">Таңдаңыз</option>
                    {CLASS_LETTERS.map(letter => (
                      <option key={letter} value={letter}>{letter}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="submit" variant="primary" fullWidth disabled={isCreating}>
                {isCreating ? <Loader size={16} className="spin" /> : <><Plus size={16} /> Қосу</>}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
