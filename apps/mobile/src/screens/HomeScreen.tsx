import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  SOS: undefined;
  SafetyMap: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [safetyScore, setSafetyScore] = useState<number | null>(null);

  useEffect(() => {
    // Mock for demo
    setSafetyScore(85);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nexus Civic</Text>
      
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Current Safety Score</Text>
        <Text style={styles.scoreValue}>{safetyScore ?? '--'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.sosButton]} 
          onPress={() => navigation.navigate('SOS')}
        >
          <Text style={styles.buttonText}>SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.mapButton]} 
          onPress={() => navigation.navigate('SafetyMap')}
        >
          <Text style={styles.buttonText}>Safety Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D021F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontFamily: 'System',
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 40,
  },
  scoreCard: {
    backgroundColor: '#1A1A2E',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 60,
    width: '100%',
  },
  scoreLabel: {
    color: '#A0A0A0',
    fontSize: 18,
    marginBottom: 10,
  },
  scoreValue: {
    color: '#4ADE80',
    fontSize: 64,
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  button: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  sosButton: {
    backgroundColor: '#FF4D8D',
  },
  mapButton: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
