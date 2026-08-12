import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app;
let auth: any = null;
let googleProvider: any = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} catch (error) {
  console.warn('Firebase initialization failed (probably offline or missing config):', error);
  // Provide mock objects so the app doesn't crash on import
  auth = {
    onAuthStateChanged: (cb: any) => {
      cb(null);
      return () => {};
    },
    signOut: () => Promise.resolve(),
    currentUser: null
  };
  googleProvider = {};
}

export { auth, googleProvider };
