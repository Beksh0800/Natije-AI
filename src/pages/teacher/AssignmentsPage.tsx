import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Loader, Search } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Submission } from '../../types';
import { STATUS_MAP } from '../../lib/constants';

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user?.id) return;

    setLoading(true);
    const q = query(collection(db, 'submissions'), where("teacherId", "==", user.id));
    
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
      console.error("Failed to sync submissions", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const map = STATUS_MAP[status];
    if (!map) return <Badge color="gray">{status}</Badge>;
    return <Badge color={map.color as any} filled>{map.label}</Badge>;
  };

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Мұғалім', path: '/teacher' },
        { label: 'Тапсырмалар' },
      ]}
    >
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.5rem', fontWeight: 700 }}>Оқушылардың жұмыстары</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Барлық жүктелген тапсырмалар тізімі</p>
        </div>
      </div>

      <Card padding="md">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <Loader className="spin" />
          </div>
        ) : submissions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: 'var(--space-3)' }}>Тақырып</th>
                  <th style={{ padding: 'var(--space-3)' }}>Пән</th>
                  <th style={{ padding: 'var(--space-3)' }}>Файл</th>
                  <th style={{ padding: 'var(--space-3)' }}>Статус</th>
                  <th style={{ padding: 'var(--space-3)' }}>Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 'var(--space-3)', fontWeight: 500 }}>{sub.title}</td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>{sub.subject}</td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} /> {sub.fileName}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-3)' }}>{getStatusBadge(sub.status)}</td>
                    <td style={{ padding: 'var(--space-3)' }}>
                      <Link to={`/teacher/assignments/${sub.id}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
                        Ашу
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <Search size={40} style={{ margin: '0 auto var(--space-3)' }} />
            <p>Жүктелген тапсырмалар табылмады.</p>
          </div>
        )}
      </Card>
    </MainLayout>
  );
}
