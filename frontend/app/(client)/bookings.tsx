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
  barber_name: string;
  service_name: string;
  date: string;
  time: string;
  status: string;
  payment_method: string;
  payment_status: string;
  notes?: string;
}

export default function ClientBookings() {
  const { token } = useAuth();
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

  const cancelBooking = async (bookingId: string) => {
    Alert.alert('Cancelar Agendamento', 'Deseja realmente cancelar este agendamento?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/bookings/${bookingId}/status?status=cancelled`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}` },
            });
            loadBookings();
            Alert.alert('Sucesso', 'Agendamento cancelado');
          } catch (error) {
            Alert.alert('Erro', 'Falha ao cancelar agendamento');
          }
        },
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#00d4ff';
      case 'completed': return '#4ade80';
      case 'cancelled': return '#ff4444';
      default: return '#fbbf24';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return 'Pendente';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d4ff" />
      </View>
    );
  }

  const activeBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  const pastBookings = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled');

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />}
        >
          <Text style={styles.title}>Meus Agendamentos</Text>

          {bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#808080" />
              <Text style={styles.emptyText}>Nenhum agendamento ainda</Text>
              <Text style={styles.emptySubtext}>Faça seu primeiro agendamento na aba Início</Text>
            </View>
          ) : (
            <>
              {activeBookings.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Ativos</Text>
                  {activeBookings.map((booking) => (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.bookingHeader}>
                        <View style={styles.dateContainer}>
                          <Ionicons name="calendar" size={20} color="#00d4ff" />
                          <Text style={styles.dateText}>
                            {format(new Date(booking.date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                            {getStatusText(booking.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.timeContainer}>
                        <Ionicons name="time" size={16} color="#b0b0b0" />
                        <Text style={styles.timeText}>{booking.time}</Text>
                      </View>

                      <Text style={styles.serviceName}>{booking.service_name}</Text>
                      <Text style={styles.barberName}>com {booking.barber_name}</Text>

                      <View style={styles.paymentInfo}>
                        <Ionicons
                          name={booking.payment_method === 'prepaid' ? 'card' : 'cash'}
                          size={16}
                          color="#00d4ff"
                        />
                        <Text style={styles.paymentText}>
                          {booking.payment_method === 'prepaid' ? 'Pré-pago' : 'Pagar no local'}
                        </Text>
                        <View style={styles.paymentStatusContainer}>
                          <View style={[styles.paymentStatusDot, { backgroundColor: booking.payment_status === 'paid' ? '#4ade80' : '#fbbf24' }]} />
                          <Text style={styles.paymentStatusText}>
                            {booking.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                          </Text>
                        </View>
                      </View>

                      {booking.status === 'confirmed' && (
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => cancelBooking(booking.id)}
                          testID={`cancel-booking-${booking.id}`}
                        >
                          <Ionicons name="close-circle" size={16} color="#ff4444" />
                          <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {pastBookings.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Histórico</Text>
                  {pastBookings.map((booking) => (
                    <View key={booking.id} style={[styles.bookingCard, styles.pastCard]}>
                      <View style={styles.bookingHeader}>
                        <View style={styles.dateContainer}>
                          <Ionicons name="calendar" size={20} color="#808080" />
                          <Text style={styles.dateTextPast}>
                            {format(new Date(booking.date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                            {getStatusText(booking.status)}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.serviceName}>{booking.service_name}</Text>
                      <Text style={styles.barberName}>com {booking.barber_name} - {booking.time}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
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
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 24 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 18, color: '#ffffff', marginTop: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#808080', marginTop: 8, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  bookingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  pastCard: { opacity: 0.7, borderColor: 'rgba(128, 128, 128, 0.3)' },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 14, fontWeight: '600', color: '#00d4ff' },
  dateTextPast: { fontSize: 14, color: '#808080' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  timeText: { fontSize: 14, color: '#b0b0b0' },
  serviceName: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  barberName: { fontSize: 14, color: '#b0b0b0', marginBottom: 12 },
  paymentInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  paymentText: { fontSize: 12, color: '#00d4ff', flex: 1 },
  paymentStatusContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paymentStatusDot: { width: 8, height: 8, borderRadius: 4 },
  paymentStatusText: { fontSize: 12, color: '#ffffff' },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  cancelButtonText: { color: '#ff4444', fontSize: 14, fontWeight: '600' },
});
