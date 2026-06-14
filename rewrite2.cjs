const fs = require('fs');

let content = fs.readFileSync('src/pages/teacher/TeacherReview.tsx', 'utf8');

// Imports
content = content.replace(
  "import { useParams, Link } from 'react-router-dom';",
  "import { useParams, Link, useNavigate } from 'react-router-dom';"
);
content = content.replace(
  "Award, Check, AlertCircle, Lightbulb, Loader\n} from 'lucide-react';",
  "Award, Check, AlertCircle, Lightbulb, Loader, Trash2, Edit, Save, X\n} from 'lucide-react';"
);
content = content.replace(
  "import { doc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore';",
  "import { doc, collection, query, where, onSnapshot, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';"
);

// State
const stateInsert = `  const navigate = useNavigate();
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
`;
content = content.replace(
  "const [teacherComment, setTeacherComment] = useState('');",
  "const [teacherComment, setTeacherComment] = useState('');\n" + stateInsert
);

// UI Update
const oldHeader = `      <div className="review-header">
        <div className="review-title-group">
          <h1 className="review-title">{submission.title}</h1>
          <StatusBadge 
            status={submission.status === 'error' ? 'error' : submission.status === 'reviewed' ? 'success' : submission.status === 'pending_teacher_review' ? 'warning' : 'info'} 
            label={isClassAssignment ? 'Жалпы тапсырма' : (STATUS_MAP[submission.status]?.label || 'Жаңа тапсырма')} 
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
        {!isClassAssignment && (
          <div className="info-chip">
            <Award size={14} className="info-chip-icon" />
            Көлемі
            <span className="info-chip-label">{submission.fileSize}</span>
          </div>
        )}
      </div>`;

const newHeader = `      <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
      </div>`;

content = content.replace(oldHeader, newHeader);

fs.writeFileSync('src/pages/teacher/TeacherReview.tsx', content);
console.log('Success');
