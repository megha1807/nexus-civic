import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ILocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

const GUARDIAN_NET_URL = process.env.EXPO_PUBLIC_GUARDIAN_NET_URL || 'http://localhost:3000'; // fallback
const SOS_QUEUE_KEY = 'sos_queue';
const LAST_KNOWN_LOCATION_KEY = 'last_known_location';

const client = axios.create({
  baseURL: GUARDIAN_NET_URL,
  timeout: 8000,
});

export const sendSOS = async (location: ILocation): Promise<string> => {
  try {
    const response = await client.post('/api/sos/trigger', { location });
    return response.data.eventId || 'event_triggered';
  } catch (error) {
    console.error('Failed to send SOS immediately. Queuing request.', error);
    await queueSOS(location);
    throw new Error('queued');
  }
};

const queueSOS = async (location: ILocation): Promise<void> => {
  try {
    const queueStr = await AsyncStorage.getItem(SOS_QUEUE_KEY);
    const queue: Array<{location: ILocation, timestamp: number, isRetry?: boolean}> = queueStr ? JSON.parse(queueStr) : [];
    queue.push({ location, timestamp: Date.now() });
    await AsyncStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue));
  } catch (err: unknown) {
    console.error('Failed to queue SOS event', err);
  }
};

export const flushSOSQueue = async (): Promise<void> => {
  try {
    const queueStr = await AsyncStorage.getItem(SOS_QUEUE_KEY);
    if (!queueStr) return;
    
    const queue: Array<{location: ILocation, timestamp: number, isRetry?: boolean}> = JSON.parse(queueStr);
    if (!queue.length) return;

    const remainingQueue: Array<{location: ILocation, timestamp: number, isRetry?: boolean}> = [];
    let flushedCount = 0;

    for (const item of queue) {
      try {
        await client.post('/api/sos/trigger', { location: item.location, timestamp: item.timestamp, isRetry: true });
        flushedCount++;
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    if (flushedCount > 0) {
      console.log(`Successfully flushed ${flushedCount} events from queue`);
      if (remainingQueue.length > 0) {
        await AsyncStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(remainingQueue));
      } else {
        await AsyncStorage.removeItem(SOS_QUEUE_KEY);
      }
    }
  } catch (err: unknown) {
    console.error('Failed to read or flush SOS queue', err);
  }
};

export const saveLastKnownLocation = async (location: ILocation): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_KNOWN_LOCATION_KEY, JSON.stringify(location));
  } catch (err: unknown) {
    console.error('Failed to save last known location', err);
  }
};

export const getLastKnownLocation = async (): Promise<ILocation | null> => {
  try {
    const locStr = await AsyncStorage.getItem(LAST_KNOWN_LOCATION_KEY);
    return locStr ? JSON.parse(locStr) : null;
  } catch (err: unknown) {
    console.error('Failed to get last known location', err);
    return null;
  }
};
