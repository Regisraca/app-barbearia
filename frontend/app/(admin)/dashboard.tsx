import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, services: 0, barbers: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [bookingsRes, servicesRes, barbersRes] = await Promise.all([
        fetch(`${API_URL}/bookings`, { headers }),
        fetch(`${API_URL}/services`, { headers }),
        fetch(`${API_URL}/barbers`, { headers }),
      ]);

      const bookings = await bookingsRes.json();
      const services = await servicesRes.json();
      const barbers = await barbersRes.json();

      setStats({
        bookings: bookings.length,
        services: services.length,
        barbers: barbers.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d4ff" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />}
        >
          <View style={styles.header}>
            <Text style={styles.greeting}>Olá, {user?.name}!</Text>
            <Text style={styles.subtitle}>Painel de Administração</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={32} color="#00d4ff" />
              <Text style={styles.statNumber}>{stats.bookings}</Text>
              <Text style={styles.statLabel}>Agendamentos</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="cut" size={32} color="#00d4ff" />
              <Text style={styles.statNumber}>{stats.services}</Text>
              <Text style={styles.statLabel}>Serviços</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="people" size={32} color="#00d4ff" />
              <Text style={styles.statNumber}>{stats.barbers}</Text>
              <Text style={styles.statLabel}>Barbeiros</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#00d4ff" />
            <Text style={styles.infoText}>
              Gerencie seus serviços e barbeiros nas abas acima
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#b0b0b0',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#b0b0b0',
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 12,
  },
});
