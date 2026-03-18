import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { getUserProfile, createUserProfile } from '../services/userService';
import { createOrUpdateLot } from '../services/parkingService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Sign up as a customer.
   */
  async function signup(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const name = displayName || email.split('@')[0];
    await updateProfile(cred.user, { displayName: name });
    await createUserProfile(cred.user.uid, 'customer', {
      email,
      displayName: name,
    });
    return cred;
  }

  /**
   * Sign up as a provider — creates user profile + stub parking-lots doc.
   * The lot doc starts with isActive: false until admin approves.
   */
  async function signupProvider(email, password, providerData) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const name = providerData.contactName || providerData.businessName || email.split('@')[0];
    await updateProfile(cred.user, { displayName: name });

    // 1. Create user profile in `users` collection
    await createUserProfile(cred.user.uid, 'provider', {
      email,
      displayName: name,
      phone: providerData.phone || '',
      businessName: providerData.businessName || '',
      businessLocation: providerData.businessLocation || '',
      businessImage: providerData.businessImage || '',
    });

    // 2. Create stub lot doc in `parking-lots` collection
    await createOrUpdateLot(cred.user.uid, {
      businessName: providerData.businessName || '',
      businessLocation: providerData.businessLocation || '',
      businessImage: providerData.businessImage || '',
      lotImages: providerData.businessImage ? [providerData.businessImage] : [],
      hourlyRate: 0,
      capacity: 0,
      availableSpots: 0,
      description: '',
      isActive: false,
    });

    return cred;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    setUserRole(null);
    setUserProfile(null);
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserRole(profile.role);
            setUserProfile(profile);
          } else {
            // Legacy user without Firestore profile
            setUserRole('customer');
            setUserProfile({
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0],
              role: 'customer',
              status: 'active',
            });
          }
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
          setUserRole('customer');
          setUserProfile(null);
        }
      } else {
        setUserRole(null);
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userProfile,
    signup,
    signupProvider,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}