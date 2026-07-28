import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import type { ProviderBranding } from '../types';

export interface UserState {
  uid: string;
  email: string | null;
  role: 'admin' | 'cliente' | 'proveedor' | 'dropshipper';
  status: 'approved' | 'pending' | 'rejected';
  name?: string;
  storeName?: string;
  taxId?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  createdAt?: string;
  /**
   * PDF Catalog v2 — additive provider branding sub-object.
   * Persisted THROUGH the existing provider save path (setDoc/updateDoc on
   * users/{uid}); never a new collection/endpoint. Legacy providers without
   * this field load clean defaults via normalizeProviderBranding().
   */
  branding?: ProviderBranding;
}

interface AuthContextType {
  currentUser: UserState | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: UserState['role'], name: string, profile?: Partial<UserState>) => Promise<void>;
  logout: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'facebook') => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  return useContext(AuthContext);
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  // Escuchar el estado de autenticación en tiempo real
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          // Obtener el documento del usuario en Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as Omit<UserState, 'uid' | 'email'>;
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userData
            });
          } else {
            // Si el documento no existe por alguna razón (por ejemplo, admin creado manualmente en Auth),
            // le asignamos el rol de cliente y estado aprobado por defecto para no romper el flujo.
            const defaultUser: UserState = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'cliente',
              status: 'approved',
              name: firebaseUser.displayName || 'Usuario',
              createdAt: new Date().toISOString()
            };
            
            await setDoc(userDocRef, {
              role: defaultUser.role,
              status: defaultUser.status,
              name: defaultUser.name,
              createdAt: defaultUser.createdAt
            });

            setCurrentUser(defaultUser);
          }
        } catch (error) {
          console.error("Error al obtener los datos del perfil del usuario:", error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const register = useCallback(async (email: string, password: string, role: UserState['role'], name: string, profile: Partial<UserState> = {}) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Determinar estado de verificación por defecto
    // Los clientes normales se aprueban de inmediato.
    // Los proveedores y dropshippers entran en estado pendiente hasta ser aprobados por el Admin.
    const status: UserState['status'] = role === 'cliente' ? 'approved' : 'pending';

    const newUserDoc: Omit<UserState, 'uid' | 'email'> = {
      role,
      status,
      name,
      ...profile,
      createdAt: new Date().toISOString()
    };

    // Guardar los datos en la base de datos Firestore
    await setDoc(doc(db, 'users', user.uid), newUserDoc);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const signInWithProvider = useCallback(async (providerName: 'google' | 'facebook') => {
    const provider = providerName === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
    if (providerName === 'google') provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const userRef = doc(db, 'users', credential.user.uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      await setDoc(userRef, {
        role: 'cliente', status: 'approved', name: credential.user.displayName || 'Cliente',
        createdAt: new Date().toISOString(), photoURL: credential.user.photoURL || null,
      });
    }
  }, []);

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    login,
    register,
    logout,
    signInWithProvider,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
