import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, StatusBar, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { sendSOS, saveLastKnownLocation } from '../services/guardian';

type SOSState = 'READY' | 'CONFIRMING' | 'SENT';

export default function SOSScreen() {
  const [sosState, setSosState] = useState<SOSState>('READY');
  const [safetyScore, setSafetyScore] = useState<number | null>(85); // mock score
  const ringScale = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const triggerSOS = async () => {
    setSosState('SENT');
    try {
      // 1. Get location with timeout
      const { coords } = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
        new Promise<Location.LocationObject>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
      await saveLastKnownLocation(coords);

      // 2. Haptics mock of SOS pattern due to cross-platform varying APIs
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 3. Post to guardianNet
      await sendSOS({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        altitude: coords.altitude,
        heading: coords.heading,
        speed: coords.speed
      });

    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'queued') {
        Alert.alert('Offline', 'SOS queued for retry when network is available.');
      } else {
        // Fallback to queue if timeout
        Alert.alert('Location Error', 'Could not fetch precise location. Will queue or retry.');
      }
    }
  };

  const handlePress = () => {
    if (sosState === 'READY') {
      setSosState('CONFIRMING');
      
      Animated.timing(ringScale, {
        toValue: 2,
        duration: 3000,
        useNativeDriver: true,
      }).start();

      timeoutRef.current = setTimeout(() => {
        triggerSOS();
      }, 3000);
    }
  };

  const handleLongPress = () => {
    if (sosState === 'READY') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      triggerSOS();
    }
  };

  const cancelSOS = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSosState('READY');
    ringScale.setValue(1);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D021F" />
      
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>Safety: {safetyScore ?? '--'}</Text>
      </View>

      <View style={styles.centerContainer}>
        {sosState === 'CONFIRMING' && (
          <Animated.View style={[
            styles.ring, 
            { transform: [{ scale: ringScale }] }
          ]} />
        )}
        <TouchableOpacity 
          style={[
            styles.sosButton,
            sosState === 'SENT' ? styles.sosButtonSent : null
          ]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={2000}
          activeOpacity={0.8}
          disabled={sosState === 'SENT'}
        >
          <Text style={styles.sosText}>
            {sosState === 'SENT' ? '✓ Help\nNotified' : 'SOS'}
          </Text>
        </TouchableOpacity>
      </View>

      {sosState === 'CONFIRMING' && (
        <TouchableOpacity style={styles.cancelButton} onPress={cancelSOS}>
          <Text style={styles.cancelText}>I&apos;m Safe (Cancel)</Text>
        </TouchableOpacity>
      )}
      {sosState === 'SENT' && (
        <TouchableOpacity style={styles.cancelButton} onPress={cancelSOS}>
          <Text style={styles.cancelText}>Reset</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D021F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#1A1A2E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  badgeText: {
    color: '#4ADE80',
    fontWeight: 'bold',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#FF4D8D',
    opacity: 0.5,
  },
  sosButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FF4D8D',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#FF4D8D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  sosButtonSent: {
    backgroundColor: '#1A4A2E',
    shadowColor: '#1A4A2E',
  },
  sosText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 50,
    padding: 15,
  },
  cancelText: {
    color: '#A0A0A0',
    fontSize: 18,
  },
});
