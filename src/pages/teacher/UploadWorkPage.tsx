// @ts-nocheck
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Upload, Loader } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getTeacherClasses } from '../../services/classes';
import { getClassStudents } from '../../services/students';
import { uploadFileToFirebase } from '../../services/storage';
import { createSubmission } from '../../services/submissions';
import type { SchoolClass, Student } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { SUBJECTS } from '../../lib/constants';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function UploadWorkPage() {
  const { user } = useAuth();
  const location = useLocation();
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
      await createSubmission({
        teacherId: user.id,
        classId: selectedClass,
        studentId: 'all', // Indicates it's for the whole class
        title,
        subject: finalSubject,
        type,
        fileUrl: storageResult.url,
        fileName: file.name,
        fileSize: fileSizeStr,
        status: 'uploaded'
      });

      toast.success("Жұмыс сәтті жүктелді!");
      // Reset form (except class/student for convenience)
      setTitle('');
      setFile(null);
      
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
                <option value="">-- Сыныпты таңдаңыз --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>



            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {/* Subject */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Пән</label>
                <select 
                  className="form-input" 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required 
                >
                  <option value="">-- Пәнді таңдаңыз --</option>
                  {Array.from(new Set([...SUBJECTS, ...customSubjects])).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="other">Басқа (Другое)</option>
                </select>
                
                {subject === 'other' && (
                  <input 
                    className="form-input" 
                    type="text" 
                    placeholder="Пән атауын жазыңыз..."
                    value={customSubjectText}
                    onChange={e => setCustomSubjectText(e.target.value)}
                    required
                    style={{ marginTop: '8px', width: '100%' }}
                  />
                )}
              </div>

              {/* Type */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Тапсырма түрі</label>
                <select className="form-input" value={type} onChange={e => setType(e.target.value as any)}>
                  <option value="assignment">Үй жұмысы</option>
                  <option value="test">Бақылау жұмысы</option>
                  <option value="essay">Эссе</option>
                  <option value="practice">Практика</option>
                  <option value="project">Жоба</option>
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Тақырыбы</label>
              <input 
                className="form-input" 
                type="text" 
                placeholder="Жұмыс тақырыбы немесе нұсқасы"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required 
              />
            </div>

            {/* File Upload */}
            <div style={{ marginTop: 'var(--space-2)' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Файл жүктеу (PDF, JPG, PNG)</label>
              <div style={{ border: '2px dashed var(--border-color)', padding: 'var(--space-6)', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)' }}>
                <input 
                  type="file" 
                  id="file-upload" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--accent-primary-light)', borderRadius: '50%', color: 'var(--accent-primary)' }}>
                    <Upload size={24} />
                  </div>
                  <span style={{ fontWeight: 500, color: 'var(--accent-primary)' }}>
                    {file ? `✅ ${file.name}` : "Компьютерден файл таңдау"}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                    {file ? 'Файл дайын. Қайта таңдау үшін басыңыз.' : 'Max 20 MB'}
                  </span>
                </label>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" disabled={isUploading || !file} style={{ marginTop: 'var(--space-4)' }}>
              {isUploading ? <Loader size={18} className="spin" /> : "Жүктеп салу"}
            </Button>
          </form>
        </Card>
      </div>

    </MainLayout>
  );
}
