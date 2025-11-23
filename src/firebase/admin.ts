import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getAdminApp() {
  if (app) {
    return app;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n');

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !privateKey
  ) {
    return null;
  }

  const credentials = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  };

  if (admin.apps.length > 0) {
    app = admin.app();
  } else {
    app = admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
  }

  return app;
}
