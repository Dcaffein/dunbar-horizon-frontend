import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messaging: Messaging | null = null;

export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}

async function getSwRegistration() {
  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

export async function requestNotificationPermission(): Promise<string | null> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const m = getFirebaseMessaging();
  if (!m) return null;

  return getToken(m, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: await getSwRegistration(),
  });
}

export async function getCurrentToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (Notification.permission !== 'granted') return null;

  const m = getFirebaseMessaging();
  if (!m) return null;

  try {
    return await getToken(m, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await getSwRegistration(),
    });
  } catch {
    return null;
  }
}

export { onMessage, app };
