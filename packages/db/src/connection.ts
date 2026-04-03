import mongoose from 'mongoose';

/**
 * MongoDB connection manager. Exports connectDB(uri) with exponential backoff retry
 * (max 5 attempts, starting at 1s). Logs each attempt. Exports disconnectDB() and
 * getConnectionStatus(). Uses poolSize: 10, serverSelectionTimeoutMS: 5000.
 * isConnected flag prevents double-connection calls.
 */

let isConnected = false;

export const connectDB = async (uri: string, attempt = 1): Promise<void> => {
  if (isConnected) {
    return;
  }

  const maxAttempts = 5;

  try {
    console.log(`[MongoDB] Attempting to connect (Attempt ${attempt}/${maxAttempts})...`);
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('[MongoDB] Connected successfully.');
  } catch (error) {
    console.error(`[MongoDB] Connection attempt ${attempt} failed:`, error);
    if (attempt < maxAttempts) {
      const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff starting at 1s
      console.log(`[MongoDB] Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(uri, attempt + 1);
    } else {
      console.error('[MongoDB] Max connection attempts reached. Exiting.');
      throw error;
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (!isConnected) {
    return;
  }
  await mongoose.disconnect();
  isConnected = false;
  console.log('[MongoDB] Disconnected.');
};

export const getConnectionStatus = (): boolean => {
  return isConnected;
};
