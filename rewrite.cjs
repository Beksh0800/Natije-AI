const fs = require('fs');

let content = fs.readFileSync('src/pages/student/StudentDashboard.tsx', 'utf8');

// 1. Add X icon
content = content.replace(
  "BookOpen, FileText, Star, CircleAlert, Bot, ArrowLeft, Loader, UploadCloud\n} from 'lucide-react';",
  "BookOpen, FileText, Star, CircleAlert, Bot, ArrowLeft, Loader, UploadCloud, X\n} from 'lucide-react';"
);

// 2. Add pendingFiles state
content = content.replace(
  "const [loading, setLoading] = useState(true);",
  "const [loading, setLoading] = useState(true);\n  const [pendingFiles, setPendingFiles] = useState<File[]>([]);"
);

// 3. handleFileUpload to handleFileSelect and add handleCheckAI
const oldHandleFileUploadStr = `  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !submission || !user || !id) return;

    // Check size <= 20MB
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 20 * 1024 * 1024) {
      toast.error('Файлдардың жалпы көлемі 20 МБ-тан аспауы тиіс.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    const iteration = solutions.length + 1;
    
    try {
      const fileUrls: string[] = [];
      const fileNames: string[] = [];
      const fileSizes: string[] = [];

      // Upload files in parallel
      const uploadPromises = files.map(async (file, index) => {
        const fileName = \`\${user.name}_version_\${iteration}_part\${index+1}_\${file.name}\`;
        const storageRef = ref(storage, \`solutions/\${id}/\${fileName}\`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        return new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            () => {},
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const fileSizeStr = (file.size / 1024 / 1024).toFixed(2) + ' MB';
              fileUrls.push(downloadURL);
              fileNames.push(file.name);
              fileSizes.push(fileSizeStr);
              resolve();
            }
          );
        });
      });

      await Promise.all(uploadPromises);

      const solData = {
        assignmentId: id,
        studentId: user.id,
        // Legacy fields for backward compatibility
        fileUrl: fileUrls[0] || '',
        fileName: fileNames.length > 1 ? \`\${fileNames.length} файл\` : fileNames[0],
        fileSize: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
        // New array fields
        fileUrls,
        fileNames,
        fileSizes,
        iteration,
        status: 'pending_ai' as const,
      };
      
      const solId = await createSolution(solData);
      toast.success('Шешім жүктелді! ИИ тексеруде...');

      const aiResult = await analyzeWork(submission.fileUrl, submission.subject, submission.title, fileUrls);
      await createReview(solId, true, aiResult);
      
      toast.success(\`AI талдауы аяқталды! Алдын ала баға: \${aiResult.score}/100\`);
    } catch (err: any) {
      console.error("Upload/Analysis Error:", err);
      toast.error(err.message || 'Жүктеу немесе тексеру қатесі.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };`;

const newHandleMethodsStr = `  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...pendingFiles, ...files];
    const totalSize = newFiles.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 20 * 1024 * 1024) {
      toast.error('Файлдардың жалпы көлемі 20 МБ-тан аспауы тиіс.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingFiles(newFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePendingFile = (indexToRemove: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleCheckAI = async () => {
    if (pendingFiles.length === 0 || !submission || !user || !id) return;
    setUploading(true);
    const iteration = solutions.length + 1;
    
    try {
      const fileUrls: string[] = [];
      const fileNames: string[] = [];
      const fileSizes: string[] = [];

      // Upload files in parallel
      const uploadPromises = pendingFiles.map(async (file, index) => {
        const fileName = \`\${user.name}_version_\${iteration}_part\${index+1}_\${file.name}\`;
        const storageRef = ref(storage, \`solutions/\${id}/\${fileName}\`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        return new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            () => {},
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const fileSizeStr = (file.size / 1024 / 1024).toFixed(2) + ' MB';
              fileUrls.push(downloadURL);
              fileNames.push(file.name);
              fileSizes.push(fileSizeStr);
              resolve();
            }
          );
        });
      });

      await Promise.all(uploadPromises);

      const solData = {
        assignmentId: id,
        studentId: user.id,
        // Legacy fields for backward compatibility
        fileUrl: fileUrls[0] || '',
        fileName: fileNames.length > 1 ? \`\${fileNames.length} файл\` : fileNames[0],
        fileSize: (fileSizes.reduce((acc, curr) => acc + parseFloat(curr), 0)).toFixed(2) + ' MB',
        // New array fields
        fileUrls,
        fileNames,
        fileSizes,
        iteration,
        status: 'pending_ai' as const,
      };
      
      const solId = await createSolution(solData);
      setPendingFiles([]); // clear pending files after successful upload
      toast.success('Шешім жүктелді! ИИ тексеруде...');

      const aiResult = await analyzeWork(submission.fileUrl, submission.subject, submission.title, fileUrls);
      await createReview(solId, true, aiResult);
      
      toast.success(\`AI талдауы аяқталды! Алдын ала баға: \${aiResult.score}/100\`);
    } catch (err: any) {
      console.error("Upload/Analysis Error:", err);
      toast.error(err.message || 'Жүктеу немесе тексеру қатесі.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };`;

content = content.replace(oldHandleFileUploadStr, newHandleMethodsStr);

// 4. Update JSX renderer for empty state -> pendingFiles -> default empty
const emptyStateStr = `               ) : (
                 <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ background: 'var(--bg-secondary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <UploadCloud size={32} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <h3 style={{ marginBottom: '8px' }}>Шешім әлі жүктелмеген</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Тапсырманы орындап, бір немесе бірнеше файл жүктеңіз (20МБ дейін).</p>
                    {canUploadNew && (
                      <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? 'Жүктелуде...' : 'Жүктеу'}
                      </Button>
                    )}
                 </div>
               )}`;

const pendingStateStr = `               ) : pendingFiles.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pendingFiles.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                              <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{f.name}</div>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                          </div>
                          <button onClick={() => handleRemovePendingFile(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <X size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                       <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline">
                         Тағы файл қосу
                       </Button>
                       <Button onClick={handleCheckAI} disabled={uploading} variant="primary">
                         {uploading ? <><Loader size={16} className="spin" /> Жүктелуде...</> : <><Bot size={16} /> ИИ арқылы тексеру</>}
                       </Button>
                    </div>
                  </div>
                ) : (
                 <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ background: 'var(--bg-secondary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <UploadCloud size={32} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <h3 style={{ marginBottom: '8px' }}>Шешім әлі жүктелмеген</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Тапсырманы орындап, бір немесе бірнеше файл жүктеңіз (20МБ дейін).</p>
                    {canUploadNew && (
                      <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        Файл таңдау
                      </Button>
                    )}
                 </div>
               )}`;

content = content.replace(emptyStateStr, pendingStateStr);

// 5. Update input onChange
content = content.replace('onChange={handleFileUpload}', 'onChange={handleFileSelect}');

fs.writeFileSync('src/pages/student/StudentDashboard.tsx', content);
console.log('Success');
