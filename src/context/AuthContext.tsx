import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { DEMO_PROFILES, PoultryStorageService } from '../services/storage';
import {
  auth,
  db,
  signInWithGoogle as firebaseSignInWithGoogle,
  signInWithEmail as firebaseSignInWithEmail,
  signUpWithEmail as firebaseSignUpWithEmail,
  logOutFirebase,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isFirebaseConnected: boolean;
  isLoading: boolean;
  isGuest: boolean;
  authPromptReason: string | null;
  setAuthPromptReason: (msg: string | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  openAuthModalWithReason: (reason?: string) => void;
  login: (email: string, password?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  register: (profileData: Omit<UserProfile, 'uid' | 'registrationDate'>, password?: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (uid: string) => void;
  switchToDemo: () => void;
  updateProfile: (updatedData: Partial<UserProfile>) => void;
  allDemoUsers: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authPromptReason, setAuthPromptReason] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Check if UID belongs to demo profiles
  const isDemoUid = (uid?: string | null): boolean => {
    if (!uid) return true;
    return DEMO_PROFILES.some((p) => p.uid === uid);
  };

  // Guest mode is true if not authenticated with Firebase AND user is a demo profile
  const isGuest = !firebaseUser && isDemoUid(currentUser?.uid);

  const openAuthModalWithReason = (reason?: string) => {
    setAuthPromptReason(
      reason || 'আপনার নিজস্ব খামারের তথ্য সংরক্ষণ করতে অনুগ্রহ করে একাউন্ট তৈরি করুন বা লগইন করুন।'
    );
    setIsAuthModalOpen(true);
  };

  // Sync with Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        setIsFirebaseConnected(true);

        // Fetch or create profile in Firestore
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setCurrentUser(data);
            PoultryStorageService.saveUser(data);
            PoultryStorageService.setActiveUserId(data.uid);
          } else {
            // New user profile created from Firebase Auth
            const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'খামারী';
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              name: displayName,
              farmName: `${displayName} পোল্ট্রি ফার্ম`,
              phone: fbUser.phoneNumber || '০১৭০০-০০০০০০',
              location: 'বাংলাদেশ',
              capacity: 1000,
              birdType: 'ব্রয়লার',
              registrationDate: new Date().toISOString().split('T')[0]
            };

            await setDoc(userDocRef, newProfile);
            setCurrentUser(newProfile);
            PoultryStorageService.saveUser(newProfile);
            PoultryStorageService.setActiveUserId(newProfile.uid);
          }

          // Sync batches, records, medicines, expenses, and sales from Cloud Firestore
          await PoultryStorageService.syncUserFromFirestore(fbUser.uid);
        } catch (err) {
          console.warn('Firestore profile sync error:', err);
          const localProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'খামারী',
            farmName: `${fbUser.displayName || 'খামারী'} পোল্ট্রি ফার্ম`,
            phone: '০১৭০০-০০০০০০',
            location: 'বাংলাদেশ',
            capacity: 1000,
            birdType: 'ব্রয়লার',
            registrationDate: new Date().toISOString().split('T')[0]
          };
          setCurrentUser(localProfile);
          PoultryStorageService.saveUser(localProfile);
          PoultryStorageService.setActiveUserId(fbUser.uid);
        }
      } else {
        setFirebaseUser(null);
        // Fallback to active local session or default demo profile (Hasan)
        const activeUid = PoultryStorageService.getActiveUserId();
        if (activeUid) {
          const user = PoultryStorageService.getUserById(activeUid);
          if (user) {
            setCurrentUser(user);
          } else {
            const defaultDemo = DEMO_PROFILES[0];
            setCurrentUser(defaultDemo);
            PoultryStorageService.setActiveUserId(defaultDemo.uid);
          }
        } else {
          const defaultDemo = DEMO_PROFILES[0];
          setCurrentUser(defaultDemo);
          PoultryStorageService.setActiveUserId(defaultDemo.uid);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Google Login via Firebase Popup
  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const user = await firebaseSignInWithGoogle();
      if (!user) {
        setIsLoading(false);
        return false;
      }
      setAuthPromptReason(null);
      return true;
    } catch (err: any) {
      setIsLoading(false);
      console.error('Google login failed:', err);
      throw err;
    }
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // Try Firebase Email Auth if password is supplied
    if (password && password.length >= 6) {
      try {
        const fbUser = await firebaseSignInWithEmail(cleanEmail, password);
        if (fbUser) {
          setAuthPromptReason(null);
          setIsLoading(false);
          return true;
        }
      } catch (fbErr: any) {
        console.warn('Firebase email auth sign-in error:', fbErr?.message);
        // If user not found and password provided, bubble error or fallback to local
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    let user = PoultryStorageService.getUserByEmail(cleanEmail);
    if (!user) {
      const randomCode = Math.floor(100000 + Math.random() * 900000);
      const username = cleanEmail.split('@')[0];
      const newProfile: UserProfile = {
        uid: `FRM-REG-${randomCode}`,
        email: cleanEmail,
        name: `${username} (খামারী)`,
        farmName: `${username} পোল্ট্রি খামার`,
        phone: '০১৭০০-০০০০০০',
        location: 'বাংলাদেশ',
        capacity: 1000,
        birdType: 'ব্রয়লার',
        registrationDate: new Date().toISOString().split('T')[0]
      };
      PoultryStorageService.saveUser(newProfile);
      user = newProfile;
    }

    setCurrentUser(user);
    PoultryStorageService.setActiveUserId(user.uid);
    setAuthPromptReason(null);
    setIsLoading(false);
    return true;
  };

  const register = async (
    profileData: Omit<UserProfile, 'uid' | 'registrationDate'>,
    password?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    const cleanEmail = profileData.email.trim().toLowerCase();

    // Try Firebase Email Registration if password provided
    if (password && password.length >= 6) {
      try {
        const fbUser = await firebaseSignUpWithEmail(cleanEmail, password);
        if (fbUser) {
          const newProfile: UserProfile = {
            ...profileData,
            email: cleanEmail,
            uid: fbUser.uid,
            registrationDate: new Date().toISOString().split('T')[0]
          };

          try {
            await setDoc(doc(db, 'users', fbUser.uid), newProfile);
          } catch (e) {
            console.warn('Firestore setDoc failed:', e);
          }

          setCurrentUser(newProfile);
          PoultryStorageService.saveUser(newProfile);
          PoultryStorageService.setActiveUserId(newProfile.uid);
          setAuthPromptReason(null);
          setIsLoading(false);
          return true;
        }
      } catch (fbErr: any) {
        console.warn('Firebase email sign-up error, proceeding with local registered user:', fbErr?.message);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const newUid = `FRM-REG-${randomCode}`;

    const newProfile: UserProfile = {
      ...profileData,
      uid: newUid,
      email: cleanEmail,
      registrationDate: new Date().toISOString().split('T')[0]
    };

    PoultryStorageService.saveUser(newProfile);
    setCurrentUser(newProfile);
    PoultryStorageService.setActiveUserId(newUid);

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), newProfile);
      } catch (err) {
        console.warn('Firestore setDoc failed:', err);
      }
    }

    setAuthPromptReason(null);
    setIsLoading(false);
    return true;
  };

  const logout = async () => {
    try {
      await logOutFirebase();
    } catch (err) {
      console.warn('Firebase logout failed:', err);
    }
    // Return to demo mode
    const demoUser = DEMO_PROFILES[0];
    PoultryStorageService.setActiveUserId(demoUser.uid);
    setCurrentUser(demoUser);
  };

  const switchToDemo = () => {
    const demoUser = DEMO_PROFILES[0];
    PoultryStorageService.setActiveUserId(demoUser.uid);
    setCurrentUser(demoUser);
  };

  const switchUser = (uid: string) => {
    const user = PoultryStorageService.getUserById(uid);
    if (user) {
      setCurrentUser(user);
      PoultryStorageService.setActiveUserId(user.uid);
    }
  };

  const updateProfile = async (updatedData: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      ...updatedData,
      uid: currentUser.uid
    };
    PoultryStorageService.saveUser(updated);
    setCurrentUser(updated);

    // Sync to Firestore if authenticated with Firebase
    if (auth.currentUser && auth.currentUser.uid === currentUser.uid) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
      } catch (err) {
        console.warn('Firestore profile update error:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isFirebaseConnected,
        isLoading,
        isGuest,
        authPromptReason,
        setAuthPromptReason,
        isAuthModalOpen,
        setIsAuthModalOpen,
        openAuthModalWithReason,
        login,
        loginWithGoogle,
        register,
        logout,
        switchUser,
        switchToDemo,
        updateProfile,
        allDemoUsers: PoultryStorageService.getUsers()
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
