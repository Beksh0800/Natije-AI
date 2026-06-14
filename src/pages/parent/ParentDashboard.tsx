// @ts-nocheck

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, CheckCircle, Clock, Award, Link as LinkIcon, Zap, Lightbulb, Target } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import CircularProgress from '../../components/ui/CircularProgress';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc, onSnapshot, getDoc, arrayUnion } from 'firebase/firestore';
import type { Submission, Review } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { STATUS_MAP } from '../../lib/constants';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/ui/Badge';
import './ParentDashboard.css';

interface LinkedChild {
  id: string;
  name: string;
  email: string;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [linking, setLinking] = useState(false);
  
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch parent's linked students list
  useEffect(() => {
    if (!db || !user) return;

    const parentRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(parentRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const linkedIds = data.linkedStudents || [];
        
        if (linkedIds.length === 0) {
          setLinkedChildren([]);
          setLoading(false);
          return;
        }

        // Fetch user details for each linked child
        const childrenData: LinkedChild[] = [];
        for (const cid of linkedIds) {
          const childDoc = await getDoc(doc(db, 'users', cid));
          if (childDoc.exists()) {
            childrenData.push({ id: childDoc.id, name: childDoc.data().name, email: childDoc.data().email });
          }
        }
        
        setLinkedChildren(childrenData);
        if (!activeChildId && childrenData.length > 0) {
          setActiveChildId(childrenData[0].id);
        }
      } else {
        setLinkedChildren([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Fetch submissions for active child
  useEffect(() => {
    if (!db || !activeChildId) {
      setSubmissions([]);
      return;
    }

    setLoading(true);

    const fetchChildData = async () => {
      try {
        // Find all student enrollments for this child
        const studentsQ = query(collection(db, 'students'), where("studentId", "==", activeChildId));
        const studentsSnap = await getDocs(studentsQ);
        
        const docIds = studentsSnap.docs.map(d => d.id);
        
        if (docIds.length === 0) {
          setSubmissions([]);
          setLoading(false);
          return;
        }

        // Fetch submissions
        const subQuery = query(collection(db, 'submissions'), where("studentId", "in", docIds));
        const unsubscribeSubmissions = onSnapshot(subQuery, (querySnapshot) => {
          const subs: Submission[] = [];
          querySnapshot.forEach((docSnap) => {
            subs.push({ id: docSnap.id, ...docSnap.data() } as Submission);
          });
          
          subs.sort((a, b) => {
            const timeA = (a.createdAt as any)?.seconds || 0;
            const timeB = (b.createdAt as any)?.seconds || 0;
            return timeB - timeA;
          });

          setSubmissions(subs);
          setLoading(false);
        });

        return unsubscribeSubmissions;
      } catch (err) {
        console.error("Failed to fetch child data:", err);
        setLoading(false);
      }
    };

    let unsub: any = null;
    fetchChildData().then(fn => { unsub = fn; });

    return () => {
      if (unsub) unsub();
    };
  }, [activeChildId]);

  // 3. Fetch reviews for AI insights
  useEffect(() => {
    if (!db || submissions.length === 0) {
      setReviews([]);
      return;
    }

    const reviewedIds = submissions.filter(s => s.status === 'reviewed').map(s => s.id).slice(0, 30);
    if (reviewedIds.length === 0) {
      setReviews([]);
      return;
    }

    const fetchReviews = async () => {
      const q = query(collection(db, 'reviews'), where("submissionId", "in", reviewedIds));
      const snap = await getDocs(q);
      const revs: Review[] = [];
      snap.forEach(d => revs.push({ id: d.id, ...d.data() } as Review));
      setReviews(revs);
    };

    fetchReviews();
  }, [submissions]);

  // Handle linking child via 6-digit code
  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = parentCodeInput.trim().toUpperCase();
    if (!code || code.length < 6) return;

    setLinking(true);

    try {
      if (!db || !user) return;

      const userQ = query(collection(db, 'users'), where("parentCode", "==", code));
      const userSnap = await getDocs(userQ);

      if (userSnap.empty) {
        toast.error("Бұл код бойынша оқушы табылмады. Қатесіз жазылғанын тексеріңіз.");
        setLinking(false);
        return;
      }

      const studentUserId = userSnap.docs[0].id;
      const studentName = userSnap.docs[0].data().name;

      // Update parent document
      await updateDoc(doc(db, 'users', user.id), {
        linkedStudents: arrayUnion(studentUserId)
      });

      toast.success(`${studentName} аккаунты сәтті байланыстырылды!`);
      setParentCodeInput('');
      if (!activeChildId) setActiveChildId(studentUserId);
    } catch (err) {
      console.error("Failed to link child account:", err);
      toast.error("Байланыстыру кезінде қате орын алды. Қайта көріңіз.");
    } finally {
      setLinking(false);
    }
  };

  const reviewedSubmissions = submissions.filter(s => s.status === 'reviewed');
  const averageScore = reviewedSubmissions.length > 0 
    ? Math.round(reviewedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / reviewedSubmissions.length)
    : 0;
  const completedTasks = reviewedSubmissions.length;
  const achievementsCount = submissions.filter(s => s.status === 'reviewed' && (s.score || 0) >= 85).length;

  // Aggregate insights
  const allStrengths: string[] = [];
  const allRecommendations: string[] = [];
  reviews.forEach(rev => {
    if (rev.strengths) allStrengths.push(...rev.strengths);
    if (rev.recommendations) allRecommendations.push(...rev.recommendations);
  });
  const uniqueStrengths = Array.from(new Set(allStrengths)).slice(0, 5);
  const uniqueRecommendations = Array.from(new Set(allRecommendations)).slice(0, 5);

  if (loading && linkedChildren.length === 0) {
    return (
      <MainLayout breadcrumbs={[{ label: 'Ата-ана кабинеті' }]}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <div className="spin" style={{ width: '30px', height: '30px', border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
        </div>
      </MainLayout>
    );
  }

  // If no children linked, show the link form
  if (linkedChildren.length === 0) {
    return (
      <MainLayout breadcrumbs={[{ label: 'Ата-ана кабинеті' }]}>
        <div className="page-title-section">
          <h1 className="page-title">
            <Users size={28} style={{ marginRight: '12px', color: 'var(--accent-primary)' }} />
            Балаңыздың үлгерімі
          </h1>
          <p className="page-description">
            Бұл жерде сіз балаңыздың соңғы бағалары мен мұғалім/AI ұсыныстарын көре аласыз.
          </p>
        </div>

        <div className="card" style={{ maxWidth: '500px', margin: '40px auto', padding: '32px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px', marginInline: 'auto' }}>
            👨‍👩‍👦
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Балаңыздың аккаунтын байланыстыру</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Балаңыздың оқу үлгерімін бақылау үшін оның профиліндегі <strong>6 таңбалы кодты</strong> енгізіңіз.
          </p>

          <form onSubmit={handleLinkChild}>
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Оқушы коды
              </label>
              <input
                type="text"
                required
                className="chat-input"
                placeholder="Мысалы: A8K2M1"
                value={parentCodeInput}
                onChange={(e) => setParentCodeInput(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
                disabled={linking}
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              className="sidebar-quick-btn"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--accent-gradient)', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={linking}
            >
              <LinkIcon size={16} />
              {linking ? 'Байланыстыру...' : 'Байланыстыру'}
            </button>
          </form>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout breadcrumbs={[{ label: 'Ата-ана кабинеті' }]}>
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">
            <Users size={28} style={{ marginRight: '12px', color: 'var(--accent-primary)' }} />
            Балаңыздың үлгерімі
          </h1>
          <p className="page-description">
            Бұл жерде сіз балаңыздың соңғы бағалары мен AI ұсыныстарын көре аласыз.
          </p>
        </div>
        
        {/* Children Tabs / Selector */}
        {linkedChildren.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px' }}>
            {linkedChildren.map(child => (
              <button
                key={child.id}
                onClick={() => setActiveChildId(child.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  background: activeChildId === child.id ? 'var(--accent-primary)' : 'transparent',
                  color: activeChildId === child.id ? 'white' : 'var(--text-secondary)'
                }}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Score Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '24px' }}>Жалпы үлгерім</h2>
          <CircularProgress value={averageScore} size={150} strokeWidth={12} label="Орташа балл" />
        </div>

        {/* Stats Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '20px' }}>Статистика</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--accent-primary)' }}>
                  <FileText size={20} />
                </div>
                <span style={{ fontWeight: 500 }}>Барлық жұмыстар</span>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{submissions.length}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--color-success)' }}>
                  <CheckCircle size={20} />
                </div>
                <span style={{ fontWeight: 500 }}>Тексерілгендер</span>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{completedTasks}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--color-warning)' }}>
                  <Award size={20} />
                </div>
                <span style={{ fontWeight: 500 }}>Жетістіктер (85+ балл)</span>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{achievementsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Card */}
      {reviews.length > 0 && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} style={{ color: 'var(--accent-primary)' }} />
            AI талдау қорытындысы
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {uniqueStrengths.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lightbulb size={18} /> Күшті жақтары
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {uniqueStrengths.map((s, i) => (
                    <li key={i} style={{ fontSize: '0.875rem', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid var(--color-success)' }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {uniqueRecommendations.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} /> AI ұсыныстары
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {uniqueRecommendations.map((r, i) => (
                    <li key={i} style={{ fontSize: '0.875rem', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid var(--color-warning)' }}>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Соңғы тапсырмалар</h2>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {submissions.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '16px', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Тапсырма</th>
                <th style={{ padding: '16px', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Пән</th>
                <th style={{ padding: '16px', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Баға</th>
                <th style={{ padding: '16px', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr 
                  key={sub.id} 
                  className="parent-table-row"
                  onClick={() => navigate(`/assignments/${sub.id}`)}
                  style={{ borderTop: '1px solid var(--border-color)' }}
                >
                  <td style={{ padding: '16px', fontWeight: 500 }}>{sub.title}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{sub.subject}</td>
                  <td style={{ padding: '16px', fontWeight: 600, color: sub.score ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
                    {sub.score ? `${sub.score} / 100` : '—'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <StatusBadge 
                      status={sub.status === 'error' ? 'error' : sub.status === 'reviewed' ? 'success' : sub.status === 'pending_teacher_review' ? 'warning' : 'info'} 
                      label={STATUS_MAP[sub.status]?.label || sub.status} 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Әлі жұмыстар жоқ</div>
        )}
      </div>
      
      {/* Link another child card (only show if already linked at least one) */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <button 
          onClick={() => {
             const code = prompt("Жаңа оқушының 6-таңбалы кодын енгізіңіз:");
             if (code) {
               setParentCodeInput(code);
               handleLinkChild({ preventDefault: () => {} } as any);
             }
          }}
          style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}
        >
          + Тағы бір оқушы қосу
        </button>
      </div>
    </MainLayout>
  );
}
