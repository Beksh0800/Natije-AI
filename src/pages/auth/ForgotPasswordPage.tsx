import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { KeyRound, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import './LoginPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Электрондық поштаны енгізіңіз');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      toast.success('Құпия сөзді қалпына келтіру сілтемесі поштаңызға жіберілді');
      setEmail('');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Қате орын алды');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card" style={{ maxWidth: '400px' }}>
        <div className="login-logo">
          <div className="login-logo-icon">
            <KeyRound size={32} />
          </div>
          <h1>Құпия сөзді қалпына келтіру</h1>
          <p>Поштаңызды енгізіңіз, біз сізге құпия сөзді қалпына келтіру нұсқауларын жібереміз.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="example@mektep.kz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading}
          >
            Жіберу
          </Button>
        </form>

        <div className="login-footer" style={{ marginTop: '24px' }}>
          <p>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              <ArrowLeft size={16} /> Артқа қайту
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
