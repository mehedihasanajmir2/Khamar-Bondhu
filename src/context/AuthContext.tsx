import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { DEMO_PROFILES, PoultryStorageService } from '../services/storage';
import {
  auth,
  db,
  signInWithGoogle as firebaseSignInWithGoogle,
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
  login: (email: string, password?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  register: (profileData: Omit<UserProfile, 'uid' | 'registrationDate'>, password?: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (uid: string) => void;
  updateProfile: (updatedData: Partial<UserProfile>) => void;
  allDemoUsers: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
            // New user profile created from Firebase Google Auth
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
          // Fallback to local profile with the Firebase UID
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
        // Fallback to active local session or default demo profile
        const activeUid = PoultryStorageService.getActiveUserId();
        if (activeUid) {
          const user = PoultryStorageService.getUserById(activeUid);
          if (user) {
            setCurrentUser(user);
          } else {
            const defaultUser = PoultryStorageService.getUsers()[0] || DEMO_PROFILES[0];
            setCurrentUser(defaultUser);
            PoultryStorageService.setActiveUserId(defaultUser.uid);
          }
        } else {
          const defaultUser = PoultryStorageService.getUsers()[0] || DEMO_PROFILES[0];
          setCurrentUser(defaultUser);
          PoultryStorageService.setActiveUserId(defaultUser.uid);
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
      return true;
    } catch (err: any) {
      setIsLoading(false);
      console.error('Google login failed:', err);
      throw err;
    }
  };

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 200));

    let user = PoultryStorageService.getUserByEmail(email);
    if (!user) {
      const randomCode = Math.floor(100000 + Math.random() * 900000);
      const username = email.split('@')[0];
      const newProfile: UserProfile = {
        uid: `FRM-${randomCode}`,
        email: email.trim().toLowerCase(),
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
    setIsLoading(false);
    return true;
  };

  const register = async (
    profileData: Omit<UserProfile, 'uid' | 'registrationDate'>
  ): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const newUid = `FRM-REG-${randomCode}`;

    const newProfile: UserProfile = {
      ...profileData,
      uid: newUid,
      email: profileData.email.trim().toLowerCase(),
      registrationDate: new Date().toISOString().split('T')[0]
    };

    PoultryStorageService.saveUser(newProfile);
    setCurrentUser(newProfile);
    PoultryStorageService.setActiveUserId(newUid);

    // If authenticated in Firebase, sync to Firestore
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), newProfile);
      } catch (err) {
        console.warn('Firestore setDoc failed:', err);
      }
    }

    setIsLoading(false);
    return true;
  };

  const logout = async () => {
    try {
      await logOutFirebase();
    } catch (err) {
      console.warn('Firebase logout failed:', err);
    }
    PoultryStorageService.setActiveUserId(null);
    setCurrentUser(null);
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
        login,
        loginWithGoogle,
        register,
        logout,
        switchUser,
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
