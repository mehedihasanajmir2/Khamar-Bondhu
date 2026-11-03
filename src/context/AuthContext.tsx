import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { DEMO_PROFILES, PoultryStorageService, cleanForFirestore } from '../services/storage';
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
          let user = PoultryStorageService.getUserById(activeUid);
          if (!user) {
            try {
              const uSnap = await getDoc(doc(db, 'users', activeUid));
              if (uSnap.exists()) {
                user = uSnap.data() as UserProfile;
                PoultryStorageService.saveUser(user);
              }
            } catch (e) {
              console.warn('Fetch active user error:', e);
            }
          }
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
    const { cleanInput, authEmail, displayPhone, isPhone } = normalizeIdentifier(identifier);

    if (!password || password.length < 6) {
      setIsLoading(false);
      throw new Error('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
    }

    const passHash = simpleHash(password);
    const deterministicUid = PoultryStorageService.getDeterministicUid(cleanInput);

    // 1. Instant check in LocalStorage (< 50ms)
    let matchedProfile =
      PoultryStorageService.getUserById(deterministicUid) ||
      PoultryStorageService.getUserByEmailOrPhone(cleanInput);

    if (matchedProfile) {
      matchedProfile.passwordHash = passHash;
      PoultryStorageService.saveUser(matchedProfile);
      PoultryStorageService.setActiveUserId(matchedProfile.uid);
      setCurrentUser(matchedProfile);
      setSyncVersion((v) => v + 1);
      setAuthPromptReason(null);
      setIsLoading(false);

      // Background cloud sync (non-blocking)
      const userUid = matchedProfile.uid;
      const cached = matchedProfile;
      setTimeout(() => {
        setDoc(doc(db, 'users', userUid), cleanForFirestore(cached), { merge: true })
          .then(() => PoultryStorageService.syncUserFromFirestore(userUid))
          .then((synced) => {
            if (synced) setSyncVersion((v) => v + 1);
          })
          .catch((err) => console.warn('Background sync error:', err));
      }, 0);

      return true;
    }

    // 2. Cross-device lookup in Cloud Firestore with a fast 1.5s timeout!
    try {
      const userDocRef = doc(db, 'users', deterministicUid);
      const userSnap: any = await Promise.race([
        getDoc(userDocRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
      ]);
      if (userSnap && typeof userSnap.exists === 'function' && userSnap.exists()) {
        matchedProfile = userSnap.data() as UserProfile;
        matchedProfile.passwordHash = passHash;
      }
    } catch (err) {
      console.warn('Firestore fetch user error:', err);
    }

    // 3. Fallback / First-time account initialization
    if (!matchedProfile) {
      matchedProfile = {
        uid: deterministicUid,
        name: 'খামারী',
        farmName: 'ফার্মহিসাব পোল্ট্রি খামার',
        email: isPhone ? authEmail : cleanInput,
        phone: isPhone ? displayPhone : '০১৭০০-০০০০০০',
        location: 'বাংলাদেশ',
        capacity: 1000,
        birdType: 'ব্রয়লার',
        registrationDate: new Date().toISOString().split('T')[0],
        passwordHash: passHash
      };
    }

    // 4. Save and activate user immediately (User is logged in right away!)
    PoultryStorageService.saveUser(matchedProfile);
    PoultryStorageService.setActiveUserId(matchedProfile.uid);
    setCurrentUser(matchedProfile);
    setSyncVersion((v) => v + 1);
    setAuthPromptReason(null);
    setIsLoading(false);

    // 5. Background sync for batches & subcollections (non-blocking)
    const activeUid = matchedProfile.uid;
    const finalProfile = matchedProfile;
    setTimeout(() => {
      setDoc(doc(db, 'users', activeUid), cleanForFirestore(finalProfile), { merge: true })
        .then(() => PoultryStorageService.syncUserFromFirestore(activeUid))
        .then((synced) => {
          if (synced) setSyncVersion((v) => v + 1);
        })
        .catch((e) => console.warn('Background sync error:', e));
    }, 0);

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

    const uid = PoultryStorageService.getDeterministicUid(cleanInput);
    const passHash = simpleHash(password);

    // 1. Strict uniqueness check across local registered profiles
    const isTakenLocally = PoultryStorageService.isEmailOrPhoneTaken(cleanInput, profileData.phone);
    if (isTakenLocally) {
      setIsLoading(false);
      throw new Error(
        'এই জিমেইল অথবা মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি একাউন্ট খোলা আছে! একটি জিমেইল বা মোবাইল নম্বর দিয়ে কেবল ১ বারই একাউন্ট খোলা যাবে। অনুগ্রহ করে আপনার পূর্বের একাউন্টে লগইন করুন।'
      );
    }

    // 2. Strict uniqueness check against Cloud Firestore with fast timeout
    try {
      const userDocRef = doc(db, 'users', uid);
      const existingDoc: any = await Promise.race([
        getDoc(userDocRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200))
      ]);
      if (existingDoc && typeof existingDoc.exists === 'function' && existingDoc.exists()) {
        setIsLoading(false);
        throw new Error(
          'এই জিমেইল অথবা মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি একাউন্ট খোলা আছে! একটি জিমেইল বা মোবাইল নম্বর দিয়ে কেবল ১ বারই একাউন্ট খোলা যাবে। অনুগ্রহ করে আপনার পূর্বের একাউন্টে লগইন করুন।'
        );
      }
    } catch (e: any) {
      if (e.message && e.message.includes('ইতোমধ্যে একটি একাউন্ট খোলা আছে')) {
        throw e;
      }
    }

    const savedProfile: UserProfile = {
      ...profileData,
      uid,
      email: isPhone ? authEmail : cleanInput,
      phone: profileData.phone || (isPhone ? displayPhone : '০১৭০০-০০০০০০'),
      registrationDate: new Date().toISOString().split('T')[0],
      passwordHash: passHash
    };

    // Activate immediately on this device
    PoultryStorageService.saveUser(savedProfile);
    PoultryStorageService.setActiveUserId(uid);
    setCurrentUser(savedProfile);
    setSyncVersion((v) => v + 1);
    setAuthPromptReason(null);
    setIsLoading(false);

    // Async push to Cloud Firestore in background
    setTimeout(() => {
      setDoc(doc(db, 'users', uid), cleanForFirestore(savedProfile), { merge: true })
        .then(() => PoultryStorageService.syncUserFromFirestore(uid))
        .catch((err) => console.warn('Firestore setDoc user error:', err));
    }, 0);

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
