import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface Barber {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  specialties: string[];
  qr_code?: string;
}

export default function AdminBarbers() {
  const { token } = useAuth();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    bio: '',
    specialties: '',
  });

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const response = await fetch(`${API_URL}/barbers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setBarbers(data);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar barbeiros');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBarber = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/barbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          password: formData.password,
          bio: formData.bio || undefined,
          specialties: formData.specialties
            ? formData.specialties.split(',').map((s) => s.trim())
            : [],
        }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Barbeiro criado com sucesso!');
        setModalVisible(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          bio: '',
          specialties: '',
        });
        loadBarbers();
      } else {
        const error = await response.json();
        Alert.alert('Erro', error.detail || 'Falha ao criar barbeiro');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao criar barbeiro');
    }
  };

  const showQRCode = (barber: Barber) => {
    setSelectedBarber(barber);
    setQrModalVisible(true);
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
        <View style={styles.header}>
          <Text style={styles.title}>Barbeiros</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color="#1a1a2e" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {barbers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#808080" />
              <Text style={styles.emptyText}>Nenhum barbeiro cadastrado</Text>
              <Text style={styles.emptySubtext}>Adicione seu primeiro barbeiro</Text>
            </View>
          ) : (
            barbers.map((barber) => (
              <View key={barber.id} style={styles.barberCard}>
                <View style={styles.barberHeader}>
                  <View style={styles.barberAvatar}>
                    <Ionicons name="person" size={32} color="#00d4ff" />
                  </View>
                  <View style={styles.barberInfo}>
                    <Text style={styles.barberName}>{barber.name}</Text>
                    <Text style={styles.barberEmail}>{barber.email}</Text>
                    {barber.phone && (
                      <Text style={styles.barberPhone}>{barber.phone}</Text>
                    )}
                  </View>
                </View>

                {barber.bio && (
                  <Text style={styles.barberBio}>{barber.bio}</Text>
                )}

                {barber.specialties && barber.specialties.length > 0 && (
                  <View style={styles.specialties}>
                    {barber.specialties.map((specialty, index) => (
                      <View key={index} style={styles.specialtyTag}>
                        <Text style={styles.specialtyText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => showQRCode(barber)}
                >
                  <Ionicons name="qr-code" size={20} color="#00d4ff" />
                  <Text style={styles.qrButtonText}>Ver QR Code</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        {/* Create Barber Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Novo Barbeiro</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <Text style={styles.label}>Nome *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Nome completo"
                  placeholderTextColor="#808080"
                />

                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="email@exemplo.com"
                  placeholderTextColor="#808080"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Telefone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor="#808080"
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Senha *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#808080"
                  secureTextEntry
                />

                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.bio}
                  onChangeText={(text) => setFormData({ ...formData, bio: text })}
                  placeholder="Apresentação do barbeiro"
                  placeholderTextColor="#808080"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.label}>Especialidades (separadas por vírgula)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.specialties}
                  onChangeText={(text) =>
                    setFormData({ ...formData, specialties: text })
                  }
                  placeholder="Corte, Barba, Sobrancelha"
                  placeholderTextColor="#808080"
                />

                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateBarber}
                >
                  <Text style={styles.createButtonText}>Criar Barbeiro</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* QR Code Modal */}
        <Modal
          visible={qrModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setQrModalVisible(false)}
        >
          <View style={styles.qrModalContainer}>
            <View style={styles.qrModalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setQrModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>

              <Text style={styles.qrTitle}>QR Code - {selectedBarber?.name}</Text>
              <Text style={styles.qrSubtitle}>
                Clientes podem escanear para agendar
              </Text>

              {selectedBarber?.qr_code && (
                <View style={styles.qrCodeContainer}>
                  <Image
                    source={{ uri: selectedBarber.qr_code }}
                    style={styles.qrCode}
                  />
                </View>
              )}
            </View>
          </View>
        </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: '#00d4ff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#808080',
    marginTop: 8,
  },
  barberCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  barberHeader: {
    flexDirection: 'row',
    marginBottom: 12,
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
  barberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  barberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  barberEmail: {
    fontSize: 14,
    color: '#b0b0b0',
    marginTop: 2,
  },
  barberPhone: {
    fontSize: 14,
    color: '#b0b0b0',
    marginTop: 2,
  },
  barberBio: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 12,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  specialtyTag: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  specialtyText: {
    fontSize: 12,
    color: '#00d4ff',
    fontWeight: '600',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  qrButtonText: {
    color: '#00d4ff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  label: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: '#00d4ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  createButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrModalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 24,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
  },
  qrCode: {
    width: 250,
    height: 250,
  },
});
