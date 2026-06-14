import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen, FileText, Star, CircleAlert, Bot, ArrowLeft, Loader, Upload, Edit2
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import CircularProgress from '../../components/ui/CircularProgress';
import { db } from '../../lib/firebase';
import { doc, collection, query, where, onSnapshot, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { uploadFileToFirebase } from '../../services/storage';
import { analyzeWork } from '../../services/ai';
import { createReview } from '../../services/reviews';
import type { Submission, Review, Solution } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { STATUS_MAP } from '../../lib/constants';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!db || !id || !user?.id) return;

    setLoading(true);

    const subRef = doc(db, 'submissions', id);
    const unsubscribeSub = onSnapshot(subRef, (docSnap) => {
      if (docSnap.exists()) {
        setSubmission({ id: docSnap.id, ...docSnap.data() } as Submission);
      }
    });

    const solQuery = query(
      collection(db, 'solutions'), 
      where("assignmentId", "==", id),
      where("studentId", "==", user.id)
    );
    
    const unsubscribeSol = onSnapshot(solQuery, (querySnapshot) => {
      if (!querySnapshot.empty) {
        let latestSol = querySnapshot.docs[0].data() as Solution;
        latestSol.id = querySnapshot.docs[0].id;
        
        querySnapshot.forEach(docSnap => {
          const s = docSnap.data() as Solution;
          if (s.iteration > latestSol.iteration) {
            latestSol = s;
            latestSol.id = docSnap.id;
          }
        });
        
        setSolution(latestSol);
        
        const reviewsQuery = query(collection(db, 'reviews'), where("solutionId", "==", latestSol.id));
        const unsubscribeReviews = onSnapshot(reviewsQuery, (revSnapshot) => {
          if (!revSnapshot.empty) {
            const revDoc = revSnapshot.docs[0];
            setReview({ id: revDoc.id, ...revDoc.data() } as Review);
          } else {
            setReview(null);
          }
          setLoading(false);
        });
        
        return () => unsubscribeReviews();
      } else {
        setSolution(null);
        setReview(null);
        setLoading(false);
      }
    }, (error) => {
      console.error("Failed to sync solution data", error);
      setLoading(false);
    });

    return () => {
      unsubscribeSub();
      unsubscribeSol();
    };
  }, [id, user?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error("Файл өлшемі тым үлкен. Максималды өлшем: 20 MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUploadSolution = async () => {
    if (!file || !user?.id || !submission?.id) return;
    
    try {
      setIsUploading(true);
      const storageResult = await uploadFileToFirebase(file, 'solutions');
      const mbSize = (file.size / (1024 * 1024)).toFixed(1);
      const fileSizeStr = mbSize === "0.0" ? `${Math.round(file.size / 1024)} KB` : `${mbSize} MB`;

      let docRefId = '';

      if (solution && isEditing) {
        // Update existing solution
        const solRef = doc(db, 'solutions', solution.id);
        await updateDoc(solRef, {
          fileUrl: storageResult.url,
          fileName: file.name,
          fileSize: fileSizeStr,
          status: 'pending_ai',
          iteration: solution.iteration + 1,
          studentEmail: user.email
        });
        docRefId = solution.id;
        toast.success("Шешім сәтті өзгертілді! Жасанды интеллект қайта тексеруде...");
      } else {
        // Create new solution
        const docRef = await addDoc(collection(db, 'solutions'), {
          assignmentId: submission.id,
          studentId: user.id,
          fileUrl: storageResult.url,
          fileName: file.name,
          fileSize: fileSizeStr,
          iteration: 1,
          status: 'pending_ai',
          studentEmail: user.email,
          createdAt: serverTimestamp()
        });
        docRefId = docRef.id;
        toast.success("Шешім сәтті жүктелді! Жасанды интеллект тексеруде...");
      }

      setFile(null);
      setIsUploading(false);
      setIsEditing(false);

      // Run AI analysis asynchronously
      analyzeWork(storageResult.url, submission.subject, submission.title)
        .then(async (aiResult) => {
          await createReview(docRefId, true, aiResult);
          toast.success("Жасанды интеллект шешімді тексерді!");
        })
        .catch(err => {
          console.error("AI Analysis failed:", err);
          toast.error("AI талдауы кезінде қате пайда болды.");
        });

    } catch (err: any) {
      toast.error(err.message || "Жүктеу кезінде қате пайда болды.");
      setIsUploading(false);
    }
  };

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

  let statusText = submission.status === 'uploaded' ? 'Жұмыс барысында' : (STATUS_MAP[submission.status]?.label || submission.status);
  if (solution) {
    if (solution.status === 'pending_ai') statusText = 'Жасанды интеллект тексеруінде';
    else if (solution.status === 'ai_reviewed') statusText = 'Мұғалім тексеруінде';
    else if (solution.status === 'teacher_graded') statusText = 'Бағаланды';
  }

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

      <div className="page-title-section">
        <h1 className="page-title">
          Тапсырма: {submission.title}
          <Badge color="blue">
            <BookOpen size={12} /> {submission.subject}
          </Badge>
        </h1>
        <div className="page-meta">
          <span className="page-meta-item">
            Берілген күні: {new Date((submission.createdAt as any)?.toDate?.() || Date.now()).toLocaleDateString('kk-KZ')}
          </span>
          {submission.dueDate && (
            <span className="page-meta-item" style={{ color: 'var(--color-warning)', fontWeight: 500 }}>
              Дедлайн: {new Date(submission.dueDate).toLocaleString('kk-KZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className="page-meta-item" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            Статус: {statusText}
          </span>
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="dashboard-main">
          
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Тапсырма материалы</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{submission.fileName}</div>
                  <a href={submission.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>Жүктеп алу / Көру</a>
                </div>
              </div>
            </div>
          </div>

          {!solution || isEditing ? (
            <div className="card" style={{ marginTop: '24px' }}>
               <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="card-title">{isEditing ? 'Шешімді қайта жүктеу' : 'Өз шешіміңізді жүктеңіз'}</h2>
                {isEditing && (
                  <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setFile(null); }}>Болдырмау</Button>
                )}
              </div>
              <div className="card-body">
                <div 
                  style={{ 
                    border: '2px dashed var(--border-color)', 
                    borderRadius: 'var(--border-radius-lg)', 
                    padding: 'var(--space-8)', 
                    textAlign: 'center',
                    background: 'var(--bg-secondary)',
                    position: 'relative'
                  }}
                >
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={handleFileChange}
                    style={{ 
                      position: 'absolute', 
                      top: 0, left: 0, width: '100%', height: '100%', 
                      opacity: 0, cursor: 'pointer' 
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Upload size={24} />
                    </div>
                    {file ? (
                      <div>
                        <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{file.name}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Компьютерден файл таңдау</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Max 20 MB (PDF, JPG, PNG)</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleUploadSolution}
                  disabled={!file || isUploading}
                  variant="primary"
                  fullWidth
                  style={{ marginTop: '16px' }}
                >
                  {isUploading ? <><Loader size={18} className="spin"/> Жүктелуде...</> : 'Шешімді жіберу'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginTop: '24px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="card-title">Сіздің жүктеген шешіміңіз</h2>
                {solution.status !== 'teacher_graded' && !isParent && (
                  <Button variant="outline" size="sm" icon={<Edit2 size={16} />} onClick={() => setIsEditing(true)}>
                    Өзгерту
                  </Button>
                )}
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{solution.fileName}</div>
                    <a href={solution.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>Ашу / Көру</a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {solution && solution.status === 'pending_ai' && (
            <div className="card" style={{ marginTop: '24px', textAlign: 'center', padding: '40px 20px', border: '2px dashed var(--color-warning)' }}>
              <Loader size={32} className="spin" style={{ margin: '0 auto 16px', color: 'var(--accent-primary)' }} />
              <h3 style={{ marginBottom: '8px' }}>Шешім тексерілуде...</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Жасанды интеллект жұмысыңызды тексеріп жатыр. Күте тұрыңыз.</p>
            </div>
          )}

          {solution && solution.status === 'ai_reviewed' && !solution.teacherComment && (
             <div className="card" style={{ marginTop: '24px', textAlign: 'center', padding: '40px 20px', border: '2px dashed var(--color-warning)' }}>
              <div style={{ background: 'var(--bg-secondary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Bot size={32} style={{ color: 'var(--color-warning)' }} />
              </div>
              <h3 style={{ marginBottom: '8px' }}>AI талдауы аяқталды, мұғалім тексеруінде</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Жасанды интеллект жұмысыңызды тексерді. Қазір мұғалім нәтижені растап жатыр. Күте тұрыңыз!</p>
            </div>
          )}

          {solution && (solution.status === 'ai_reviewed' || solution.status === 'teacher_graded') && review && (
            <div className="card" style={{ marginTop: '24px' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <Bot size={24} style={{ color: 'var(--accent-primary)' }} />
                <h2 className="card-title" style={{ margin: 0 }}>AI Көмекшінің Талдауы {solution.teacherComment ? 'және Мұғалім пікірі' : ''}</h2>
              </div>
              
              <div className="card-body">
                {solution.teacherComment && (
                  <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--accent-primary-light)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--accent-primary)' }}>Мұғалім пікірі:</h3>
                    <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                      {solution.teacherComment}
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
          )}

        </div>

        {solution && (solution.status === 'ai_reviewed' || solution.status === 'teacher_graded') && (
          <div className="dashboard-sidebar">
            <div className="card score-card">
              <h2 className="score-title">Қорытынды баға</h2>
              <div className="score-circle-wrapper">
                <CircularProgress 
                  value={solution.teacherScore || solution.aiScore || 0} 
                  size={140} 
                  strokeWidth={12} 
                />
                <div className="score-text-overlay">
                  <span className="score-main-value">{solution.teacherScore || solution.aiScore || 0}</span>
                  <span className="score-max-value">/ {review?.maxScore || 100}</span>
                </div>
              </div>
              <p className="score-verdict">
                {((solution.teacherScore || solution.aiScore || 0) >= 85) ? 'Жарайсың! Өте жақсы жұмыс.' : ((solution.teacherScore || solution.aiScore || 0) >= 60) ? 'Жақсы, бірақ қателермен жұмыс істеу керек.' : 'Тақырыпты қайталап оқу керек.'}
              </p>
              
              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  <strong>Назар аударыңыз:</strong> Бұл жасанды интеллект бағасы. <br/><br/>
                  Қорытынды бағаны мұғалім қояды.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
