import { useState } from 'react';
import { KeyRound, Loader, CheckCircle } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { findClassByInviteCode } from '../../services/classes';
import { addStudent } from '../../services/students';

export default function JoinClassPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinedClass, setJoinedClass] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !user) return;

    try {
      setLoading(true);
      const found = await findClassByInviteCode(code.trim());
      
      if (!found) {
        toast.error('Бұл код бойынша сынып табылмады. Кодты тексеріңіз.');
        return;
      }

      // Add student to the class
      const result = await addStudent(found.id, user.name, user.email, user.id);
      
      setJoinedClass(found.name);
      if (result.alreadyExisted) {
        toast.info(`Сіз бұл сыныпқа бұрыннан қосылғансыз.`);
      } else {
        toast.success(`"${found.name}" сыныбына сәтті қосылдыңыз!`);
      }
      setCode('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Сыныпқа қосылу кезінде қате пайда болды.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout breadcrumbs={[{ label: 'Сыныпқа қосылу' }]}>
      <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <KeyRound size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Сыныпқа қосылу</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Мұғалімнен алған 6-таңбалы кодты енгізіңіз
          </p>
        </div>

        {joinedClass ? (
          <Card padding="xl" style={{ textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px' }}>Сәтті қосылдыңыз!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Сынып: <strong>{joinedClass}</strong></p>
            <Button variant="ghost" size="sm" style={{ marginTop: '16px' }} onClick={() => setJoinedClass(null)}>
              Тағы бір сыныпқа қосылу
            </Button>
          </Card>
        ) : (
          <Card padding="xl">
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Сынып коды</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="мысалы: A3K7M2"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ fontSize: '1.25rem', textAlign: 'center', letterSpacing: '4px', fontWeight: 600 }}
                  required
                />
              </div>
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading || code.length < 6}>
                {loading ? <Loader size={18} className="spin" /> : 'Қосылу'}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
