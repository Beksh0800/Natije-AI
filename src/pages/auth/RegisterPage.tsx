import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Sun, Moon, GraduationCap, BookOpen, Users, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import type { UserRole } from '../../types';
import './LoginPage.css'; // Reusing the same CSS for consistent layout

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { theme, toggleTheme } = useTheme();
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Құпия сөз тым қысқа. Кемінде 6 таңба болуы керек.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await register(email, password, name, role);
      // Wait a moment for auth state to propagate, or just navigate
      navigate('/');
    } catch (err: any) { console.error(err);
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('Бұл email-мен аккаунт бұрыннан бар. Кіру бетіне өтіңіз.');
      } else if (code === 'auth/weak-password') {
        setError('Құпия сөз тым қысқа. Кемінде 6 таңба болуы керек.');
      } else if (code === 'auth/invalid-email') {
        setError('Email форматы дұрыс емес. Тексеріп қайта жазыңыз.');
      } else {
        setError('Тіркелу кезінде қате пайда болды. Қайта көріңіз.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    { key: 'student' as UserRole, icon: <GraduationCap size={24} />, label: 'Оқушы', desc: 'Ученик' },
    { key: 'teacher' as UserRole, icon: <BookOpen size={24} />, label: 'Мұғалім', desc: 'Учитель' },
    { key: 'parent' as UserRole, icon: <Users size={24} />, label: 'Ата-ана', desc: 'Родитель' },
  ];

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
          <h1>Тіркелу</h1>
          <p>NÄTIJE AI платформасына қосылыңыз</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div style={{ color: 'var(--color-error)', fontSize: '0.8125rem', marginBottom: '8px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Role Selector */}
          <div className="form-group">
            <label className="form-label">Рөліңізді таңдаңыз</label>
            <div className="role-selector">
              {roles.map(r => (
                <div
                  key={r.key}
                  className={`role-option ${role === r.key ? 'role-option-active' : ''}`}
                  onClick={() => setRole(r.key)}
                >
                  <div className="role-option-icon">{r.icon}</div>
                  <div className="role-option-label">{r.label}</div>
                  <div className="role-option-desc">{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">Толық аты-жөніңіз</label>
            <input
              id="name"
              className="form-input"
              type="text"
              placeholder="Аты-жөніңізді енгізіңіз"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              placeholder="Құпия сөзіңізді енгізіңіз (кемінде 6 таңба)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button variant="primary" size="lg" fullWidth type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader size={18} className="spin" /> : 'Тіркелу'}
          </Button>
        </form>

        <div className="login-footer">
          <p>
            Аккаунтыңыз бар ма? <Link to="/login">Кіру</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
