import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

export * from './provider';

// Add other service hooks here
// export * from './auth/use-user';
// export * from './firestore/use-collection';
// export * from './firestore/use-doc';

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

/**
 * Initializes and returns the Firebase app, Auth, and Firestore instances.
 *
 * This function ensures that Firebase is initialized only once.
 *
 * @returns {{ app: FirebaseApp; auth: Auth; firestore: Firestore }}
 */
export function initializeFirebase() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
  } else {
    app = getApp();
    auth = getAuth(app);
    firestore = getFirestore(app);
  }

  return { app, auth, firestore };
}
