import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (name: string) => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore after Firebase Auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          if (!db) throw new Error("Firestore not initialized");
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              name: userData.name || 'Аноним',
              email: firebaseUser.email || '',
              role: userData.role || 'student',
              classInfo: userData.classInfo,
              parentCode: userData.parentCode,
              createdAt: userData.createdAt || new Date().toISOString(),
            });
          } else {
            setUser({
              id: firebaseUser.uid,
              name: 'Аноним',
              email: firebaseUser.email || '',
              role: 'student',
              createdAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase Auth not initialized');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    if (!auth || !db) throw new Error('Firebase not initialized');
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let parentCode = '';
    for (let i = 0; i < 6; i++) {
      parentCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      name,
      email,
      role,
      parentCode: role === 'student' ? parentCode : null,
      createdAt: new Date().toISOString()
    });
  };

  const logout = async () => {
    if (!auth) throw new Error('Firebase Auth not initialized');
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Firebase Auth not initialized');
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (name: string) => {
    if (!auth?.currentUser || !db) throw new Error('Firebase not initialized');
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { name });
    setUser(prev => prev ? { ...prev, name } : null);
  };

  const updateUserAvatar = async (avatarUrl: string) => {
    if (!auth?.currentUser || !db) throw new Error('Firebase not initialized');
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { avatar: avatarUrl });
    setUser(prev => prev ? { ...prev, avatar: avatarUrl } : null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      loading,
      login, 
      register,
      logout,
      resetPassword,
      updateUserProfile,
      updateUserAvatar
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
