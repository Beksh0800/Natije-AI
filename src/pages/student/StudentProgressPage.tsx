// @ts-nocheck

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, FileText, Award, Star, CheckCircle,
  BarChart2, Lightbulb, Loader, Zap, Target
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import type { Submission, Review } from '../../types';
import './StudentProgressPage.css';

interface AchievementDef {
  emoji: string;
  title: string;
  desc: string;
  check: (reviewed: Submission[]) => boolean;
}

const achievements: AchievementDef[] = [
  {
    emoji: '🌟',
    title: 'Алғашқы жұмыс',
    desc: 'Бірінші жұмысты тапсыру',
    check: (r) => r.length >= 1,
  },
  {
    emoji: '🔥',
    title: '5 жұмыс',
    desc: '5 жұмыс тапсыру',
    check: (r) => r.length >= 5,
  },
  {
    emoji: '💎',
    title: '10 жұмыс',
    desc: '10 жұмыс тапсыру',
    check: (r) => r.length >= 10,
  },
  {
    emoji: '🏅',
    title: 'Жоғары балл',
    desc: 'Бір жұмыста 85+ балл',
    check: (r) => r.some((s) => (s.score || 0) >= 85),
  },
  {
    emoji: '🏆',
    title: 'Үздік нәтиже',
    desc: 'Бір жұмыста 95+ балл',
    check: (r) => r.some((s) => (s.score || 0) >= 95),
  },
  {
    emoji: '📚',
    title: 'Зерттеуші',
    desc: '3 түрлі пән бойынша жұмыс',
    check: (r) => new Set(r.map((s) => s.subject)).size >= 3,
  },
];

