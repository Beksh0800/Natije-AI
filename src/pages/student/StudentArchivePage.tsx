// @ts-nocheck

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Archive, FileText, Award, Search, Bot, Star, Loader } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Submission } from '../../types';
import { formatDate } from '../../lib/utils';
import { ASSIGNMENT_TYPES } from '../../lib/constants';
import './StudentArchivePage.css';

export default function StudentArchivePage() {
  const { user } = useAuth();
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [studentDocIds, setStudentDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // 1. Resolve student document IDs
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

  // 2. Listen to reviewed submissions only
  useEffect(() => {
    if (!db || !user || studentDocIds.length === 0) return;

    setLoading(true);
    const q = query(
      collection(db, 'submissions'), 
      where("studentId", "in", studentDocIds),
      where("status", "==", "reviewed")
    );

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
      console.error("Failed to sync student archive submissions", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentDocIds, user]);

  // Calculations
  const maxScore = submissions.length > 0 ? Math.max(...submissions.map(s => s.score || 0)) : 0;
  const averageScore = submissions.length > 0 
    ? Math.round(submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length)
    : 0;

  // Extract unique subjects for filter
  const subjects = Array.from(new Set(submissions.map(s => s.subject)));

  // Filter archived submissions
  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubjectFilter === 'all' || sub.subject === selectedSubjectFilter;
    return matchesSearch && matchesSubject;
  });

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'assignment': return 'blue';
      case 'test': return 'red';
      case 'project': return 'purple';
      case 'essay': return 'yellow';
      default: return 'gray';
    }
  };

  const formatType = (type: string) => {
    return ASSIGNMENT_TYPES[type] || type;
  };

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Басты бет', path: '/' },
        { label: 'Архив' },
      ]}
    >
      {/* Header */}
      <div className="archive-page-welcome">
        <div>
          <h1 className="archive-page-title">
            <Archive size={28} style={{ marginRight: '8px', color: 'var(--accent-primary)', verticalAlign: 'middle' }} />
            Жұмыстар архиві
          </h1>
          <p className="archive-page-subtitle">Бағаланған және тексерілген жұмыстарыңыздың толық тарихы мен портфолиосы.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="archive-stats-row">
        <Card className="archive-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
            <FileText size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Бағаланған жұмыстар</span>
            <span className="stat-value">{submissions.length}</span>
          </div>
        </Card>

        <Card className="archive-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <Award size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ең жоғары балл</span>
            <span className="stat-value">{submissions.length > 0 ? `${maxScore}/100` : '—'}</span>
          </div>
        </Card>

        <Card className="archive-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Star size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Орташа үлгерім</span>
            <span className="stat-value">{submissions.length > 0 ? `${averageScore}%` : '—'}</span>
          </div>
        </Card>
      </div>

      {/* Filters Card */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Тапсырма атауын іздеу..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '38px' }}
            />
          </div>

          {/* Subject Filter */}
          <div style={{ width: '200px' }}>
            <select
              value={selectedSubjectFilter}
              onChange={e => setSelectedSubjectFilter(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
            >
              <option value="all">Барлық пәндер</option>
              {subjects.map((sub, idx) => (
                <option key={idx} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main Grid */}
      <div className="archive-page-grid">
        {/* Table Column */}
        <div className="archive-main-column">
          <Card>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                <Loader className="spin" />
              </div>
            ) : filteredSubmissions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="archive-table-style">
                  <thead>
                    <tr>
                      <th>Тапсырма атауы</th>
                      <th>Пән</th>
                      <th>Күні</th>
                      <th>Түрі</th>
                      <th>Баға (Балл)</th>
                      <th>Әрекет</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub) => (
                      <tr key={sub.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{sub.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Файл: {sub.fileName}</div>
                        </td>
                        <td>{sub.subject}</td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {formatDate(sub.createdAt)}
                        </td>
                        <td>
                          <Badge color={getTypeBadgeColor(sub.type) as any} filled>
                            {formatType(sub.type)}
                          </Badge>
                        </td>
                        <td>
                          <span className="archive-score-badge">
                            {sub.score || 0}/100
                          </span>
                        </td>
                        <td>
                          <Link to={`/assignments/${sub.id}`} style={{ textDecoration: 'none' }}>
                            <Button variant="ghost" size="sm">
                              Талдауды ашу
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <FileText size={40} style={{ margin: '0 auto var(--space-3)' }} />
                <p>Архивте жұмыстар табылмады.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Column: AI Insights */}
        <div className="archive-sidebar-column">
          <Card className="ai-insights-card">
            <h3 className="sidebar-title">
              <Bot size={18} style={{ color: 'var(--accent-primary)', marginRight: '8px', verticalAlign: 'middle' }} />
              AI Ұсыныстар
            </h3>
            <div className="ai-insights-content">
              {submissions.length > 0 ? (
                <>
                  <p className="ai-insight-text">
                    Соңғы архивтелген жұмыстарыңыздың нәтижелерін ескере отырып, мына тақырыптарға назар аудару керек:
                  </p>
                  <ul className="ai-insights-list">
                    <li>✏️ Сөйлем құрылымындағы тыныс белгілерді тексеру (Қазақ тілі).</li>
                    <li>📐 Квадрат теңдеулердің түбірлерін есептеу алгоритмін қайталау (Математика).</li>
                    <li>📚 Физика пәнінен формулаларды жаттау.</li>
                  </ul>
                </>
              ) : (
                <p className="ai-insight-text" style={{ color: 'var(--text-secondary)' }}>
                  Ұсыныстар жасау үшін алдымен жұмыстарыңызды тексеруге жіберіңіз.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
