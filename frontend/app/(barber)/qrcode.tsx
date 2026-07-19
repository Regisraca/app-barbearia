import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function BarberQRCode() {
  const { token, user } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQRCode();
  }, []);

  const loadQRCode = async () => {
    try {
      const response = await fetch(`${API_URL}/barbers/${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setQrCode(data.qr_code);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar QR Code');
    } finally {
      setLoading(false);
    }
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
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="qr-code" size={64} color="#00d4ff" />
            <Text style={styles.title}>Meu QR Code</Text>
            <Text style={styles.subtitle}>
              Compartilhe com seus clientes para facilitar o agendamento
            </Text>
          </View>

          {qrCode && (
            <View style={styles.qrContainer}>
              <View style={styles.qrCodeWrapper}>
                <Image source={{ uri: qrCode }} style={styles.qrCode} />
              </View>
              <Text style={styles.instructions}>
                Clientes podem escanear este código para acessar sua agenda
              </Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#00d4ff" />
            <Text style={styles.infoText}>
              Salve este QR Code e compartilhe nas redes sociais ou imprima para sua barbearia
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#b0b0b0',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrCodeWrapper: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  qrCode: {
    width: 250,
    height: 250,
  },
  instructions: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
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
