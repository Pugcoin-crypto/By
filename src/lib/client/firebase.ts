"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** The browser Firebase app, or null when the project isn't configured (memory mode). */
export function getFirebaseApp(): FirebaseApp | null {
  if (!config.apiKey || !config.projectId) return null;
  return getApps().length ? getApp() : initializeApp(config);
}
