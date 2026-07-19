import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
}

interface Barber {
  id: string;
  name: string;
  bio?: string;
  specialties: string[];
}

export default function ClientHome() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesRes, barbersRes] = await Promise.all([
        fetch(`${API_URL}/services`),
        fetch(`${API_URL}/barbers`),
      ]);

      const servicesData = await servicesRes.json();
      const barbersData = await barbersRes.json();

      setServices(servicesData);
      setBarbers(barbersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleBookService = (serviceId: string) => {
    router.push(`/booking?service_id=${serviceId}`);
  };

  const handleBookWithBarber = (barberId: string) => {
    router.push(`/booking?barber_id=${barberId}`);
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
            <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}!</Text>
            <Text style={styles.subtitle}>Pronto para o seu novo visual?</Text>
          </View>

          <TouchableOpacity
            style={styles.mainCTA}
            onPress={() => router.push('/booking')}
            testID="cta-book-now"
          >
            <LinearGradient
              colors={['#00d4ff', '#0099cc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <View style={styles.ctaContent}>
                <View>
                  <Text style={styles.ctaTitle}>Agendar Agora</Text>
                  <Text style={styles.ctaSubtitle}>Escolha serviço e horário</Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={48} color="#ffffff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nossos Serviços</Text>
            {services.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nenhum serviço disponível</Text>
              </View>
            ) : (
              services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => handleBookService(service.id)}
                  testID={`service-${service.id}`}
                >
                  <View style={styles.serviceIcon}>
                    <Ionicons name="cut" size={24} color="#00d4ff" />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {service.description && (
                      <Text style={styles.serviceDescription}>{service.description}</Text>
                    )}
                    <View style={styles.serviceDetails}>
                      <Text style={styles.servicePrice}>R$ {service.price.toFixed(2)}</Text>
                      <Text style={styles.serviceDuration}> • {service.duration_minutes} min</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#00d4ff" />
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nossos Barbeiros</Text>
            {barbers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nenhum barbeiro disponível</Text>
              </View>
            ) : (
              barbers.map((barber) => (
                <TouchableOpacity
                  key={barber.id}
                  style={styles.barberCard}
                  onPress={() => handleBookWithBarber(barber.id)}
                  testID={`barber-${barber.id}`}
                >
                  <View style={styles.barberAvatar}>
                    <Ionicons name="person" size={32} color="#00d4ff" />
                  </View>
                  <View style={styles.barberInfo}>
                    <Text style={styles.barberName}>{barber.name}</Text>
                    {barber.bio && <Text style={styles.barberBio}>{barber.bio}</Text>}
                    {barber.specialties && barber.specialties.length > 0 && (
                      <View style={styles.specialties}>
                        {barber.specialties.slice(0, 3).map((specialty, index) => (
                          <View key={index} style={styles.specialtyTag}>
                            <Text style={styles.specialtyText}>{specialty}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  scrollContent: { padding: 24 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 16, color: '#b0b0b0', marginTop: 4 },
  mainCTA: {
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
  },
  ctaGradient: { padding: 24 },
  ctaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  ctaSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  emptyText: { color: '#808080' },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  serviceDescription: { fontSize: 12, color: '#b0b0b0', marginTop: 2 },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  servicePrice: { fontSize: 14, fontWeight: 'bold', color: '#00d4ff' },
  serviceDuration: { fontSize: 12, color: '#b0b0b0' },
  barberCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  barberAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  barberInfo: { flex: 1 },
  barberName: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  barberBio: { fontSize: 12, color: '#b0b0b0', marginTop: 4 },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  specialtyTag: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specialtyText: { fontSize: 10, color: '#00d4ff', fontWeight: '600' },
});
