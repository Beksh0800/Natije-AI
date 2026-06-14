import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Sun, Moon, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { theme, toggleTheme } = useTheme();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      await login(email, password);
      // AuthContext's onAuthStateChanged will update user and AppRoutes will redirect based on role automatically.
      // But we can fallback to navigate('/') just in case.
      navigate('/');
    } catch (err: any) { console.error(err);
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        setError('Бұл email-мен аккаунт табылмады. Алдымен тіркеліңіз.');
      } else if (code === 'auth/wrong-password') {
        setError('Құпия сөз дұрыс емес. Қайта көріңіз.');
      } else if (code === 'auth/invalid-credential') {
        setError('Email немесе құпия сөз дұрыс емес.');
      } else if (code === 'auth/too-many-requests') {
        setError('Тым көп әрекет жасадыңыз. Біраз кейін қайта көріңіз.');
      } else if (code === 'auth/invalid-email') {
        setError('Email форматы дұрыс емес.');
      } else {
        setError('Кіру кезінде қате пайда болды. Қайта көріңіз.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      {/* Theme Toggle */}
      <button className="theme-toggle login-theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={32} />
          </div>
          <h1>NÄTIJE AI</h1>
          <p>Smart Learning Ecosystem</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div style={{ color: 'var(--color-error)', fontSize: '0.8125rem', marginBottom: '8px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="Email адресіңізді енгізіңіз"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Құпия сөз</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="Құпия сөзіңізді енгізіңіз"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="forgot-password">
              <Link to="/forgot-password">Құпия сөзді ұмыттыңыз ба?</Link>
            </div>
          </div>

          <Button variant="primary" size="lg" fullWidth type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader size={18} className="spin" /> : 'Кіру'}
          </Button>
        </form>

        <div className="login-footer">
          <p>
            Аккаунтыңыз жоқ па? <Link to="/register">Тіркелу</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