export default function StudentProgressPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentDocIds, setStudentDocIds] = useState<string[]>([]);

  // 1. Find student doc IDs
  useEffect(() => {
    if (!db || !user) return;

    const studentQuery = query(
      collection(db, 'students'),
      where('email', '==', user.email)
    );

    const unsub = onSnapshot(studentQuery, (snap) => {
      const ids = [user.id];
      snap.forEach((d) => ids.push(d.id));
      setStudentDocIds(Array.from(new Set(ids)));
    });

    return () => unsub();
  }, [user]);

  // 2. Listen to submissions
  useEffect(() => {
    if (!db || !user || studentDocIds.length === 0) {
      setLoading(false);
      return;
    }

    const subQuery = query(
      collection(db, 'submissions'),
      where('studentId', 'in', studentDocIds)
    );

    const unsub = onSnapshot(subQuery, (snap) => {
      const subs: Submission[] = [];
      snap.forEach((d) => subs.push({ id: d.id, ...d.data() } as Submission));
      subs.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
      });
      setSubmissions(subs);
      setLoading(false);
    });

    return () => unsub();
  }, [studentDocIds, user]);

  // 3. Fetch reviews for reviewed submissions
  useEffect(() => {
    if (!db) return;

    const reviewedIds = submissions
      .filter((s) => s.status === 'reviewed')
      .map((s) => s.id);

    if (reviewedIds.length === 0) {
      setReviews([]);
      return;
    }

    // Firestore "in" query supports max 30 items
    const batchIds = reviewedIds.slice(0, 30);

    const fetchReviews = async () => {
      const q = query(
        collection(db, 'reviews'),
        where('submissionId', 'in', batchIds)
      );
      const snap = await getDocs(q);
      const revs: Review[] = [];
      snap.forEach((d) => revs.push({ id: d.id, ...d.data() } as Review));
      setReviews(revs);
    };

    fetchReviews().catch(console.error);
  }, [submissions]);

  // Calculations
  const reviewed = submissions.filter((s) => s.status === 'reviewed');
  const totalScore = reviewed.reduce((sum, s) => sum + (s.score || 0), 0);
  const avgScore = reviewed.length > 0 ? Math.round(totalScore / reviewed.length) : 0;
  const highScoreCount = reviewed.filter((s) => (s.score || 0) >= 85).length;

  // Aggregate strengths & recommendations from reviews
  const allStrengths: string[] = [];
  const allRecommendations: string[] = [];
  for (const rev of reviews) {
    if (rev.strengths) allStrengths.push(...rev.strengths);
    if (rev.recommendations) allRecommendations.push(...rev.recommendations);
  }
  // Deduplicate and limit
  const uniqueStrengths = Array.from(new Set(allStrengths)).slice(0, 5);
  const uniqueRecommendations = Array.from(new Set(allRecommendations)).slice(0, 5);

  function getScoreClass(score: number) {
    if (score >= 85) return 'score-high';
    if (score >= 60) return 'score-mid';
    return 'score-low';
  }

  return (
    <MainLayout breadcrumbs={[{ label: 'Менің үлгерімім' }]}>
      {/* Header */}
      <div className="progress-page-header">
        <h1>
          <TrendingUp size={24} style={{ marginRight: '10px', color: 'var(--accent-primary)', verticalAlign: 'middle' }} />
          Менің үлгерімім
        </h1>
        <p>Оқу нәтижелеріңізді бақылаңыз, AI ұсыныстарын оқыңыз және жетістіктеріңізді жинаңыз.</p>
      </div>

      {/* Stats Row */}
      <div className="progress-stats-row">
        <Card className="progress-stat-card">
          <div className="progress-stat-icon" style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
            <FileText size={20} />
          </div>
          <div className="progress-stat-info">
            <span className="progress-stat-label">Барлық жұмыстар</span>
            <span className="progress-stat-value">{submissions.length}</span>
          </div>
        </Card>

        <Card className="progress-stat-card">
          <div className="progress-stat-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <CheckCircle size={20} />
          </div>
          <div className="progress-stat-info">
            <span className="progress-stat-label">Тексерілген</span>
            <span className="progress-stat-value">{reviewed.length}</span>
          </div>
        </Card>

        <Card className="progress-stat-card">
          <div className="progress-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <BarChart2 size={20} />
          </div>
          <div className="progress-stat-info">
            <span className="progress-stat-label">Орташа балл</span>
            <span className="progress-stat-value">{avgScore > 0 ? `${avgScore}%` : '—'}</span>
          </div>
        </Card>

        <Card className="progress-stat-card">
          <div className="progress-stat-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <Award size={20} />
          </div>
          <div className="progress-stat-info">
            <span className="progress-stat-label">85+ балл</span>
            <span className="progress-stat-value">{highScoreCount}</span>
          </div>
        </Card>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <Loader className="spin" size={28} />
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <div className="progress-empty">
            <TrendingUp size={48} />
            <h3>Әлі деректер жоқ</h3>
            <p>Мұғалім жұмысыңызды жүктеп, AI арқылы бағалағанда, нәтижелер осы жерде көрсетіледі.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Main Grid: Scores + Insights */}
          <div className="progress-main-grid">
            {/* Left: Recent Scores */}
            <Card>
              <h2 className="card-section-title">
                <Star size={18} style={{ color: 'var(--accent-primary)' }} />
                Соңғы бағалар
              </h2>
              {reviewed.length > 0 ? (
                <div className="recent-scores-list">
                  {reviewed.slice(0, 8).map((sub) => (
                    <Link
                      key={sub.id}
                      to={`/assignments/${sub.id}`}
                      className="recent-score-item"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="recent-score-left">
                        <div className="recent-score-icon">
                          <FileText size={16} />
                        </div>
                        <div>
                          <div className="recent-score-title">{sub.title}</div>
                          <div className="recent-score-subject">{sub.subject}</div>
                        </div>
                      </div>
                      <span className={`recent-score-value ${getScoreClass(sub.score || 0)}`}>
                        {sub.score || 0}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="progress-empty">
                  <p>Тексерілген жұмыстар жоқ</p>
                </div>
              )}
            </Card>

            {/* Right: AI Insights */}
            <Card>
              <h2 className="card-section-title">
                <Zap size={18} style={{ color: 'var(--accent-primary)' }} />
                AI талдау қорытындысы
              </h2>
              {reviews.length > 0 ? (
                <div className="insights-grid">
                  {uniqueStrengths.length > 0 && (
                    <div className="insight-section">
                      <h3>
                        <Lightbulb size={16} style={{ color: 'var(--color-success)' }} />
                        Күшті жақтарыңыз
                      </h3>
                      <ul className="insight-list">
                        {uniqueStrengths.map((s, i) => (
                          <li key={i}>✅ {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {uniqueRecommendations.length > 0 && (
                    <div className="insight-section">
                      <h3>
                        <Target size={16} style={{ color: 'var(--color-warning)' }} />
                        AI ұсыныстары
                      </h3>
                      <ul className="insight-list">
                        {uniqueRecommendations.map((r, i) => (
                          <li key={i}>💡 {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="progress-empty">
                  <Zap size={36} />
                  <p>AI талдау нәтижелері жұмыс тексерілгенде пайда болады</p>
                </div>
              )}
            </Card>
          </div>

          {/* Achievements */}
          <Card style={{ marginBottom: '32px' }}>
            <h2 className="card-section-title">
              <Award size={18} style={{ color: 'var(--color-warning)' }} />
              Жетістіктер
            </h2>
            <div className="achievements-grid">
              {achievements.map((ach, i) => {
                const earned = ach.check(reviewed);
                return (
                  <div key={i} className={`achievement-card ${earned ? 'earned' : 'locked'}`}>
                    <span className="achievement-emoji">{ach.emoji}</span>
                    <span className="achievement-title">{ach.title}</span>
                    <span className="achievement-desc">{ach.desc}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </MainLayout>
  );
}
