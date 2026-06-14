import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import type { ReactNode } from 'react';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn()
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn()
}));

// Mock Firebase App
vi.mock('../../lib/firebase', () => ({
  auth: {},
  db: {}
}));

// A test component to consume AuthContext
function TestComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Logged In' : 'Logged Out'}</div>
      <div data-testid="user-email">{user?.email || 'No User'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides logged out state initially when no user', async () => {
    // Setup onAuthStateChanged to immediately call callback with null
    (onAuthStateChanged as any).mockImplementation((auth: any, callback: any) => {
      callback(null);
      return () => {}; // unsubscribe fn
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Logged Out');
    expect(screen.getByTestId('user-email')).toHaveTextContent('No User');
  });

  it('provides logged in state when user exists in auth and firestore', async () => {
    const mockFirebaseUser = { uid: '123', email: 'test@example.com' };
    const mockFirestoreData = { name: 'Test User', role: 'teacher', createdAt: '2023-01-01' };

    (onAuthStateChanged as any).mockImplementation((auth: any, callback: any) => {
      callback(mockFirebaseUser);
      return () => {};
    });

    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => mockFirestoreData
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Logged In');
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
  });

  it('calls Firebase signInWithEmailAndPassword on login', async () => {
    (onAuthStateChanged as any).mockImplementation((auth: any, callback: any) => {
      callback(null);
      return () => {};
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, 'test@example.com', 'password');
  });

  it('calls Firebase signOut on logout', async () => {
    (onAuthStateChanged as any).mockImplementation((auth: any, callback: any) => {
      callback(null);
      return () => {};
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(signOut).toHaveBeenCalled();
  });
});
