import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bot, FileText, Calendar, Users,
  Award, Check, AlertCircle, Lightbulb, Loader, Trash2, Edit, Save, X
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import { db } from '../../lib/firebase';
import { doc, collection, query, where, onSnapshot, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { createNotification } from '../../services/notifications';
import { createReview } from '../../services/reviews';
import { analyzeWork } from '../../services/ai';
import { STATUS_MAP } from '../../lib/constants';
import type { Submission, Review, Student, Solution } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import './TeacherReview.css';

export default function TeacherReview() {
  const { id } = useParams();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [finalScore, setFinalScore] = useState<number | ''>('');
  const [teacherComment, setTeacherComment] = useState('');
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editMaxAttempts, setEditMaxAttempts] = useState(3);

  const startEdit = () => {
    if (!submission) return;
    setEditTitle(submission.title);
    setEditDueDate(submission.dueDate || '');
    setEditMaxAttempts(submission.maxAttempts || 3);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!submission || !id) return;
    try {
      await updateDoc(doc(db, 'submissions', id), {
        title: editTitle,
        dueDate: editDueDate,
        maxAttempts: editMaxAttempts
      });
      toast.success('Тапсырма жаңартылды!');
      setIsEditing(false);
    } catch(err) {
      toast.error('Қате шықты.');
    }
  };

  const handleDeleteAssignment = async () => {
    if (!submission || !id) return;
    if (confirm("Бұл тапсырманы және оған қатысты барлық шешімдерді өшіргіңіз келетініне сенімдісіз бе?")) {
      try {
        await deleteDoc(doc(db, 'submissions', id));
        const solQ = query(collection(db, 'solutions'), where('assignmentId', '==', id));
        const solSnap = await getDocs(solQ);
        const delPromises = solSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(delPromises);
        toast.success('Тапсырма өшірілді.');
        navigate('/teacher/assignments');
      } catch(err) {
        toast.error('Қате шықты.');
      }
    }
  };

  
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  
  const toast = useToast();

  useEffect(() => {
    if (!db || !id) return;

    setLoading(true);

    const subRef = doc(db, 'submissions', id);
    const unsubscribeSub = onSnapshot(subRef, (docSnap) => {
      if (docSnap.exists()) {
        const subData = { id: docSnap.id, ...docSnap.data() } as Submission;
        setSubmission(subData);
        
        // If it's a class assignment, fetch students and solutions
        if (subData.studentId === 'all' && subData.classId) {
          const studentsQ = query(collection(db, 'students'), where('classId', '==', subData.classId));
          onSnapshot(studentsQ, (snap) => {
             setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
          });
          
          const solutionsQ = query(collection(db, 'solutions'), where('assignmentId', '==', subData.id));
          onSnapshot(solutionsQ, (snap) => {
             setSolutions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Solution)));
          });
          setLoading(false);
        } else {
          // Legacy individual submission
          const reviewsQuery = query(collection(db, 'reviews'), where("submissionId", "==", id));
          onSnapshot(reviewsQuery, (querySnapshot) => {
            if (!querySnapshot.empty) {
              setReview({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Review);
            } else {
              setReview(null);
            }
            setLoading(false);
          });
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeSub();
    };
  }, [id]);

  // When selected solution changes, load its review
  useEffect(() => {
    if (!selectedSolution) {
      if (submission?.studentId !== 'all') {
         // keep submission review
      } else {
         setReview(null);
      }
      return;
    }
    
    setReview(null);
    const reviewsQuery = query(collection(db, 'reviews'), where("solutionId", "==", selectedSolution.id));
    const unsubscribe = onSnapshot(reviewsQuery, (querySnapshot) => {
      if (!querySnapshot.empty) {
        setReview({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Review);
      }
    });
    return () => unsubscribe();
  }, [selectedSolution, submission]);

  useEffect(() => {
    if (review && finalScore === '') {
      setFinalScore(review.score);
    }
  }, [review]);

  const handleAnalyzeLegacy = async () => {
    if (!submission) return;
    try {
      setIsAnalyzing(true);
      setErrorMsg('');
      const aiResult = await analyzeWork(submission.fileUrl, submission.subject, submission.title);
      await createReview(submission.id, false, aiResult);
      toast.success(`AI талдауы аяқталды! Баға: ${aiResult.score}/100`);
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      const msg = error.message || "AI талдауы кезінде белгісіз қате пайда болды.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmLegacy = async () => {
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

  const handleConfirmSolution = async () => {
    if (!selectedSolution || !submission) return;
    try {
      setIsAnalyzing(true);
      const solutionRef = doc(db, 'solutions', selectedSolution.id);
      await updateDoc(solutionRef, {
        status: 'teacher_graded',
        teacherScore: Number(finalScore) || 0,
        teacherComment
      });
      
      // Notify student
      await createNotification({
        userId: submission.studentId,
        title: 'Жұмыс бағаланды',
        message: `${submission.title} жұмысыңыз мұғаліммен бағаланды: ${finalScore} балл`,
        type: 'grade',
        link: `/assignments/${submission.id}`
      });

      toast.success('Оқушының бағасы сақталды!');
      setSelectedSolution(null);
      setFinalScore('');
      setTeacherComment('');
    } catch (error) {
      console.error("Failed to save solution grade", error);
      toast.error('Қате шықты.');
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

  const isClassAssignment = submission.studentId === 'all';

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Тапсырмалар тізіміне қайту', path: '/teacher/assignments' },
      ]}
    >
      <Link to="/teacher/assignments" className="back-link" style={{ textDecoration: 'none' }}>
        <ArrowLeft size={16} /> Тапсырмалар тізіміне қайту
      </Link>

      <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="review-title-group" style={{ flex: 1 }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Тақырыбы" />
              <div style={{ display: 'flex', gap: '12px' }}>
                <div>
                   <label style={{ fontSize: '0.75rem' }}>Дедлайн</label>
                   <input className="form-input" type="datetime-local" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
                </div>
                <div>
                   <label style={{ fontSize: '0.75rem' }}>Мүмкіндіктер</label>
                   <input className="form-input" type="number" min="1" value={editMaxAttempts} onChange={e => setEditMaxAttempts(Number(e.target.value))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="sm" variant="primary" onClick={saveEdit}><Save size={14}/> Сақтау</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}><X size={14}/> Болдырмау</Button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 className="review-title">{submission.title}</h1>
                <StatusBadge 
                  status={submission.status === 'error' ? 'error' : submission.status === 'reviewed' ? 'success' : submission.status === 'pending_teacher_review' ? 'warning' : 'info'} 
                  label={isClassAssignment ? 'Жалпы тапсырма' : (STATUS_MAP[submission.status]?.label || 'Жаңа тапсырма')} 
                />
              </div>
            </>
          )}
        </div>
        
        {!isEditing && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={startEdit} style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit size={14}/> Өңдеу
            </button>
            <button onClick={handleDeleteAssignment} style={{ background: 'transparent', border: '1px solid var(--color-error)', color: 'var(--color-error)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trash2 size={14}/> Өшіру
            </button>
          </div>
        )}
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
        {submission.dueDate && (
          <div className="info-chip" style={{ color: 'var(--color-warning)' }}>
            <Calendar size={14} className="info-chip-icon" />
            Дедлайн
            <span className="info-chip-label">
              {new Date(submission.dueDate).toLocaleString('kk-KZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        {!isClassAssignment && (
          <div className="info-chip">
            <Award size={14} className="info-chip-icon" />
            Көлемі
            <span className="info-chip-label">{submission.fileSize}</span>
          </div>
        )}
      </div>

      {/* File Action */}
      <div className="review-file" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="review-file-icon">
            <FileText size={18} />
          </div>
          <div>
            <div className="review-file-name">{submission.fileName}</div>
            <a href={submission.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>
              Тапсырманы ашу
            </a>
          </div>
        </div>
        
        {!isClassAssignment && (submission.status === 'uploaded' || submission.status === 'error') && (
          <div className="review-file-actions">
            {errorMsg && <div style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginRight: '16px' }}>{errorMsg}</div>}
            <Button variant="primary" onClick={handleAnalyzeLegacy} disabled={isAnalyzing}>
              {isAnalyzing ? <><Loader size={16} className="spin" /> AI Талдау жүріп жатыр...</> : <><Bot size={16} /> AI Проверка</>}
            </Button>
          </div>
        )}
      </div>

      {/* CLASS ASSIGNMENT VIEW */}
      {isClassAssignment && !selectedSolution && (
        <div className="teacher-review">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} /> Сынып оқушыларының шешімдері
          </h2>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '16px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Оқушы</th>
                  <th style={{ padding: '16px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Статус</th>
                  <th style={{ padding: '16px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', width: '120px', whiteSpace: 'nowrap' }}>Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const studentSols = solutions.filter(s => 
                    s.studentId === student.id || 
                    (student.studentId && s.studentId === student.studentId) ||
                    (s.studentEmail && s.studentEmail === student.email)
                  ).sort((a,b) => b.iteration - a.iteration);
                  const latestSol = studentSols[0];
                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px', fontWeight: 500 }}>{student.name}</td>
                      <td style={{ padding: '16px' }}>
                        {latestSol ? (
                           <Badge color={latestSol.status === 'teacher_graded' ? 'green' : 'yellow'} filled>
                             {latestSol.status === 'teacher_graded' ? `Бағаланды (${latestSol.teacherScore})` : 'Тексеруді қажет етеді'}
                           </Badge>
                        ) : (
                           <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Тапсырмаған</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                        {latestSol && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedSolution(latestSol)}>
                            Тексеру
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SELECTED SOLUTION VIEW */}
      {selectedSolution && (
        <div className="teacher-review">
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
             <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Оқушы шешімін тексеру</h2>
             <Button variant="outline" onClick={() => setSelectedSolution(null)}>Тізімге қайту</Button>
           </div>
           
           <div className="review-file" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               <div className="review-file-icon">
                 <FileText size={18} />
               </div>
               <div>
                 <div className="review-file-name">{selectedSolution.fileName}</div>
                 <a href={selectedSolution.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                   Шешімді ашу
                 </a>
               </div>
             </div>
           </div>

           {review ? (
             <ReviewPanel 
               review={review} 
               finalScore={finalScore} 
               setFinalScore={setFinalScore} 
               teacherComment={teacherComment} 
               setTeacherComment={setTeacherComment} 
               handleConfirm={handleConfirmSolution} 
               isAnalyzing={isAnalyzing} 
             />
           ) : (
             <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
               <Loader size={24} className="spin" style={{ margin: '0 auto 16px', color: 'var(--accent-primary)' }} />
               <p>AI талдауы күтілуде...</p>
             </div>
           )}
        </div>
      )}

      {/* LEGACY INDIVIDUAL SUBMISSION VIEW */}
      {!isClassAssignment && review && (
         <ReviewPanel 
           review={review} 
           finalScore={finalScore} 
           setFinalScore={setFinalScore} 
           teacherComment={teacherComment} 
           setTeacherComment={setTeacherComment} 
           handleConfirm={handleConfirmLegacy} 
           isAnalyzing={isAnalyzing} 
         />
      )}
    </MainLayout>
  );
}

function ReviewPanel({ review, finalScore, setFinalScore, teacherComment, setTeacherComment, handleConfirm, isAnalyzing }: any) {
  return (
    <>
      <div className="review-ai-card">
        <h2 className="review-ai-header">
          <Bot size={18} /> AI талдауы
        </h2>
        <div className="review-ai-grid">
          <div className="review-score-block">
            <div className="review-score-label">Алдын ала баға (AI)</div>
            <div>
              <span className="review-score-value">{review.score}</span>
              <span className="review-score-max"> /{review.maxScore || 100}</span>
            </div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div className="review-score-label" style={{ marginBottom: '12px' }}>Кері байланыс</div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>{review.feedback}</p>
          </div>
          <div style={{ gridColumn: 'span 3', marginTop: '16px' }}>
            <div className="review-score-label" style={{ marginBottom: '12px' }}>Категлер мен ескертулер</div>
            {review.mistakes && review.mistakes.length > 0 ? (
              <div className="review-mistakes">
                {review.mistakes.map((m: any, i: number) => (
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

      <div className="review-two-cols" style={{ marginTop: '24px' }}>
        <div className="review-section-card">
          <h3 className="review-section-title"><span style={{ color: 'var(--color-success)' }}>🌟</span> Жақсы жақтары</h3>
          <div className="review-section-list">
            {review.strengths?.map((s: any, i: number) => (
              <div key={i} className="review-section-item">
                <Check size={14} className="review-section-item-icon" style={{ color: 'var(--color-success)' }} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="review-section-card">
          <h3 className="review-section-title"><span style={{ color: 'var(--color-warning)' }}>💡</span> Жақсарту бойынша ұсыныстар</h3>
          <div className="review-section-list">
            {review.recommendations?.map((r: any, i: number) => (
              <div key={i} className="review-section-item">
                <Lightbulb size={14} className="review-section-item-icon" style={{ color: 'var(--color-warning)' }} />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="review-ai-card" style={{ marginTop: '24px', border: '2px solid var(--color-warning)' }}>
        <h3 className="review-section-title" style={{ marginBottom: '16px' }}>Қорытынды баға және пікір</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'start' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>Балл (0-100)</label>
            <input 
              type="number" 
              value={finalScore} 
              onChange={(e) => setFinalScore(e.target.value ? Number(e.target.value) : '')}
              min="0" max="100"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>Пікіріңіз</label>
            <textarea 
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
              placeholder="Оқушыға арналған қорытынды пікіріңізді жазыңыз..."
              rows={3}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none', resize: 'vertical' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <Button variant="primary" onClick={handleConfirm} disabled={isAnalyzing}>
            {isAnalyzing ? <><Loader size={16} className="spin" /> Сақталуда...</> : 'Бағаны бекіту'}
          </Button>
        </div>
      </div>
    </>
  );
}
