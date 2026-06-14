import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, BookOpen, Upload, Loader } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Student, SchoolClass } from '../../types';
import './TeacherStudentsPage.css';

export default function TeacherStudentsPage() {
  const { user } = useAuth();
  
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  useEffect(() => {
    if (!db || !user?.id) return;

    setLoading(true);

    // 1. Sync teacher's classes
    const classesQuery = query(collection(db, 'classes'), where("teacherId", "==", user.id));
    const unsubscribeClasses = onSnapshot(classesQuery, (classSnapshot) => {
      const classesData: SchoolClass[] = [];
      const classIds: string[] = [];
      
      classSnapshot.forEach((docSnap) => {
        classesData.push({ id: docSnap.id, ...docSnap.data() } as SchoolClass);
        classIds.push(docSnap.id);
      });
      setClasses(classesData);

      if (classIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // 2. Sync students belonging to these classIds
      const studentsQuery = query(collection(db, 'students'), where("classId", "in", classIds));
      const unsubscribeStudents = onSnapshot(studentsQuery, (studentsSnapshot) => {
        const studentsData: Student[] = [];
        studentsSnapshot.forEach((docSnap) => {
          studentsData.push({ id: docSnap.id, ...docSnap.data() } as Student);
        });
        setStudents(studentsData);
        setLoading(false);
      }, (err) => {
        console.error("Failed to sync students", err);
        setLoading(false);
      });

      return () => unsubscribeStudents();
    }, (error) => {
      console.error("Failed to sync classes", error);
      setLoading(false);
    });

    return () => unsubscribeClasses();
  }, [user]);

  // Helper to get class name
  const getClassName = (classId: string) => {
    const found = classes.find(c => c.id === classId);
    return found ? found.name : 'Белгісіз сынып';
  };

  // Filter students based on search and selected class
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesClass = selectedClassFilter === 'all' || student.classId === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Мұғалім', path: '/teacher' },
        { label: 'Оқушылар' },
      ]}
    >
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.5rem', fontWeight: 700 }}>Оқушылар тізімі</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Барлық сыныптардағы оқушылардың деректері мен мәртебесі</p>
        </div>
      </div>

      {/* Filters Row */}
      <Card style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Оқушының атын немесе email-ін іздеу..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '38px' }}
            />
          </div>

          {/* Class Filter Dropdown */}
          <div style={{ width: '220px' }}>
            <select
              value={selectedClassFilter}
              onChange={e => setSelectedClassFilter(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
            >
              <option value="all">Барлық сыныптар</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <Loader className="spin" />
          </div>
        ) : filteredStudents.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="students-table">
              <thead>
                <tr>
                  <th>Аты-жөні</th>
                  <th>Email</th>
                  <th>Сыныбы</th>
                  <th>Мәртебесі</th>
                  <th>Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const isLinked = !!(student as any).studentId;
                  return (
                    <tr key={student.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="student-table-avatar">
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{ fontWeight: 500 }}>{student.name}</div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{student.email || '—'}</td>
                      <td>
                        <Link to={`/teacher/classes/${student.classId}`} className="class-link-style">
                          <BookOpen size={14} style={{ marginRight: '6px' }} />
                          {getClassName(student.classId)}
                        </Link>
                      </td>
                      <td>
                        {isLinked ? (
                          <Badge color="green" filled>Қосылды (Активті)</Badge>
                        ) : (
                          <Badge color="yellow" filled>Шақырылды (Күтуде)</Badge>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link to={`/teacher/upload?classId=${student.classId}&studentId=${student.id}`} style={{ textDecoration: 'none' }}>
                            <Button variant="ghost" size="sm" icon={<Upload size={12} />}>
                              Жұмыс жүктеу
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <Users size={40} style={{ margin: '0 auto var(--space-3)' }} />
            <p>Оқушылар табылмады.</p>
          </div>
        )}
      </Card>
    </MainLayout>
  );
}
