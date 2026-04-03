import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Location from 'expo-location';

import HomeScreen from './src/screens/HomeScreen';
import SOSScreen from './src/screens/SOSScreen';
import SafetyMapScreen from './src/screens/SafetyMapScreen';
import { flushSOSQueue } from './src/services/guardian';

const Stack = createStackNavigator();

const NexusDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0D021F',
    card: '#1A1A2E',
    text: '#E0E0E0',
    border: '#2A2A3E',
  },
};

export default function App() {
  useEffect(() => {
    // Request permissions on startup
    (async () => {
      await Location.requestForegroundPermissionsAsync();
    })();

    // Flush SOS queue on foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        flushSOSQueue();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer theme={NexusDarkTheme}>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#1A1A2E' },
          headerTintColor: '#E0E0E0',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Nexus Civic' }} />
        <Stack.Screen name="SOS" component={SOSScreen} options={{ title: 'Emergency SOS' }} />
        <Stack.Screen name="SafetyMap" component={SafetyMapScreen} options={{ title: 'Safety Map' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
