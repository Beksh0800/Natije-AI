const fs = require('fs');
const path = require('path');

const content = `import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen, FileText, Star, CircleAlert, Bot, ArrowLeft, Loader, UploadCloud
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import CircularProgress from '../../components/ui/CircularProgress';
import { db, storage } from '../../lib/firebase';
import { doc, onSnapshot, orderBy, query, collection, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { createSolution, getSolutionsForAssignment } from '../../services/solutions';
import { analyzeWork } from '../../services/ai';
import { createReview } from '../../services/reviews';
import type { Submission, Review, Solution } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { STATUS_MAP } from '../../lib/constants';
import { useToast } from '../../contexts/ToastContext';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!db || !id || !user) return;

    setLoading(true);

    // 1. Listen to assignment (submission doc)
    const subRef = doc(db, 'submissions', id);
    const unsubscribeSub = onSnapshot(subRef, (docSnap) => {
      if (docSnap.exists()) {
        setSubmission({ id: docSnap.id, ...docSnap.data() } as Submission);
      }
    });

    // 2. Listen to solutions for this student
    const solQuery = query(
      collection(db, 'solutions'), 
      where("assignmentId", "==", id),
      where("studentId", "==", user.id)
    );
    
    const unsubscribeSol = onSnapshot(solQuery, (querySnapshot) => {
      const sols = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Solution));
      sols.sort((a, b) => b.iteration - a.iteration);
      setSolutions(sols);
      
      // If there are solutions, load review for the latest one
      if (sols.length > 0) {
        const latestSolId = sols[0].id;
        const revQuery = query(collection(db, 'reviews'), where("solutionId", "==", latestSolId));
        onSnapshot(revQuery, (revSnap) => {
          if (!revSnap.empty) {
            setReview({ id: revSnap.docs[0].id, ...revSnap.docs[0].data() } as Review);
          } else {
            setReview(null);
          }
          setLoading(false);
        });
      } else {
        setReview(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeSub();
      unsubscribeSol();
    };
  }, [id, user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !submission || !user || !id) return;

    setUploading(true);
    const iteration = solutions.length + 1;
    const fileName = \`\${user.name}_version_\${iteration}_\${file.name}\`;
    const storageRef = ref(storage, \`solutions/\${id}/\${fileName}\`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      () => {},
      (error) => {
        console.error("Upload error:", error);
        toast.error('Файлды жүктеу қатесі.');
        setUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const fileSizeStr = (file.size / 1024 / 1024).toFixed(2) + ' MB';
          
          const solData = {
            assignmentId: id,
            studentId: user.id,
            fileUrl: downloadURL,
            fileName: file.name,
            fileSize: fileSizeStr,
            iteration,
            status: 'pending_ai' as const,
          };
          
          const solId = await createSolution(solData);
          toast.success('Шешім жүктелді! ИИ тексеруде...');

          // Run AI Analysis immediately
          const aiResult = await analyzeWork(submission.fileUrl, submission.subject, submission.title, downloadURL);
          await createReview(solId, true, aiResult);
          
          toast.success(\`AI талдауы аяқталды! Алдын ала баға: \${aiResult.score}/100\`);
        } catch (err: any) {
          console.error("Analysis Error:", err);
          toast.error(err.message || 'AI тексеру барысында қате шықты.');
        } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    );
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
  const latestSolution = solutions[0];
  const isImageTask = submission.fileName?.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/);

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
            Берілген күні: {new Date((submission.createdAt as any)?.toDate?.() || Date.now()).toLocaleDateString('kk-KZ')}
          </span>
          {latestSolution && (
            <span className="page-meta-item">
              Статус: {latestSolution.status === 'teacher_graded' ? 'Мұғалім бағалады' : latestSolution.status === 'ai_reviewed' ? 'ИИ тексерді' : 'Тексерілуде'}
            </span>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Тапсырма құжаты</h2>
            </div>
            <div className="card-body">
              {isImageTask ? (
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                   <img src={submission.fileUrl} alt="Task" style={{ width: '100%', display: 'block' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{submission.fileName}</div>
                    <a href={submission.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>Жүктеп алу / Көру</a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
             <div className="card-header">
               <h2 className="card-title">Сіздің шешіміңіз</h2>
             </div>
             <div className="card-body">
               {latestSolution ? (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                       <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
                     </div>
                     <div>
                       <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{latestSolution.fileName}</div>
                       <a href={latestSolution.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>Ашу / Көру</a>
                     </div>
                   </div>
                   {latestSolution.status !== 'teacher_graded' && !isParent && (
                     <div style={{ marginTop: '8px' }}>
                       <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>ИИ ұсыныстары негізінде шешімді жақсартып, қайта жүктей аласыз.</p>
                       <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline">
                         {uploading ? 'Жүктелуде...' : 'Жаңа нұсқасын жүктеу'}
                       </Button>
                     </div>
                   )}
                 </div>
               ) : (
                 <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ background: 'var(--bg-secondary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <UploadCloud size={32} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <h3 style={{ marginBottom: '8px' }}>Шешім әлі жүктелмеген</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Тапсырманы орындап, суретін немесе құжатын жүктеңіз.</p>
                    {!isParent && (
                      <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? 'Жүктелуде...' : 'Жүктеу'}
                      </Button>
                    )}
                 </div>
               )}
               <input
                 type="file"
                 ref={fileInputRef}
                 style={{ display: 'none' }}
                 accept="image/*,.pdf"
                 onChange={handleFileUpload}
               />
             </div>
          </div>

          {/* AI Analysis View (Only if reviewed) */}
          {latestSolution && review ? (
            <div className="card" style={{ marginTop: '24px' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <Bot size={24} style={{ color: 'var(--accent-primary)' }} />
                <h2 className="card-title" style={{ margin: 0 }}>AI Көмекшінің Талдауы</h2>
              </div>
              
              <div className="card-body">
                {latestSolution.teacherComment && (
                  <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--accent-primary-light)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--accent-primary)' }}>Мұғалім пікірі:</h3>
                    <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                      {latestSolution.teacherComment}
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
          ) : latestSolution?.status === 'pending_ai' && (
            <div className="card" style={{ marginTop: '24px', textAlign: 'center', padding: '40px 20px' }}>
              <Loader size={32} className="spin" style={{ margin: '0 auto 16px', color: 'var(--accent-primary)' }} />
              <h3 style={{ marginBottom: '8px' }}>Жұмыс тексерілуде...</h3>
              <p style={{ color: 'var(--text-secondary)' }}>AI шешіміңізді тексеріп жатыр, күте тұрыңыз.</p>
            </div>
          )}

        </div>

        {/* Right Sidebar (Score) */}
        <div className="dashboard-sidebar">
          {latestSolution ? (
            <div className="card score-card">
              <h2 className="score-title">{latestSolution.status === 'teacher_graded' ? 'Мұғалім бағасы' : 'AI бағасы (Алдын ала)'}</h2>
              <div className="score-circle-wrapper">
                <CircularProgress 
                  value={latestSolution.teacherScore || latestSolution.aiScore || review?.score || 0} 
                  size={140} 
                  strokeWidth={12} 
                />
                <div className="score-text-overlay">
                  <span className="score-main-value">{latestSolution.teacherScore || latestSolution.aiScore || review?.score || 0}</span>
                  <span className="score-max-value">/ {review?.maxScore || 100}</span>
                </div>
              </div>
              <p className="score-verdict">
                {(latestSolution.teacherScore || latestSolution.aiScore || review?.score || 0) >= 85 ? 'Жарайсың! Өте жақсы жұмыс.' : (latestSolution.teacherScore || latestSolution.aiScore || review?.score || 0) >= 60 ? 'Жақсы, бірақ қателермен жұмыс істеу керек.' : 'Тақырыпты қайталап оқу керек.'}
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
\`;

fs.writeFileSync(path.join(__dirname, 'src/pages/student/StudentDashboard.tsx'), content);
console.log('StudentDashboard rewritten.');
