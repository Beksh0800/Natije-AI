import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Loader, BookOpen } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { createClass } from '../../services/classes';
import type { SchoolClass } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    if (!db || !user?.id) return;

    setLoading(true);
    const q = query(collection(db, 'classes'), where("teacherId", "==", user.id));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const classesData: SchoolClass[] = [];
      querySnapshot.forEach((doc) => {
        classesData.push({ id: doc.id, ...doc.data() } as SchoolClass);
      });
      // Sort by creation time or just default sorting
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

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Мұғалім', path: '/teacher' },
        { label: 'Басты бет' },
      ]}
    >
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          Қош келдіңіз, {user?.name}!
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Бұл сіздің басқару панеліңіз. Сыныптарды қосып, оқушылардың жұмыстарын тексеріңіз.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-6)' }}>
        {/* Left Col: Classes */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Менің сыныптарым</h2>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <Loader className="spin" />
            </div>
          ) : classes.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              {classes.map(c => (
                <Card key={c.id} variant="hover" padding="md">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <div style={{ padding: 'var(--space-2)', background: 'var(--accent-primary-light)', borderRadius: 'var(--border-radius-md)', color: 'var(--accent-primary)' }}>
                      <BookOpen size={20} />
                    </div>
                    <h3 style={{ fontWeight: 600 }}>{c.name}</h3>
                  </div>
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
            <Card padding="xl" style={{ textAlign: 'center' }}>
              <Users size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--text-tertiary)' }} />
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Сыныптар жоқ</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Оқушыларды қосу үшін алдымен сынып жасаңыз.</p>
            </Card>
          )}
        </div>

        {/* Right Col: Create Class */}
        <div>
          <Card padding="lg">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Жаңа сынып қосу</h3>
            <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                  Сынып атауы (мысалы, 5 "А")
                </label>
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder="Сынып атауын енгізіңіз"
                  style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  required
                />
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
