import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen, FileText, Star, CircleAlert, Bot, ArrowLeft, Loader
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Badge from '../../components/ui/Badge';
import CircularProgress from '../../components/ui/CircularProgress';
import { db } from '../../lib/firebase';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Submission, Review } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { STATUS_MAP } from '../../lib/constants';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !id) return;

    setLoading(true);

    // 1. Listen to submission doc
    const subRef = doc(db, 'submissions', id);
    const unsubscribeSub = onSnapshot(subRef, (docSnap) => {
      if (docSnap.exists()) {
        setSubmission({ id: docSnap.id, ...docSnap.data() } as Submission);
      }
    });

    // 2. Listen to reviews for this submission
    const reviewsQuery = query(collection(db, 'reviews'), where("submissionId", "==", id));
    const unsubscribeReviews = onSnapshot(reviewsQuery, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        setReview({ id: docSnap.id, ...docSnap.data() } as Review);
      } else {
        setReview(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync review data", error);
      setLoading(false);
    });

    return () => {
      unsubscribeSub();
      unsubscribeReviews();
    };
  }, [id]);

  if (loading) {
    return (
      <MainLayout breadcrumbs={[{ label: 'Жүктелуде...' }]}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <Loader className="spin" size={32} />
        </div>
      </MainLayout>
    );
  }

  if (!submission) {
    return (
      <MainLayout breadcrumbs={[{ label: 'Қате' }]}>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <h2>Тапсырма табылмады</h2>
          <Link to="/assignments" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Тізімге қайту</Link>
        </div>
      </MainLayout>
    );
  }

  const isParent = user?.role === 'parent';
  const backPath = isParent ? '/parent' : '/assignments';
  const backLabel = isParent ? 'Ата-ана кабинеті' : 'Менің тапсырмаларым';

  return (
    <MainLayout
      breadcrumbs={[
        { label: backLabel, path: backPath },
        { label: submission.title },
      ]}
    >
      <Link to={backPath} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '16px', fontSize: '0.875rem' }}>
        <ArrowLeft size={16} /> Тізімге қайту
      </Link>

      {/* Page Title */}
      <div className="page-title-section">
        <h1 className="page-title">
          Тапсырма: {submission.title}
          <Badge color="blue">
            <BookOpen size={12} /> {submission.subject}
          </Badge>
        </h1>
        <div className="page-meta">
          <span className="page-meta-item">
            Жүкетелген күні: {new Date((submission.createdAt as any)?.toDate?.() || Date.now()).toLocaleDateString('kk-KZ')}
          </span>
          <span className="page-meta-item">
            Статус: {STATUS_MAP[submission.status]?.label || submission.status}
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="dashboard-main">
          
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Сіздің жүктеген файлыңыз</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{submission.fileName}</div>
                  <a href={submission.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>Ашу / Көру</a>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Teacher Review State */}
          {submission.status === 'pending_teacher_review' && (
            <div className="card" style={{ marginTop: '24px', textAlign: 'center', padding: '40px 20px', border: '2px dashed var(--color-warning)' }}>
              <div style={{ background: 'var(--bg-secondary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Bot size={32} style={{ color: 'var(--color-warning)' }} />
              </div>
              <h3 style={{ marginBottom: '8px' }}>AI талдауы аяқталды, мұғалім тексеруінде</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Жасанды интеллект жұмысыңызды тексерді. Қазір мұғалім нәтижені растап жатыр. Күте тұрыңыз!</p>
            </div>
          )}

          {/* AI Analysis View (Only if reviewed) */}
          {submission.status === 'reviewed' && review ? (
            <div className="card" style={{ marginTop: '24px' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <Bot size={24} style={{ color: 'var(--accent-primary)' }} />
                <h2 className="card-title" style={{ margin: 0 }}>AI Көмекшінің Талдауы және Мұғалім пікірі</h2>
              </div>
              
              <div className="card-body">
                {submission.teacherComment && (
                  <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--accent-primary-light)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--accent-primary)' }}>Мұғалім пікірі:</h3>
                    <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                      {submission.teacherComment}
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>AI пікірі:</h3>
                  <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                    {review.feedback}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Mistakes */}
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CircleAlert size={16} /> Қателер ({review.mistakes?.length || 0})
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {review.mistakes?.map((m, i) => (
                        <li key={i} style={{ fontSize: '0.875rem', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', borderLeft: '3px solid var(--color-error)' }}>
                          <strong>{m.type}:</strong> {m.description}
                        </li>
                      ))}
                      {(!review.mistakes || review.mistakes.length === 0) && (
                        <li style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Қателер табылмады!</li>
                      )}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Star size={16} /> Ұсыныстар
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {review.recommendations?.map((r, i) => (
                        <li key={i} style={{ fontSize: '0.875rem', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', borderLeft: '3px solid var(--color-warning)' }}>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : submission.status !== 'pending_teacher_review' && (
            <div className="card" style={{ marginTop: '24px', textAlign: 'center', padding: '40px 20px' }}>
              <Loader size={32} className="spin" style={{ margin: '0 auto 16px', color: 'var(--accent-primary)' }} />
              <h3 style={{ marginBottom: '8px' }}>Жұмыс тексерілуде...</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Мұғалім немесе AI жұмысыңызды тексерген соң, нәтиже осында пайда болады.</p>
            </div>
          )}

        </div>

        {/* Right Sidebar (Score) */}
        <div className="dashboard-sidebar">
          {submission.status === 'reviewed' ? (
            <div className="card score-card">
              <h2 className="score-title">Қорытынды баға</h2>
              <div className="score-circle-wrapper">
                <CircularProgress 
                  value={submission.score || 0} 
                  size={140} 
                  strokeWidth={12} 
                />
                <div className="score-text-overlay">
                  <span className="score-main-value">{submission.score || 0}</span>
                  <span className="score-max-value">/ {review?.maxScore || 100}</span>
                </div>
              </div>
              <p className="score-verdict">
                {(submission.score || 0) >= 85 ? 'Жарайсың! Өте жақсы жұмыс.' : (submission.score || 0) >= 60 ? 'Жақсы, бірақ қателермен жұмыс істеу керек.' : 'Тақырыпты қайталап оқу керек.'}
              </p>
            </div>
          ) : (
            <div className="card score-card">
              <h2 className="score-title">Сіздің бағаңыз</h2>
              <div className="score-circle-wrapper">
                <CircularProgress value={0} size={140} strokeWidth={12} />
                <div className="score-text-overlay">
                  <span className="score-main-value">-</span>
                </div>
              </div>
              <p className="score-verdict" style={{ color: 'var(--text-secondary)' }}>Әлі бағаланбаған</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
