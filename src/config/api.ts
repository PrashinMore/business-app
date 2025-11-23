/**
 * API Configuration
 * 
 * Configure your API base URL here
 * 
 * For React Native development:
 * - iOS Simulator: use 'http://localhost:4000'
 * - Android Emulator: use 'http://10.0.2.2:4000'
 * - Physical Device: use your computer's local IP (e.g., 'http://192.168.1.100:4000')
 * 
 * To find your local IP:
 * - Windows: ipconfig
 * - Mac/Linux: ifconfig
 */

import { Platform } from 'react-native';

// Development API URL
// Update this to match your development environment
const getDevelopmentApiUrl = () => {
  if (__DEV__) {
    // For Android Emulator, use 10.0.2.2 to access localhost on your machine
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:4000';
    }
    // For iOS Simulator, localhost works fine
    return 'http://localhost:4000';
  }
  // Production API URL - Update this with your production domain
  return 'https://your-api-domain.com';
};

export const API_BASE_URL = getDevelopmentApiUrl();

// Export for use in other files if needed
export default {
  API_BASE_URL,
};

