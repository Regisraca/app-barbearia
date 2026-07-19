import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface Booking {
  id: string;
  client_name: string;
  service_name: string;
  date: string;
  time: string;
  status: string;
  payment_method: string;
  payment_status: string;
  notes?: string;
}

export default function BarberSchedule() {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await fetch(`${API_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar agendamentos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await fetch(`${API_URL}/bookings/${bookingId}/status?status=${status}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadBookings();
      Alert.alert('Sucesso', 'Status atualizado!');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar status');
    }
  };

  const handleStatusChange = (booking: Booking) => {
    const options = [
      { text: 'Cancelar', style: 'cancel' as const },
      {
        text: 'Concluído',
        onPress: () => updateBookingStatus(booking.id, 'completed'),
      },
      {
        text: 'Cancelar Agendamento',
        onPress: () => updateBookingStatus(booking.id, 'cancelled'),
        style: 'destructive' as const,
      },
    ];

    Alert.alert('Atualizar Status', `Agendamento de ${booking.client_name}`, options);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const getTodayBookings = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return bookings.filter((b) => b.date === today && b.status !== 'cancelled');
  };

  const getUpcomingBookings = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return bookings.filter((b) => b.date > today && b.status !== 'cancelled');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#00d4ff';
      case 'completed':
        return '#4ade80';
      case 'cancelled':
        return '#ff4444';
      default:
        return '#fbbf24';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Pendente';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d4ff" />
      </View>
    );
  }

  const todayBookings = getTodayBookings();
  const upcomingBookings = getUpcomingBookings();

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />}
        >
          <View style={styles.header}>
            <Text style={styles.greeting}>Olá, {user?.name}!</Text>
            <Text style={styles.subtitle}>Sua agenda</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hoje ({todayBookings.length})</Text>
            {todayBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#808080" />
                <Text style={styles.emptyText}>Nenhum agendamento para hoje</Text>
              </View>
            ) : (
              todayBookings.map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.bookingCard}
                  onPress={() => handleStatusChange(booking)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingHeader}>
                    <View style={styles.timeContainer}>
                      <Ionicons name="time" size={20} color="#00d4ff" />
                      <Text style={styles.timeText}>{booking.time}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(booking.status) + '20' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {getStatusText(booking.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.clientName}>{booking.client_name}</Text>
                  <Text style={styles.serviceName}>{booking.service_name}</Text>

                  {booking.notes && (
                    <View style={styles.notesContainer}>
                      <Ionicons name="document-text" size={16} color="#b0b0b0" />
                      <Text style={styles.notesText}>{booking.notes}</Text>
                    </View>
                  )}

                  <View style={styles.bookingFooter}>
                    <View style={styles.paymentInfo}>
                      <Ionicons
                        name={booking.payment_method === 'prepaid' ? 'card' : 'cash'}
                        size={16}
                        color="#00d4ff"
                      />
                      <Text style={styles.paymentText}>
                        {booking.payment_method === 'prepaid' ? 'Pré-pago' : 'No local'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {upcomingBookings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Próximos ({upcomingBookings.length})</Text>
              {upcomingBookings.map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.bookingCard}
                  onPress={() => handleStatusChange(booking)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingHeader}>
                    <View style={styles.timeContainer}>
                      <Ionicons name="calendar" size={20} color="#00d4ff" />
                      <Text style={styles.timeText}>
                        {format(new Date(booking.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })} - {booking.time}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(booking.status) + '20' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {getStatusText(booking.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.clientName}>{booking.client_name}</Text>
                  <Text style={styles.serviceName}>{booking.service_name}</Text>

                  {booking.notes && (
                    <View style={styles.notesContainer}>
                      <Ionicons name="document-text" size={16} color="#b0b0b0" />
                      <Text style={styles.notesText}>{booking.notes}</Text>
                    </View>
                  )}

                  <View style={styles.bookingFooter}>
                    <View style={styles.paymentInfo}>
                      <Ionicons
                        name={booking.payment_method === 'prepaid' ? 'card' : 'cash'}
                        size={16}
                        color="#00d4ff"
                      />
                      <Text style={styles.paymentText}>
                        {booking.payment_method === 'prepaid' ? 'Pré-pago' : 'No local'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
    marginBottom: 24,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  emptyText: {
    fontSize: 14,
    color: '#808080',
    marginTop: 12,
  },
  bookingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00d4ff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 8,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: '#b0b0b0',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentText: {
    fontSize: 12,
    color: '#00d4ff',
  },
});
