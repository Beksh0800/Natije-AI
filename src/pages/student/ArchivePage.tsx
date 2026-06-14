// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive, FileText, Bot, Loader
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import type { Submission } from '../../types';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { STATUS_MAP, ASSIGNMENT_TYPES } from '../../lib/constants';
import { formatDate } from '../../lib/utils';
import './ArchivePage.css';

export default function ArchivePage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
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
  }, [studentDocIds, user]);

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Менің тапсырмаларым', path: '/assignments' },
      ]}
    >
      <div className="archive-page">
        {/* Header */}
        <div className="archive-header">
          <h1 className="archive-title">
            <Archive size={24} /> Менің жұмыстарым
          </h1>
          <p className="archive-description">
            Мұғалім жүктеген барлық жұмыстарыңыз бен AI бағалау нәтижелері осында сақталады.
          </p>
        </div>

        {/* Grid: Table + Sidebar */}
        <div className="archive-grid">
          {/* Table */}
          <div className="archive-table-wrapper">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                <Loader className="spin" size={32} />
              </div>
            ) : (
              <>
                <table className="archive-table">
                  <thead>
                    <tr>
                      <th>Тапсырма атауы</th>
                      <th>Пән</th>
                      <th>Күні</th>
                      <th>Статус</th>
                      <th>Түрі</th>
                      <th>Әрекет</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.length > 0 ? submissions.map((sub) => (
                      <tr key={sub.id}>
                        <td>
                          <div className="archive-table-title">
                            <div className={`archive-table-icon archive-table-icon-${ASSIGNMENT_TYPES[sub.type]?.color || 'gray'}`}>
                              <FileText size={16} />
                            </div>
                            <div className="archive-table-name">
                              <h4>{sub.title}</h4>
                            </div>
                          </div>
                        </td>
                        <td>{sub.subject}</td>
                        <td>{formatDate(sub.createdAt)}</td>
                        <td>
                          <StatusBadge 
                            status={sub.status === 'error' ? 'error' : sub.status === 'reviewed' ? 'success' : sub.status === 'pending_teacher_review' ? 'warning' : 'info'} 
                            label={STATUS_MAP[sub.status]?.label || sub.status} 
                          />
                        </td>
                        <td>
                          <Badge color={ASSIGNMENT_TYPES[sub.type]?.color as any || 'gray'} filled>
                            {ASSIGNMENT_TYPES[sub.type]?.label || sub.type}
                          </Badge>
                        </td>
                        <td>
                          <Link to={`/assignments/${sub.id}`} className="archive-action-btn" style={{ textDecoration: 'none' }}>
                            Ашу
                          </Link>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-tertiary)' }}>
                          Жүктелген тапсырмалар әлі жоқ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="archive-sidebar">
            {/* AI Widget */}
            <div className="archive-ai-widget">
              <h3 className="archive-sidebar-title">AI көмекші</h3>
              <div className="archive-ai-icon">
                <Bot size={28} />
              </div>
              <p className="archive-ai-text">
                Жұмыстарыңыздың нәтижесін талдап, сізге қателермен жұмыс істеуге көмектесемін!
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
