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
import { normalizeIdentifier, simpleHash } from '../utils/formatters';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isFirebaseConnected: boolean;
  isLoading: boolean;
  isGuest: boolean;
  syncVersion: number;
  notifyDataChanged: () => void;
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
  const [syncVersion, setSyncVersion] = useState<number>(0);
  const [authPromptReason, setAuthPromptReason] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const notifyDataChanged = () => {
    setSyncVersion((v) => v + 1);
  };

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

        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          let profile: UserProfile;

          if (snap.exists()) {
            profile = snap.data() as UserProfile;
          } else {
            const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'খামারী';
            profile = {
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
            await setDoc(userDocRef, profile);
          }

          PoultryStorageService.saveUser(profile);
          PoultryStorageService.setActiveUserId(profile.uid);

          // CRITICAL: Pull all previous batches and data from Cloud Firestore BEFORE setting state!
          await PoultryStorageService.syncUserFromFirestore(profile.uid);

          setCurrentUser(profile);
          setSyncVersion((v) => v + 1);
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
          PoultryStorageService.saveUser(localProfile);
          PoultryStorageService.setActiveUserId(fbUser.uid);
          await PoultryStorageService.syncUserFromFirestore(fbUser.uid);
          setCurrentUser(localProfile);
          setSyncVersion((v) => v + 1);
        }
      } else {
        setFirebaseUser(null);
        // Fallback to active local session or default demo profile (Hasan)
        const activeUid = PoultryStorageService.getActiveUserId();
        if (activeUid && !isDemoUid(activeUid)) {
          const user = PoultryStorageService.getUserById(activeUid);
          if (user) {
            await PoultryStorageService.syncUserFromFirestore(user.uid);
            setCurrentUser(user);
            setSyncVersion((v) => v + 1);
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

  const login = async (identifier: string, password?: string): Promise<boolean> => {
    setIsLoading(true);
    const { cleanInput, authEmail } = normalizeIdentifier(identifier);

    if (!password || password.length < 6) {
      setIsLoading(false);
      throw new Error('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
    }

    // 1. Verify if account exists
    const existingUser = PoultryStorageService.getUserByEmailOrPhone(cleanInput);
    if (!existingUser) {
      setIsLoading(false);
      throw new Error('এই মোবাইল নম্বর বা ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে প্রথমে নতুন একাউন্ট নিবন্ধন করুন।');
    }

    // 2. Strict password validation against stored passwordHash
    if (existingUser.passwordHash) {
      if (existingUser.passwordHash !== simpleHash(password)) {
        setIsLoading(false);
        throw new Error('ভুল পাসওয়ার্ড দিয়েছেন! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।');
      }
    }

    // 3. Authenticate with Firebase if configured
    try {
      const fbUser = await firebaseSignInWithEmail(authEmail, password);
      if (fbUser) {
        setAuthPromptReason(null);
        return true;
      }
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/wrong-password' || fbErr?.code === 'auth/invalid-credential') {
        setIsLoading(false);
        throw new Error('ভুল পাসওয়ার্ড দিয়েছেন! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।');
      }
      // If user had no stored passwordHash yet (e.g. legacy demo user), securely bind this password
      if (!existingUser.passwordHash) {
        existingUser.passwordHash = simpleHash(password);
        PoultryStorageService.saveUser(existingUser);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Successful verified login
    PoultryStorageService.saveUser(existingUser);
    PoultryStorageService.setActiveUserId(existingUser.uid);
    await PoultryStorageService.syncUserFromFirestore(existingUser.uid);

    setCurrentUser(existingUser);
    setSyncVersion((v) => v + 1);
    setAuthPromptReason(null);
    setIsLoading(false);
    return true;
  };

  const register = async (
    profileData: Omit<UserProfile, 'uid' | 'registrationDate'>,
    password?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    const { isPhone, cleanInput, authEmail, displayPhone } = normalizeIdentifier(profileData.email);

    if (!password || password.length < 6) {
      setIsLoading(false);
      throw new Error('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।');
    }

    // Check if account already exists
    const existing = PoultryStorageService.getUserByEmailOrPhone(cleanInput);
    if (existing) {
      setIsLoading(false);
      throw new Error('এই মোবাইল নম্বর বা ইমেইল দিয়ে ইতোমধ্যে একাউন্ট খোলা আছে। অনুগ্রহ করে পাসওয়ার্ড দিয়ে লগইন করুন।');
    }

    const passHash = simpleHash(password);

    // Try Firebase Email Registration if password provided
    if (password && password.length >= 6) {
      try {
        const fbUser = await firebaseSignUpWithEmail(authEmail, password);
        if (fbUser) {
          const newProfile: UserProfile = {
            ...profileData,
            email: isPhone ? authEmail : cleanInput,
            phone: profileData.phone || (isPhone ? displayPhone : '০১৭০০-০০০০০০'),
            uid: fbUser.uid,
            registrationDate: new Date().toISOString().split('T')[0],
            passwordHash: passHash
          };

          try {
            await setDoc(doc(db, 'users', fbUser.uid), newProfile);
          } catch (e) {
            console.warn('Firestore setDoc failed:', e);
          }

          PoultryStorageService.saveUser(newProfile);
          PoultryStorageService.setActiveUserId(newProfile.uid);
          await PoultryStorageService.syncUserFromFirestore(newProfile.uid);
          setCurrentUser(newProfile);
          setSyncVersion((v) => v + 1);
          setAuthPromptReason(null);
          setIsLoading(false);
          return true;
        }
      } catch (fbErr: any) {
        console.warn('Firebase email sign-up error, proceeding with registered user:', fbErr?.message);
        if (fbErr?.code === 'auth/email-already-in-use') {
          setIsLoading(false);
          throw new Error('এই মোবাইল নম্বর বা ইমেইল দিয়ে ইতোমধ্যে একাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।');
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    const uid = PoultryStorageService.getDeterministicUid(cleanInput);

    const savedProfile: UserProfile = {
      ...profileData,
      uid,
      email: isPhone ? authEmail : cleanInput,
      phone: profileData.phone || (isPhone ? displayPhone : '০১৭০০-০০০০০০'),
      registrationDate: new Date().toISOString().split('T')[0],
      passwordHash: passHash
    };

    PoultryStorageService.saveUser(savedProfile);
    PoultryStorageService.setActiveUserId(uid);

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), savedProfile);
      } catch (err) {
        console.warn('Firestore setDoc failed:', err);
      }
    }

    await PoultryStorageService.syncUserFromFirestore(uid);
    setCurrentUser(savedProfile);
    setSyncVersion((v) => v + 1);
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
        syncVersion,
        notifyDataChanged,
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
