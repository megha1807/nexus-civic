import admin from 'firebase-admin';

import { createLogger } from './logger';

const logger = createLogger(process.env.SERVICE_NAME ?? 'guardian-net');

let firebaseEnabled = false;

type Location = {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
};

/**
 * Initialize Firebase Admin from FIREBASE_SERVICE_ACCOUNT_JSON.
 */
export function initFirebase(): void {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON is not set; FCM notifications are disabled.');
    firebaseEnabled = false;
    return;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    firebaseEnabled = true;
    logger.info('Firebase initialized for FCM notifications.');
  } catch (error) {
    firebaseEnabled = false;
    logger.error('Failed to initialize Firebase; FCM notifications are disabled.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function sendSOSAlert(event: unknown, fcmTokens: string[]): Promise<void> {
  if (!firebaseEnabled || fcmTokens.length === 0) {
    return;
  }

  try {
    await admin.messaging().sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title: 'Emergency SOS Alert',
        body: 'An SOS alert was triggered nearby. Tap to view details.',
      },
      data: {
        event: JSON.stringify(event),
      },
    });
  } catch (error) {
    logger.error('Failed to send SOS FCM alert.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyNearbyVolunteers(location: Location, eventId: string): Promise<void> {
  if (!firebaseEnabled) {
    return;
  }

  logger.info('Volunteer notification requested (placeholder implementation).', {
    eventId,
    lat: location.lat,
    lng: location.lng,
  });
}
