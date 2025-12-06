import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { deleteAccount } from '../services/auth';
import { RootStackParamList } from '../navigation/AppNavigator';

type DeleteAccountScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation<DeleteAccountScreenNavigationProp>();
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scheduledDeleteDate, setScheduledDeleteDate] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);

    // Client-side validation
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    // Final confirmation alert
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This action cannot be undone. Your account will be permanently deleted after 30 days.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const result = await deleteAccount(password);
              
              // Show success message
              setScheduledDeleteDate(result.scheduledHardDeleteOn);
              setShowSuccess(true);
              
              // Wait 3 seconds to show success message, then logout and redirect
              setTimeout(async () => {
                await logout();
                // Navigation will be handled by AuthContext when logout is called
              }, 3000);
            } catch (err: any) {
              // Enhanced error handling
              if (err instanceof Error) {
                const errorMessage = err.message;
                if (errorMessage.includes('Invalid password') || errorMessage.includes('password')) {
                  setError('Invalid password. Please enter your current password.');
                } else if (errorMessage.includes('already deleted')) {
                  setError('This account has already been deleted.');
                } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('Authentication')) {
                  setError('Authentication failed. Please log in again.');
                } else if (errorMessage.includes('not found')) {
                  setError('User account not found.');
                } else {
                  setError(errorMessage || 'Failed to delete account. Please try again.');
                }
              } else {
                setError('An unexpected error occurred. Please try again.');
              }
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (showSuccess && scheduledDeleteDate) {
    const deleteDate = new Date(scheduledDeleteDate);
    const formattedDate = deleteDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Account Deletion Initiated</Text>
          <Text style={styles.successMessage}>
            Your account has been marked for deletion.
          </Text>
          <Text style={styles.successDate}>
            Permanent deletion scheduled for:{'\n'}
            <Text style={styles.successDateBold}>{formattedDate}</Text>
          </Text>
          <Text style={styles.successNote}>
            You will be logged out automatically...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.warningContainer}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningTitle}>Danger Zone</Text>
        <Text style={styles.warningText}>
          Once you delete your account, there is no going back. Please be certain.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>What happens when you delete your account?</Text>
        <Text style={styles.infoText}>
          • Your account will be immediately deactivated{'\n'}
          • You will be logged out and cannot log back in{'\n'}
          • Your data will be anonymized{'\n'}
          • Your account will be permanently deleted after 30 days{'\n'}
          • This action cannot be undone
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Enter your password to confirm *</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          placeholder="Your current password"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
          editable={!isDeleting}
        />

        <Text style={styles.label}>Type DELETE to confirm *</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={confirmText}
          onChangeText={(text) => {
            setConfirmText(text);
            setError(null);
          }}
          placeholder="Type DELETE"
          placeholderTextColor="#999"
          autoCapitalize="characters"
          editable={!isDeleting}
        />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.deleteButton, (isDeleting || !password || confirmText !== 'DELETE') && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={isDeleting || !password || confirmText !== 'DELETE'}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete My Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isDeleting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
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
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },
  errorContainer: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  deleteButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successIcon: {
    fontSize: 64,
    color: '#4caf50',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  successDate: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  successDateBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  successNote: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default DeleteAccountScreen;

