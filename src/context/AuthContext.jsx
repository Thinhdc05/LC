import { createContext, useContext, useEffect, useState } from 'react'
import { auth, googleProvider, hasFirebaseConfig } from '../firebase/firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    // Only subscribe if Firebase is properly configured
    if (!auth || !hasFirebaseConfig) return
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user ?? null)
    })
    return unsubscribe
  }, [])

  const signInWithGoogle = () => {
    if (!auth) return Promise.reject(new Error('Firebase not configured'))
    return signInWithPopup(auth, googleProvider)
  }

  const logout = () => {
    if (!auth) return Promise.resolve()
    return signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ currentUser, signInWithGoogle, logout, firebaseEnabled: hasFirebaseConfig }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
