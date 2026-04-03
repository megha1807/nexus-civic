import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';

interface SafetyEvent {
  id: string;
  lat: number;
  lng: number;
  type: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export default function SafetyMapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [events, setEvents] = useState<SafetyEvent[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      // Fetch nearby events - mocked
      try {
        setEvents([
          { id: '1', lat: loc.coords.latitude + 0.005, lng: loc.coords.longitude + 0.005, type: 'Suspicious Activity', severity: 'medium', timestamp: new Date().toISOString() },
          { id: '2', lat: loc.coords.latitude - 0.005, lng: loc.coords.longitude - 0.002, type: 'Robbery', severity: 'high', timestamp: new Date().toISOString() },
        ]);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  const getMarkerColor = (severity: string) => {
    switch(severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'yellow';
      default: return 'red';
    }
  };

  return (
    <View style={styles.container}>
      {location ? (
        <MapView 
          style={styles.map}
          userInterfaceStyle="dark"
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={true}
        >
          {events.map(event => (
            <Marker
              key={event.id}
              coordinate={{ latitude: event.lat, longitude: event.lng }}
              pinColor={getMarkerColor(event.severity)}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{event.type}</Text>
                  <Text style={styles.calloutTime}>{new Date(event.timestamp).toLocaleTimeString()}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      ) : (
        <Text style={{color: 'white'}}>Loading Map...</Text>
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
  map: {
    width: '100%',
    height: '100%',
  },
  callout: {
    padding: 10,
    minWidth: 100,
  },
  calloutTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  calloutTime: {
    color: '#666',
    fontSize: 12,
  }
});
