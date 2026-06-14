import { useState, useRef } from 'react';
import { User, Lock, Camera, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { uploadFileToFirebase } from '../../services/storage';
import { getAvatarColor, getInitials } from '../../utils/avatar';
import Button from '../../components/ui/Button';
import MainLayout from '../../components/layout/MainLayout';
import './ProfileSettings.css';

export default function ProfileSettings() {
  const { user, updateUserProfile, updateUserAvatar, resetPassword } = useAuth();
  const toast = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSavingName(true);
    try {
      await updateUserProfile(name);
      toast.success('Профиль сәтті жаңартылды');
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Қате орын алды');
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    setIsSendingReset(true);
    try {
      await resetPassword(user.email);
      toast.success('Құпия сөзді қалпына келтіру сілтемесі поштаңызға жіберілді');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Қате орын алды');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const result = await uploadFileToFirebase(file, 'avatars');
      if (updateUserAvatar) {
        await updateUserAvatar(result.url);
        toast.success('Аватар сәтті жүктелді');
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || 'Суретті жүктеу кезінде қате орын алды');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <MainLayout>
      <div className="settings-page fade-in">
      <div className="settings-header">
        <h1>Профиль баптаулары</h1>
        <p>Жеке мәліметтеріңізді және қауіпсіздік параметрлерін басқарыңыз</p>
      </div>

      <div className="settings-card slide-up" style={{ animationDelay: '0.1s' }}>
        <h2><User size={20} /> Жеке мәліметтер</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
          <div 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              backgroundColor: getAvatarColor(user?.id || user?.email || '', user?.role),
              backgroundImage: user?.avatar ? `url(${user.avatar})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '24px',
              fontWeight: 'bold',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {!user?.avatar && getInitials(user?.name)}
            {isUploadingAvatar && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader size={24} className="spin" color="white" />
              </div>
            )}
          </div>
          <div>
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleAvatarChange}
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              <Camera size={16} style={{ marginRight: '8px' }} />
              Аватарды өзгерту
            </Button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Ұсынылатын формат: JPG, PNG. Макс: 5MB.
            </p>
          </div>
        </div>

        <form className="settings-form" onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              value={user?.email || ''}
              disabled
            />
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="name">Толық аты-жөні</label>
            <input
              id="name"
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          


          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button type="submit" variant="primary" isLoading={isSavingName}>
              Сақтау
            </Button>
          </div>
        </form>
      </div>

      <div className="settings-card slide-up" style={{ animationDelay: '0.2s' }}>
        <h2><Lock size={20} /> Қауіпсіздік</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Құпия сөзді өзгерту үшін төмендегі батырманы басыңыз. Біз сіздің поштаңызға құпия сөзді қалпына келтіру сілтемесін жібереміз.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Button 
              variant="outline" 
              onClick={handlePasswordReset}
              isLoading={isSendingReset}
            >
              Құпия сөзді өзгерту сілтемесін алу
            </Button>
          </div>
        </div>
      </div>
      </div>
    </MainLayout>
  );
}
