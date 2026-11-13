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
    let settled = false;
    const finishBoot = () => {
      if (!settled) {
        settled = true;
        setIsLoading(false);
      }
    };

    // Hard failsafe: never keep the app stuck on boot loading screen
    const bootFailsafeTimer = setTimeout(() => {
      if (!settled) {
        const activeUid = PoultryStorageService.getActiveUserId();
        const fallbackUser =
          (activeUid ? PoultryStorageService.getUserById(activeUid) : null) || DEMO_PROFILES[0];
        setCurrentUser((prev) => prev || fallbackUser);
        finishBoot();
      }
    }, 3000);

    const normalizeProfile = (raw: UserProfile): UserProfile => ({
      ...raw,
      uid: raw.uid || 'usr_farm',
      name: raw.name || 'খামারী',
      farmName: raw.farmName || 'পোল্ট্রি ফার্ম',
      phone: raw.phone || '০১৭০০-০০০০০০',
      location: raw.location || 'বাংলাদেশ',
      capacity: Number(raw.capacity) || 1000,
      birdType: raw.birdType || 'ব্রয়লার',
      registrationDate: raw.registrationDate || new Date().toISOString().split('T')[0]
    });

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        setIsFirebaseConnected(true);

        const cachedProfile = PoultryStorageService.getUserById(fbUser.uid);
        if (cachedProfile) {
          setCurrentUser(normalizeProfile(cachedProfile));
          PoultryStorageService.setActiveUserId(cachedProfile.uid);
          finishBoot();
        }

        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap: any = await Promise.race([
            getDoc(userDocRef),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
          ]);
          let profile: UserProfile;

          if (snap && typeof snap.exists === 'function' && snap.exists()) {
            profile = normalizeProfile(snap.data() as UserProfile);
          } else {
            const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'খামারী';
            profile = normalizeProfile({
              uid: fbUser.uid,
              email: fbUser.email || '',
              name: displayName,
              farmName: `${displayName} পোল্ট্রি ফার্ম`,
              phone: fbUser.phoneNumber || '০১৭০০-০০০০০০',
              location: 'বাংলাদেশ',
              capacity: 1000,
              birdType: 'ব্রয়লার',
              registrationDate: new Date().toISOString().split('T')[0]
            });
            setDoc(userDocRef, profile).catch(() => {});
          }

          PoultryStorageService.saveUser(profile);
          PoultryStorageService.setActiveUserId(profile.uid);
          setCurrentUser(profile);
          setSyncVersion((v) => v + 1);
          finishBoot();

          // Sync cloud batches in background without blocking UI
          PoultryStorageService.syncUserFromFirestore(profile.uid)
            .then((synced) => {
              if (synced) setSyncVersion((v) => v + 1);
            })
            .catch(() => {});
        } catch (err) {
          console.warn('Firestore profile sync error:', err);
          const localProfile = normalizeProfile({
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'খামারী',
            farmName: `${fbUser.displayName || 'খামারী'} পোল্ট্রি ফার্ম`,
            phone: '০১৭০০-০০০০০০',
            location: 'বাংলাদেশ',
            capacity: 1000,
            birdType: 'ব্রয়লার',
            registrationDate: new Date().toISOString().split('T')[0]
          });
          PoultryStorageService.saveUser(localProfile);
          PoultryStorageService.setActiveUserId(fbUser.uid);
          setCurrentUser(localProfile);
          setSyncVersion((v) => v + 1);
          finishBoot();
        }
      } else {
        setFirebaseUser(null);
        const activeUid = PoultryStorageService.getActiveUserId();
        if (activeUid && !isDemoUid(activeUid)) {
          let user = PoultryStorageService.getUserById(activeUid);
          if (user) {
            const safeUser = normalizeProfile(user);
            setCurrentUser(safeUser);
            setSyncVersion((v) => v + 1);
            finishBoot();

            PoultryStorageService.syncUserFromFirestore(safeUser.uid)
              .then((synced) => {
                if (synced) setSyncVersion((v) => v + 1);
              })
              .catch(() => {});
          } else {
            try {
              const uSnap: any = await Promise.race([
                getDoc(doc(db, 'users', activeUid)),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
              ]);
              if (uSnap && typeof uSnap.exists === 'function' && uSnap.exists()) {
                user = normalizeProfile(uSnap.data() as UserProfile);
                PoultryStorageService.saveUser(user);
              }
            } catch (e) {
              console.warn('Fetch active user error:', e);
            }

            if (user) {
              setCurrentUser(normalizeProfile(user));
              setSyncVersion((v) => v + 1);
              finishBoot();
              PoultryStorageService.syncUserFromFirestore(user.uid)
                .then((synced) => {
                  if (synced) setSyncVersion((v) => v + 1);
                })
                .catch(() => {});
            } else {
              const defaultDemo = DEMO_PROFILES[0];
              setCurrentUser(defaultDemo);
              PoultryStorageService.setActiveUserId(defaultDemo.uid);
              finishBoot();
            }
          }
        } else {
          const defaultDemo = DEMO_PROFILES[0];
          setCurrentUser(defaultDemo);
          PoultryStorageService.setActiveUserId(defaultDemo.uid);
          finishBoot();
        }
      }
    });

    return () => {
      clearTimeout(bootFailsafeTimer);
      unsubscribe();
    };
  }, []);

  // Google Login via Firebase Popup
  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const user = await firebaseSignInWithGoogle();
      if (!user) {
        return false;
      }
      setAuthPromptReason(null);
      setIsAuthModalOpen(false);
      return true;
    } catch (err: any) {
      console.error('Google login failed:', err);
      throw err;
    }
  };

  const login = async (identifier: string, password?: string): Promise<boolean> => {
    const { cleanInput, authEmail, isPhone } = normalizeIdentifier(identifier);

    if (!password || password.length < 6) {
      throw new Error('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
    }

    const passHash = simpleHash(password);
    const deterministicUid = PoultryStorageService.getDeterministicUid(cleanInput);

    // 1. Look up profile in local storage
    let matchedProfile =
      PoultryStorageService.getUserById(deterministicUid) ||
      PoultryStorageService.getUserByEmailOrPhone(cleanInput);

    // 2. If not found in local storage, check Cloud Firestore
    if (!matchedProfile) {
      try {
        const uidsToCheck = [deterministicUid];
        if (isPhone) {
          uidsToCheck.push(PoultryStorageService.getDeterministicUid(authEmail));
        }
        for (const uidToCheck of uidsToCheck) {
          const userDocRef = doc(db, 'users', uidToCheck);
          const userSnap: any = await Promise.race([
            getDoc(userDocRef),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500))
          ]);
          if (userSnap && typeof userSnap.exists === 'function' && userSnap.exists()) {
            matchedProfile = userSnap.data() as UserProfile;
            break;
          }
        }
      } catch (err) {
        console.warn('Firestore fetch user error:', err);
      }
    }

    // 3. User account MUST exist! Never auto-create during login
    if (!matchedProfile) {
      throw new Error(
        'এই মোবাইল নম্বর বা ইমেইল দিয়ে কোনো একাউন্ট পাওয়া যায়নি! অনুগ্রহ করে প্রথমে "নতুন একাউন্ট খুলুন" ট্যাবে গিয়ে নিবন্ধন করুন।'
      );
    }

    // 4. Strict Password Verification (Support both hashed & legacy accounts)
    const isPasswordValid =
      matchedProfile.passwordHash === passHash ||
      matchedProfile.passwordHash === password ||
      (matchedProfile as any).password === password ||
      (matchedProfile as any).password === passHash;

    if (matchedProfile.passwordHash && !isPasswordValid) {
      throw new Error('ভুল পাসওয়ার্ড! অনুগ্রহ করে আপনার সঠিক পাসওয়ার্ড লিখুন।');
    }

    const safeProfile: UserProfile = {
      ...matchedProfile,
      uid: matchedProfile.uid || deterministicUid,
      name: matchedProfile.name || 'খামারী',
      farmName: matchedProfile.farmName || 'পোল্ট্রি ফার্ম',
      phone: matchedProfile.phone || (isPhone ? identifier.trim() : '০১৭০০-০০০০০০'),
      location: matchedProfile.location || 'বাংলাদেশ',
      capacity: Number(matchedProfile.capacity) || 1000,
      birdType: matchedProfile.birdType || 'ব্রয়লার',
      registrationDate: matchedProfile.registrationDate || new Date().toISOString().split('T')[0],
      passwordHash: passHash
    };

    // 5. Activate authenticated session smoothly without unmounting the UI tree
    PoultryStorageService.saveUser(safeProfile);
    PoultryStorageService.setActiveUserId(safeProfile.uid);
    setCurrentUser(safeProfile);
    setSyncVersion((v) => v + 1);
    setAuthPromptReason(null);
    setIsAuthModalOpen(false);

    // 6. Independent background sync (never block UI or abort batch sync if profile write warns)
    const activeUid = safeProfile.uid;
    setTimeout(() => {
      setDoc(doc(db, 'users', activeUid), cleanForFirestore(safeProfile), { merge: true }).catch(() => {});
      PoultryStorageService.syncUserFromFirestore(activeUid)
        .then((synced) => {
          if (synced) setSyncVersion((v) => v + 1);
        })
        .catch((e) => console.warn('Background sync error:', e));
    }, 50);

    return true;
  };

  const register = async (
    profileData: Omit<UserProfile, 'uid' | 'registrationDate'>,
    password?: string
  ): Promise<boolean> => {
    const { isPhone, cleanInput, authEmail, displayPhone } = normalizeIdentifier(profileData.email);

    if (!password || password.length < 6) {
      throw new Error('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।');
    }

    const uid = PoultryStorageService.getDeterministicUid(cleanInput);
    const passHash = simpleHash(password);

    // 1. Strict uniqueness check across local registered profiles
    const isTakenLocally = PoultryStorageService.isEmailOrPhoneTaken(cleanInput, profileData.phone);
    if (isTakenLocally) {
      throw new Error(
        'এই জিমেইল অথবা মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি একাউন্ট খোলা আছে! একটি জিমেইল বা মোবাইল নম্বর দিয়ে কেবল ১ বারই একাউন্ট খোলা যাবে। অনুগ্রহ করে আপনার পূর্বের একাউন্টে লগইন করুন।'
      );
    }

    // 2. Strict uniqueness check against Cloud Firestore with fast timeout
    try {
      const userDocRef = doc(db, 'users', uid);
      const existingDoc: any = await Promise.race([
        getDoc(userDocRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
      ]);
      if (existingDoc && typeof existingDoc.exists === 'function' && existingDoc.exists()) {
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
      name: profileData.name || 'খামারী',
      farmName: profileData.farmName || 'পোল্ট্রি ফার্ম',
      email: isPhone ? authEmail : cleanInput,
      phone: profileData.phone || (isPhone ? displayPhone : '০১৭০০-০০০০০০'),
      registrationDate: new Date().toISOString().split('T')[0],
      passwordHash: passHash
    };

    // Activate immediately on this device without unmounting MainApp
    PoultryStorageService.saveUser(savedProfile);
    PoultryStorageService.setActiveUserId(uid);
    setCurrentUser(savedProfile);
    setSyncVersion((v) => v + 1);
    setAuthPromptReason(null);
    setIsAuthModalOpen(false);

    // Async push to Cloud Firestore in background
    setTimeout(() => {
      setDoc(doc(db, 'users', uid), cleanForFirestore(savedProfile), { merge: true }).catch((err) =>
        console.warn('Firestore setDoc user error:', err)
      );
    }, 50);

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
    // Strictly allow switching ONLY between public Demo preview profiles
    if (!isDemoUid(uid)) {
      console.warn('Blocked attempt to switch to non-demo user account:', uid);
      return;
    }
    const demoUser = DEMO_PROFILES.find((p) => p.uid === uid);
    if (demoUser) {
      setCurrentUser(demoUser);
      PoultryStorageService.setActiveUserId(demoUser.uid);
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
        allDemoUsers: DEMO_PROFILES
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
