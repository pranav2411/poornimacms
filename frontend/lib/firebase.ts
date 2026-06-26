import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";

const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const messagingSenderId =
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  (appId ? appId.split(":")[1] : undefined);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: appId,
  messagingSenderId: messagingSenderId,
};

const envVarNames = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
};

function assertFirebaseConfig() {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => envVarNames[key as keyof typeof envVarNames]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase env vars: ${missingKeys.join(", ")}`
    );
  }
}

let app: FirebaseApp | undefined;
let googleProvider: GoogleAuthProvider | undefined;

export function getFirebaseAuth() {
  assertFirebaseConfig();
  app = app ?? (getApps().length ? getApp() : initializeApp(firebaseConfig));
  return getAuth(app);
}

export function getGoogleProvider() {
  assertFirebaseConfig();

  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: "select_account",
    });
  }

  return googleProvider;
}
