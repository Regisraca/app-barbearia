import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/src/contexts/AuthContext';

/**
 * Emergency logout route. Navigating to /logout forces the auth session
 * to be cleared and redirects to the welcome screen.
 * Useful when the app gets stuck in a redirect loop.
 */
export default function LogoutScreen() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, []);

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      <ActivityIndicator size="large" color="#00d4ff" />
      <Text style={styles.text}>Saindo...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
  },
});
