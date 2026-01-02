import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type SupportScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Support'>;

const SupportScreen: React.FC = () => {
  const navigation = useNavigation<SupportScreenNavigationProp>();

  const handlePhonePress = () => {
    const phoneNumber = '+919324115782';
    Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
      Alert.alert('Error', 'Unable to make phone call');
      console.error('Error opening phone:', err);
    });
  };

  const handleEmailPress = () => {
    const email = 'prashin@ecommerse.com';
    Linking.openURL(`mailto:${email}`).catch((err) => {
      Alert.alert('Error', 'Unable to open email');
      console.error('Error opening email:', err);
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Support</Text>
        <Text style={styles.subtitle}>Get in touch with us</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.infoSection}>
          <Text style={styles.label}>Phone Number</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handlePhonePress}
            activeOpacity={0.7}
          >
            <Text style={styles.contactValue}>📞 +91 9324115782</Text>
            <Text style={styles.contactHint}>Tap to call</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoSection}>
          <Text style={styles.label}>Email</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleEmailPress}
            activeOpacity={0.7}
          >
            <Text style={styles.contactValue}>✉️ prashin@ecommerse.com</Text>
            <Text style={styles.contactHint}>Tap to email</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpText}>
          If you have any questions, issues, or need assistance, please contact us using the phone number or email above. We're here to help!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoSection: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactButton: {
    paddingVertical: 12,
  },
  contactValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  contactHint: {
    fontSize: 14,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  helpCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});

export default SupportScreen;

