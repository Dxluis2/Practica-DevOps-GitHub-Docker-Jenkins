
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDfHLknRhkV68A_NPE7qdKAy6NdsZfpM-4",
  authDomain: "agendap-a29e6.firebaseapp.com",
  projectId: "agendap-a29e6",
  storageBucket: "agendap-a29e6.firebasestorage.app",
  messagingSenderId: "625286698401",
  appId: "1:625286698401:web:7d32ce2a0d7ee62b20e7e0",
  measurementId: "G-873VRFGB4",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const messagingPromise = isSupported().then((supported) =>
  supported ? getMessaging(app) : null
);

export default app;
