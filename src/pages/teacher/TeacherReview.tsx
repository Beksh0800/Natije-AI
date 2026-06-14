// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Bot, FileText, Calendar,
  Award, Check, AlertCircle, Lightbulb, RefreshCw, Loader
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { db } from '../../lib/firebase';
import { doc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { createReview } from '../../services/reviews';
import { analyzeWork } from '../../services/ai';
import { STATUS_MAP } from '../../lib/constants';
import type { Submission, Review } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import './TeacherReview.css';

export default function TeacherReview() {
  const { id } = useParams();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [finalScore, setFinalScore] = useState<number | ''>('');
  const [teacherComment, setTeacherComment] = useState('');
  
  const toast = useToast();

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

    // 2. Listen to review for this submission
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
      unsubscribeReviews();
    };
  }, [id]);

  useEffect(() => {
    if (review && finalScore === '') {
      setFinalScore(review.score);
    }
  }, [review]);

  const handleAnalyze = async () => {
    if (!submission) return;
    try {
      setIsAnalyzing(true);
      setErrorMsg('');
      
      // Call OpenRouter
      const aiResult = await analyzeWork(submission.fileUrl, submission.subject, submission.title);
      
      // Save to Firestore
      await createReview(submission.id, aiResult);
      
      toast.success(`AI талдауы аяқталды! Баға: ${aiResult.score}/100`);
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      // error.message is already a user-friendly Kazakh message from ai.ts
      const msg = error.message || "AI талдауы кезінде белгісіз қате пайда болды.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!submission) return;
    try {
      setIsAnalyzing(true);
      const submissionRef = doc(db, 'submissions', submission.id);
      await updateDoc(submissionRef, {
        status: 'reviewed',
        score: Number(finalScore) || 0,
        teacherComment
      });
      toast.success('Баға мен пікір сәтті сақталды және оқушыға жіберілді!');
    } catch (error) {
      console.error("Failed to confirm review", error);
      toast.error('Сақтау кезінде қате шықты.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <MainLayout breadcrumbs={[{ label: 'Мұғалім', path: '/teacher' }, { label: 'Жүктелуде...' }]}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <Loader className="spin" size={32} />
        </div>
      </MainLayout>
    );
  }

  if (!submission) {
    return (
      <MainLayout breadcrumbs={[{ label: 'Мұғалім', path: '/teacher' }, { label: 'Қате' }]}>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <h2>Тапсырма табылмады</h2>
          <Link to="/teacher/assignments" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Артқа қайту</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Тапсырмалар тізіміне қайту', path: '/teacher/assignments' },
      ]}
    >
      <Link to="/teacher/assignments" className="back-link" style={{ textDecoration: 'none' }}>
        <ArrowLeft size={16} /> Тапсырмалар тізіміне қайту
      </Link>

      <div className="review-header">
        <div className="review-title-group">
          <h1 className="review-title">{submission.title}</h1>
          <StatusBadge 
            status={submission.status === 'error' ? 'error' : submission.status === 'reviewed' ? 'success' : submission.status === 'pending_teacher_review' ? 'warning' : 'info'} 
            label={STATUS_MAP[submission.status]?.label || 'Жаңа тапсырма'} 
          />
        </div>
      </div>

      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
        Пән: {submission.subject}
      </p>

      {/* Info Chips */}
      <div className="info-chips">
        <div className="info-chip">
          <Calendar size={14} className="info-chip-icon" />
          Жүктелген күні
          <span className="info-chip-label">
            {new Date((submission.createdAt as any)?.toDate?.() || Date.now()).toLocaleDateString('kk-KZ')}
          </span>
        </div>
        <div className="info-chip">
          <Award size={14} className="info-chip-icon" />
          Размер
          <span className="info-chip-label">{submission.fileSize}</span>
        </div>
      </div>

      {/* File & Analyze Action */}
      <div className="review-file" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="review-file-icon">
            <FileText size={18} />
          </div>
          <div>
            <div className="review-file-name">{submission.fileName}</div>
            <a href={submission.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>
              Файлды ашу
            </a>
          </div>
        </div>
        
        {(submission.status === 'uploaded' || submission.status === 'error') && (
          <div className="review-file-actions">
            {errorMsg && <div style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginRight: '16px' }}>{errorMsg}</div>}
            <Button variant="primary" onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? <><Loader size={16} className="spin" /> AI Талдау жүріп жатыр...</> : <><Bot size={16} /> AI Проверка</>}
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid: Show only if reviewed */}
      {review && (
        <div className="teacher-review">
          <div>
            {/* AI Analysis Card */}
            <div className="review-ai-card">
              <h2 className="review-ai-header">
                <Bot size={18} /> AI талдауы
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Тапсырма жасанды интеллект (GPT-4o) арқылы талданды
              </p>

              <div className="review-ai-grid">
                {/* Score */}
                <div className="review-score-block">
                  <div className="review-score-label">Алдын ала баға (AI)</div>
                  <div>
                    <span className="review-score-value">{review.score}</span>
                    <span className="review-score-max"> /{review.maxScore || 100}</span>
                  </div>
                  <div className="review-score-verdict">
                    {review.score >= 85 ? 'Жақсы жұмыс!' : review.score >= 60 ? 'Орташа' : 'Көбірек дайындалу керек'}
                  </div>
                </div>

                {/* Feedback Text */}
                <div style={{ gridColumn: 'span 2' }}>
                  <div className="review-score-label" style={{ marginBottom: '12px' }}>Кері байланыс</div>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                    {review.feedback}
                  </p>
                </div>

                {/* Mistakes */}
                <div style={{ gridColumn: 'span 3', marginTop: '16px' }}>
                  <div className="review-score-label" style={{ marginBottom: '12px' }}>Категлер мен ескертулер</div>
                  {review.mistakes && review.mistakes.length > 0 ? (
                    <div className="review-mistakes">
                      {review.mistakes.map((m, i) => (
                        <div key={i} className="review-mistake-item">
                          <AlertCircle size={14} className="review-mistake-bullet" />
                          <span><strong>{m.type}:</strong> {m.description}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Қателер табылмады.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Strengths + Recommendations */}
            <div className="review-two-cols">
              <div className="review-section-card">
                <h3 className="review-section-title">
                  <span style={{ color: 'var(--color-success)' }}>🌟</span> Жақсы жақтары
                </h3>
                <div className="review-section-list">
                  {review.strengths?.map((s, i) => (
                    <div key={i} className="review-section-item">
                      <Check size={14} className="review-section-item-icon" style={{ color: 'var(--color-success)' }} />
                      <span>{s}</span>
                    </div>
                  ))}
                  {(!review.strengths || review.strengths.length === 0) && (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Жоқ</span>
                  )}
                </div>
              </div>

              <div className="review-section-card">
                <h3 className="review-section-title">
                  <span style={{ color: 'var(--color-warning)' }}>💡</span> Жақсарту бойынша ұсыныстар
                </h3>
                <div className="review-section-list">
                  {review.recommendations?.map((r, i) => (
                    <div key={i} className="review-section-item">
                      <Lightbulb size={14} className="review-section-item-icon" style={{ color: 'var(--color-warning)' }} />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Teacher Confirmation Panel */}
            {submission.status === 'pending_teacher_review' && (
              <div className="review-ai-card" style={{ marginTop: '24px', border: '2px solid var(--color-warning)' }}>
                <h3 className="review-section-title" style={{ marginBottom: '16px' }}>
                  Қорытынды баға және пікір
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  AI берген бағаны тексеріп, қажет болса өзгертіңіз. Өз пікіріңізді қалдыра аласыз. Бұл деректер оқушыға жіберіледі.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>Қорытынды балл</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ width: '100%', fontSize: '1.25rem', fontWeight: 'bold' }}
                      value={finalScore}
                      onChange={e => setFinalScore(e.target.value ? Number(e.target.value) : '')}
                      min="0" max="100"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>Мұғалім пікірі (міндетті емес)</label>
                    <textarea 
                      className="form-input" 
                      style={{ width: '100%', height: '80px', resize: 'vertical' }}
                      placeholder="Оқушыға қосымша кеңес немесе ескерту жазыңыз..."
                      value={teacherComment}
                      onChange={e => setTeacherComment(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" onClick={handleConfirm} disabled={isAnalyzing}>
                    {isAnalyzing ? <Loader size={16} className="spin" /> : <><Check size={16} /> Растау және оқушыға жіберу</>}
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="review-actions">
              <Button variant="outline" size="lg" icon={<RefreshCw size={16} />} onClick={handleAnalyze} disabled={isAnalyzing}>
                Қайта талдау (AI)
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
