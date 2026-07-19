import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Barber {
  id: string;
  name: string;
  bio?: string;
}

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service_id?: string; barber_id?: string }>();
  const { token } = useAuth();

  const [step, setStep] = useState(1); // 1: Service, 2: Barber, 3: Date, 4: Time, 5: Payment, 6: Confirm
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'prepaid' | 'onsite'>('onsite');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBarber && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedBarber, selectedDate]);

  const loadInitialData = async () => {
    try {
      const [servicesRes, barbersRes] = await Promise.all([
        fetch(`${API_URL}/services`),
        fetch(`${API_URL}/barbers`),
      ]);

      const servicesData = await servicesRes.json();
      const barbersData = await barbersRes.json();

      setServices(servicesData);
      setBarbers(barbersData);

      // Pre-select if passed in params
      if (params.service_id) {
        const service = servicesData.find((s: Service) => s.id === params.service_id);
        if (service) {
          setSelectedService(service);
          setStep(2);
        }
      }

      if (params.barber_id) {
        const barber = barbersData.find((b: Barber) => b.id === params.barber_id);
        if (barber) {
          setSelectedBarber(barber);
          if (params.service_id) {
            setStep(3);
          } else {
            setStep(1);
          }
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      const response = await fetch(
        `${API_URL}/bookings/available-slots?barber_id=${selectedBarber?.id}&date=${selectedDate}`
      );
      const data = await response.json();
      setAvailableSlots(data.available_slots);
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      Alert.alert('Erro', 'Por favor, complete todas as etapas');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_id: selectedService.id,
          barber_id: selectedBarber.id,
          date: selectedDate,
          time: selectedTime,
          payment_method: paymentMethod,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Sucesso!',
          paymentMethod === 'prepaid'
            ? 'Agendamento confirmado! Pagamento simulado com sucesso.'
            : 'Agendamento confirmado! Pague no local.',
          [{ text: 'OK', onPress: () => router.replace('/(client)/bookings') }]
        );
      } else {
        const error = await response.json();
        Alert.alert('Erro', error.detail || 'Falha ao criar agendamento');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao criar agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const date = addDays(new Date(), i);
      days.push({
        date: format(date, 'yyyy-MM-dd'),
        display: format(date, 'dd', { locale: ptBR }),
        weekDay: format(date, 'EEE', { locale: ptBR }),
        month: format(date, 'MMM', { locale: ptBR }),
      });
    }
    return days;
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} testID="back-button">
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Novo Agendamento</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressStep, styles.progressStepActive]} />
            <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]} />
            <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]} />
            <View style={[styles.progressStep, step >= 4 && styles.progressStepActive]} />
            <View style={[styles.progressStep, step >= 5 && styles.progressStepActive]} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Step 1: Select Service */}
            {step === 1 && (
              <View>
                <Text style={styles.stepTitle}>Escolha o Serviço</Text>
                {services.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Nenhum serviço disponível</Text>
                  </View>
                ) : (
                  services.map((service) => (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.optionCard,
                        selectedService?.id === service.id && styles.optionCardSelected,
                      ]}
                      onPress={() => {
                        setSelectedService(service);
                        setTimeout(() => setStep(2), 200);
                      }}
                      testID={`select-service-${service.id}`}
                    >
                      <View style={styles.optionIcon}>
                        <Ionicons name="cut" size={24} color="#00d4ff" />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionName}>{service.name}</Text>
                        <View style={styles.optionDetails}>
                          <Text style={styles.optionPrice}>R$ {service.price.toFixed(2)}</Text>
                          <Text style={styles.optionDuration}> • {service.duration_minutes} min</Text>
                        </View>
                      </View>
                      {selectedService?.id === service.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#00d4ff" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Step 2: Select Barber */}
            {step === 2 && (
              <View>
                <Text style={styles.stepTitle}>Escolha o Barbeiro</Text>
                {barbers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Nenhum barbeiro disponível</Text>
                  </View>
                ) : (
                  barbers.map((barber) => (
                    <TouchableOpacity
                      key={barber.id}
                      style={[
                        styles.optionCard,
                        selectedBarber?.id === barber.id && styles.optionCardSelected,
                      ]}
                      onPress={() => {
                        setSelectedBarber(barber);
                        setTimeout(() => setStep(3), 200);
                      }}
                      testID={`select-barber-${barber.id}`}
                    >
                      <View style={styles.optionIcon}>
                        <Ionicons name="person" size={24} color="#00d4ff" />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionName}>{barber.name}</Text>
                        {barber.bio && (
                          <Text style={styles.optionDescription}>{barber.bio}</Text>
                        )}
                      </View>
                      {selectedBarber?.id === barber.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#00d4ff" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Step 3: Select Date */}
            {step === 3 && (
              <View>
                <Text style={styles.stepTitle}>Escolha a Data</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.datesContainer}
                >
                  {getNextDays().map((day) => (
                    <TouchableOpacity
                      key={day.date}
                      style={[
                        styles.dateCard,
                        selectedDate === day.date && styles.dateCardSelected,
                      ]}
                      onPress={() => {
                        setSelectedDate(day.date);
                        setTimeout(() => setStep(4), 200);
                      }}
                      testID={`select-date-${day.date}`}
                    >
                      <Text
                        style={[
                          styles.dateWeekDay,
                          selectedDate === day.date && styles.dateTextSelected,
                        ]}
                      >
                        {day.weekDay.toUpperCase()}
                      </Text>
                      <Text
                        style={[
                          styles.dateNumber,
                          selectedDate === day.date && styles.dateTextSelected,
                        ]}
                      >
                        {day.display}
                      </Text>
                      <Text
                        style={[
                          styles.dateMonth,
                          selectedDate === day.date && styles.dateTextSelected,
                        ]}
                      >
                        {day.month.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Step 4: Select Time */}
            {step === 4 && (
              <View>
                <Text style={styles.stepTitle}>Escolha o Horário</Text>
                <View style={styles.slotsContainer}>
                  {availableSlots.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>Nenhum horário disponível</Text>
                    </View>
                  ) : (
                    availableSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.slotCard,
                          selectedTime === slot && styles.slotCardSelected,
                        ]}
                        onPress={() => {
                          setSelectedTime(slot);
                          setTimeout(() => setStep(5), 200);
                        }}
                        testID={`select-time-${slot}`}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            selectedTime === slot && styles.slotTextSelected,
                          ]}
                        >
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* Step 5: Payment & Notes */}
            {step === 5 && (
              <View>
                <Text style={styles.stepTitle}>Pagamento e Observações</Text>

                <Text style={styles.label}>Forma de Pagamento</Text>
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === 'onsite' && styles.paymentOptionSelected,
                  ]}
                  onPress={() => setPaymentMethod('onsite')}
                  testID="payment-onsite"
                >
                  <Ionicons name="cash" size={24} color="#00d4ff" />
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentTitle}>Pagar no Local</Text>
                    <Text style={styles.paymentDescription}>
                      Pague na barbearia no dia do atendimento
                    </Text>
                  </View>
                  {paymentMethod === 'onsite' && (
                    <Ionicons name="checkmark-circle" size={24} color="#00d4ff" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === 'prepaid' && styles.paymentOptionSelected,
                  ]}
                  onPress={() => setPaymentMethod('prepaid')}
                  testID="payment-prepaid"
                >
                  <Ionicons name="card" size={24} color="#00d4ff" />
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentTitle}>Pagamento Antecipado</Text>
                    <Text style={styles.paymentDescription}>
                      Pague agora (simulado - MOCK)
                    </Text>
                  </View>
                  {paymentMethod === 'prepaid' && (
                    <Ionicons name="checkmark-circle" size={24} color="#00d4ff" />
                  )}
                </TouchableOpacity>

                <Text style={styles.label}>Observações (opcional)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Alguma preferência ou observação?"
                  placeholderTextColor="#808080"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  testID="notes-input"
                />

                {/* Summary */}
                <View style={styles.summary}>
                  <Text style={styles.summaryTitle}>Resumo do Agendamento</Text>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Serviço:</Text>
                    <Text style={styles.summaryValue}>{selectedService?.name}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Barbeiro:</Text>
                    <Text style={styles.summaryValue}>{selectedBarber?.name}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Data:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedDate && format(new Date(selectedDate + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Horário:</Text>
                    <Text style={styles.summaryValue}>{selectedTime}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total:</Text>
                    <Text style={styles.summaryPrice}>
                      R$ {selectedService?.price.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
                  onPress={handleConfirmBooking}
                  disabled={submitting}
                  testID="confirm-booking-button"
                >
                  {submitting ? (
                    <ActivityIndicator color="#1a1a2e" />
                  ) : (
                    <>
                      <Text style={styles.confirmButtonText}>Confirmar Agendamento</Text>
                      <Ionicons name="checkmark-circle" size={20} color="#1a1a2e" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {step > 1 && step < 5 && (
              <TouchableOpacity
                style={styles.backStepButton}
                onPress={() => setStep(step - 1)}
                testID="back-step-button"
              >
                <Ionicons name="chevron-back" size={20} color="#00d4ff" />
                <Text style={styles.backStepText}>Voltar</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 24,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 4,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  progressStepActive: { backgroundColor: '#00d4ff' },
  scrollContent: { padding: 24, paddingTop: 0 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 24 },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#808080', fontSize: 14 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  optionCardSelected: {
    borderColor: '#00d4ff',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionInfo: { flex: 1 },
  optionName: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  optionDescription: { fontSize: 12, color: '#b0b0b0', marginTop: 4 },
  optionDetails: { flexDirection: 'row', marginTop: 4 },
  optionPrice: { fontSize: 14, fontWeight: 'bold', color: '#00d4ff' },
  optionDuration: { fontSize: 12, color: '#b0b0b0' },
  datesContainer: { gap: 12, paddingHorizontal: 4 },
  dateCard: {
    width: 72,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    alignItems: 'center',
    flexShrink: 0,
  },
  dateCardSelected: {
    backgroundColor: '#00d4ff',
    borderColor: '#00d4ff',
  },
  dateWeekDay: { fontSize: 10, color: '#b0b0b0', fontWeight: '600' },
  dateNumber: { fontSize: 22, color: '#ffffff', fontWeight: 'bold', marginVertical: 2 },
  dateMonth: { fontSize: 10, color: '#b0b0b0', fontWeight: '600' },
  dateTextSelected: { color: '#1a1a2e' },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slotCard: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    minWidth: 80,
    alignItems: 'center',
  },
  slotCardSelected: { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
  slotText: { fontSize: 16, color: '#ffffff', fontWeight: '600' },
  slotTextSelected: { color: '#1a1a2e' },
  label: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 12,
    marginTop: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    gap: 12,
  },
  paymentOptionSelected: {
    borderColor: '#00d4ff',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  paymentInfo: { flex: 1 },
  paymentTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  paymentDescription: { fontSize: 12, color: '#b0b0b0', marginTop: 2 },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  summary: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 14, color: '#b0b0b0' },
  summaryValue: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  summaryPrice: { fontSize: 18, color: '#00d4ff', fontWeight: 'bold' },
  confirmButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00d4ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
    gap: 4,
  },
  backStepText: { color: '#00d4ff', fontSize: 14, fontWeight: '600' },
});
