import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader, ShieldCheck } from 'lucide-react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Button from '../../components/ui/Button';
import './LoginPage.css';

type PageState = 'checking' | 'ready' | 'submitting' | 'success' | 'error';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [pageState, setPageState] = useState<PageState>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    const verifyLink = async () => {
      if (!auth || mode !== 'resetPassword' || !oobCode) {
        setError('Сілтеме дұрыс емес немесе толық емес. Құпия сөзді қалпына келтіруді қайта бастаңыз.');
        setPageState('error');
        return;
      }

      try {
        const accountEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(accountEmail);
        setPageState('ready');
      } catch (verificationError) {
        console.error('Password reset link verification failed:', verificationError);
        setError('Бұл сілтеменің мерзімі өткен немесе ол бұрын қолданылған. Жаңа сілтеме сұраңыз.');
        setPageState('error');
      }
    };

    verifyLink();
  }, [mode, oobCode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Құпия сөз кемінде 6 таңбадан тұруы керек.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Құпия сөздер сәйкес келмейді.');
      return;
    }

    if (!auth || !oobCode) return;

    setPageState('submitting');
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setPageState('success');
    } catch (resetError) {
      console.error('Password reset failed:', resetError);
      setError('Құпия сөзді өзгерту мүмкін болмады. Жаңа сілтеме сұрап, қайта көріңіз.');
      setPageState('ready');
    }
  };

  return (
    <main className="login-page reset-password-page">
      <div className="login-bg" />
      <section className="login-card reset-password-card">
        {pageState === 'checking' && (
          <div className="reset-status" role="status">
            <div className="login-logo-icon reset-status-icon">
              <Loader size={30} className="spin" />
            </div>
            <h1>Сілтеме тексерілуде</h1>
            <p>Бір сәт күтіңіз, қалпына келтіру сілтемесін тексеріп жатырмыз.</p>
          </div>
        )}

        {pageState === 'error' && (
          <div className="reset-status">
            <div className="login-logo-icon reset-status-icon reset-status-icon-error">
              <KeyRound size={30} />
            </div>
            <h1>Сілтеме жарамсыз</h1>
            <p>{error}</p>
            <Link className="btn btn-primary btn-lg btn-full reset-link-button" to="/forgot-password">
              Жаңа сілтеме алу
            </Link>
          </div>
        )}

        {pageState === 'success' && (
          <div className="reset-status">
            <div className="login-logo-icon reset-status-icon reset-status-icon-success">
              <CheckCircle2 size={32} />
            </div>
            <h1>Құпия сөз өзгертілді</h1>
            <p>Жаңа құпия сөзіңіз сақталды. Енді аккаунтыңызға кіре аласыз.</p>
            <Link className="btn btn-primary btn-lg btn-full reset-link-button" to="/login">
              Кіру бетіне өту
            </Link>
          </div>
        )}

        {(pageState === 'ready' || pageState === 'submitting') && (
          <>
            <div className="login-logo reset-password-heading">
              <div className="login-logo-icon">
                <ShieldCheck size={32} />
              </div>
              <h1>Жаңа құпия сөз</h1>
              <p className="reset-account">{email}</p>
              <p>Аккаунтыңыз үшін есте сақтауға оңай, сенімді құпия сөз орнатыңыз.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {error && <div className="reset-error" role="alert">{error}</div>}

              <div className="form-group">
                <label className="form-label" htmlFor="new-password">Жаңа құпия сөз</label>
                <div className="password-input-wrap">
                  <input
                    id="new-password"
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button
                    className="password-visibility"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Құпия сөзді жасыру' : 'Құпия сөзді көрсету'}
                    title={showPassword ? 'Құпия сөзді жасыру' : 'Құпия сөзді көрсету'}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
                <span className="reset-field-hint">Кемінде 6 таңба</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">Құпия сөзді қайталаңыз</label>
                <input
                  id="confirm-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                type="submit"
                disabled={pageState === 'submitting'}
              >
                {pageState === 'submitting' ? <Loader size={19} className="spin" /> : 'Құпия сөзді сақтау'}
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
