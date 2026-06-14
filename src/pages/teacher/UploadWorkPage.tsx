// @ts-nocheck
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload, Loader } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getTeacherClasses } from '../../services/classes';
import { getClassStudents } from '../../services/students';
import { uploadFileToFirebase } from '../../services/storage';
import { createSubmission } from '../../services/submissions';
import { createNotification } from '../../services/notifications';
import type { SchoolClass, Student } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { SUBJECTS } from '../../lib/constants';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function UploadWorkPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const paramClassId = searchParams.get('classId') || '';
  const paramStudentId = searchParams.get('studentId') || '';
  
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedClass, setSelectedClass] = useState(paramClassId);
  const [selectedStudent, setSelectedStudent] = useState(paramStudentId);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'assignment' | 'test' | 'essay' | 'practice' | 'project'>('assignment');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [dueDate, setDueDate] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [customSubjectText, setCustomSubjectText] = useState('');

  // Load classes on mount
  useEffect(() => {
    if (user?.id) {
      getTeacherClasses(user.id).then(setClasses).catch(console.error);
      
      // Load custom subjects
      getDoc(doc(db, 'users', user.id)).then(docSnap => {
        if (docSnap.exists() && docSnap.data().customSubjects) {
          setCustomSubjects(docSnap.data().customSubjects);
        }
      }).catch(console.error);
    }
  }, [user]);

  // Load students when a class is selected
  useEffect(() => {
    if (selectedClass) {
      getClassStudents(selectedClass).then(setStudents).catch(console.error);
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];

      // Validate size (max 20 MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error("Файл өлшемі тым үлкен. Максималды өлшем: 20 MB");
        return;
      }

      // Validate format
      const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedExtensions.includes(fileExtension)) {
        toast.error("Қате файл форматы. Тек PDF, JPG, PNG, DOCX файлдары рұқсат етілген.");
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Файлды таңдаңыз.");
      return;
    }
    if (!selectedClass || !user?.id) {
      toast.error("Сыныпты таңдаңыз және барлық өрістерді толтырыңыз.");
      return;
    }

    try {
      setIsUploading(true);

      let finalSubject = subject;
      if (subject === 'other') {
        if (!customSubjectText.trim()) {
          toast.error("Пән атын жазыңыз.");
          setIsUploading(false);
          return;
        }
        finalSubject = customSubjectText.trim();
        // Save new custom subject
        await updateDoc(doc(db, 'users', user.id), {
          customSubjects: arrayUnion(finalSubject)
        });
        if (!customSubjects.includes(finalSubject)) {
          setCustomSubjects(prev => [...prev, finalSubject]);
        }
      }

      // 1. Upload to Firebase Storage
      const storageResult = await uploadFileToFirebase(file, 'submissions');

      // 2. Format file size to human readable (e.g. "1.2 MB")
      const mbSize = (file.size / (1024 * 1024)).toFixed(1);
      const fileSizeStr = mbSize === "0.0" ? `${Math.round(file.size / 1024)} KB` : `${mbSize} MB`;

      // 3. Save to Firestore
      const newSubmissionId = await createSubmission({
        teacherId: user.id,
        classId: selectedClass,
        studentId: 'all', // Indicates it's for the whole class
        title,
        subject: finalSubject,
        type,
        fileUrl: storageResult.url,
        fileName: file.name,
        fileSize: fileSizeStr,
        status: 'uploaded',
        maxAttempts,
        ...(dueDate ? { dueDate } : {})
      });

      // 4. Send notifications
      const classStudents = await getClassStudents(selectedClass);
      const notifPromises = classStudents.map(student => 
        createNotification({
          userId: student.id,
          title: 'Жаңа тапсырма',
          message: `${finalSubject} пәнінен жаңа тапсырма қосылды: ${title}`,
          type: 'assignment',
          link: '/student'
        })
      );
      await Promise.all(notifPromises);

      toast.success("Жұмыс сәтті жүктелді!");
      navigate('/teacher/assignments/' + newSubmissionId);
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Жүктеу кезінде қате пайда болды.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Мұғалім', path: '/teacher' },
        { label: 'Жұмыс жүктеу' },
      ]}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Сыныпқа тапсырма жүктеу</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          Файлды жүктеп, сыныпқа ортақ тапсырма ретінде тіркеңіз.
        </p>

        <Card padding="xl">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* Class Selection */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Сыныпты таңдаңыз</label>
              <select 
                className="form-input" 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                required
              >
                <option value="">Сыныпты таңдаңыз...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Subject and Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Пән</label>
                <select 
                  className="form-input" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)}
                  required
                >
                  <option value="">Пәнді таңдаңыз...</option>
                  {SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  {customSubjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="other">Басқа пән (жазу)</option>
                </select>

                {subject === 'other' && (
                  <input
                    type="text"
                    placeholder="Пәннің атын жазыңыз"
                    className="form-input"
                    style={{ marginTop: '8px' }}
                    value={customSubjectText}
                    onChange={(e) => setCustomSubjectText(e.target.value)}
                    required
                  />
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Тапсырма түрі</label>
                <select 
                  className="form-input" 
                  value={type} 
                  onChange={e => setType(e.target.value as any)}
                  required
                >
                  <option value="assignment">Үй жұмысы</option>
                  <option value="test">Бақылау жұмысы</option>
                  <option value="practice">Практикалық жұмыс</option>
                  <option value="project">Жоба</option>
                  <option value="essay">Эссе</option>
                </select>
              </div>
            </div>

            {/* Title & Attempts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Тақырыбы</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Жұмыс тақырыбы немесе нұсқасы"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Мүмкіндіктер саны</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={maxAttempts}
                  onChange={e => setMaxAttempts(Number(e.target.value))}
                  min={1}
                  max={10}
                  required
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Срок сдачи (Дедлайн) (Міндетті емес)</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            {/* File Upload Area */}
            <div style={{ marginTop: 'var(--space-2)' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Файл жүктеу (PDF, JPG, PNG)</label>
              <div 
                style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: 'var(--border-radius-lg)', 
                  padding: 'var(--space-8)', 
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer',
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
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Max 20 MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              fullWidth 
              disabled={!file || !selectedClass || !title || !subject || isUploading}
              style={{ marginTop: 'var(--space-4)' }}
            >
              {isUploading ? (
                <>
                  <Loader size={20} className="spin" />
                  Жүктелуде...
                </>
              ) : (
                'Жүктеп салу'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
}
