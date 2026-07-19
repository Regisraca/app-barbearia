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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
}

export default function AdminServices() {
  const { token } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: '',
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await fetch(`${API_URL}/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setServices(data);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async () => {
    if (!formData.name || !formData.price || !formData.duration_minutes) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          price: parseFloat(formData.price),
          duration_minutes: parseInt(formData.duration_minutes),
        }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Serviço criado com sucesso!');
        setModalVisible(false);
        setFormData({ name: '', description: '', price: '', duration_minutes: '' });
        loadServices();
      } else {
        Alert.alert('Erro', 'Falha ao criar serviço');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao criar serviço');
    }
  };

  const handleDeleteService = (serviceId: string, serviceName: string) => {
    Alert.alert('Excluir Serviço', `Deseja excluir "${serviceName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/services/${serviceId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            loadServices();
          } catch (error) {
            Alert.alert('Erro', 'Falha ao excluir serviço');
          }
        },
      },
    ]);
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
          <Text style={styles.title}>Serviços</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#1a1a2e" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {services.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cut-outline" size={64} color="#808080" />
              <Text style={styles.emptyText}>Nenhum serviço cadastrado</Text>
              <Text style={styles.emptySubtext}>Adicione seu primeiro serviço</Text>
            </View>
          ) : (
            services.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceIcon}>
                    <Ionicons name="cut" size={24} color="#00d4ff" />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {service.description && (
                      <Text style={styles.serviceDescription}>
                        {service.description}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteService(service.id, service.name)}
                  >
                    <Ionicons name="trash" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
                <View style={styles.serviceFooter}>
                  <View style={styles.serviceDetail}>
                    <Ionicons name="cash" size={16} color="#00d4ff" />
                    <Text style={styles.serviceDetailText}>
                      R$ {service.price.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.serviceDetail}>
                    <Ionicons name="time" size={16} color="#00d4ff" />
                    <Text style={styles.serviceDetailText}>
                      {service.duration_minutes} min
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Novo Serviço</Text>
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
                  placeholder="Ex: Corte de Cabelo"
                  placeholderTextColor="#808080"
                />

                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Descrição do serviço"
                  placeholderTextColor="#808080"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.label}>Preço (R$) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.price}
                  onChangeText={(text) => setFormData({ ...formData, price: text })}
                  placeholder="0.00"
                  placeholderTextColor="#808080"
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Duração (minutos) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.duration_minutes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, duration_minutes: text })
                  }
                  placeholder="30"
                  placeholderTextColor="#808080"
                  keyboardType="number-pad"
                />

                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateService}
                >
                  <Text style={styles.createButtonText}>Criar Serviço</Text>
                </TouchableOpacity>
              </ScrollView>
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
  serviceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#b0b0b0',
    marginTop: 4,
  },
  serviceFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceDetailText: {
    fontSize: 14,
    color: '#ffffff',
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
  },
  createButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
