'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { createContext, useContext } from 'react';

// Define the context shape
interface FirebaseContextValue {
  app: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

// Create the context
const FirebaseContext = createContext<FirebaseContextValue>({
  app: null,
  firestore: null,
  auth: null,
});

/**
 * A provider component that makes Firebase services available to its children.
 *
 * @param {{
 *   children: React.ReactNode;
 *   app: FirebaseApp;
 *   firestore: Firestore;
 *   auth: Auth;
 * }} {
 *   children,
 *   app,
 *   firestore,
 *   auth,
 * }
 * @returns {JSX.Element}
 */
export function FirebaseProvider({
  children,
  app,
  firestore,
  auth,
}: {
  children: React.ReactNode;
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}) {
  return (
    <FirebaseContext.Provider value={{ app, firestore, auth }}>
      {children}
    </FirebaseContext.Provider>
  );
}

/**
 * A hook to access the Firebase context.
 *
 * @returns {FirebaseContextValue} The Firebase context value.
 * @throws {Error} If used outside of a FirebaseProvider.
 */
export const useFirebase = (): FirebaseContextValue => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

/**
 * A hook to access the Firebase App instance.
 *
 * @returns {FirebaseApp | null} The Firebase App instance.
 */
export const useFirebaseApp = (): FirebaseApp | null => {
  const { app } = useFirebase();
  return app;
};

/**
 * A hook to access the Firestore instance.
 *
 * @returns {Firestore | null} The Firestore instance.
 */
export const useFirestore = (): Firestore | null => {
  const { firestore } = useFirebase();
  return firestore;
};

/**
 * A hook to access the Auth instance.
 *
 * @returns {Auth | null} The Auth instance.
 */
export const useAuth = (): Auth | null => {
  const { auth } = useFirebase();
  return auth;
};
