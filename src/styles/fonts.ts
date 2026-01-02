import { Platform } from 'react-native';

export const fonts = {
  regular: Platform.select({
    ios: 'Roboto-Regular',
    android: 'Roboto-Regular',
    web: 'Roboto, sans-serif',
    default: 'Roboto-Regular',
  }),
  medium: Platform.select({
    ios: 'Roboto-Medium',
    android: 'Roboto-Medium',
    web: 'Roboto, sans-serif',
    default: 'Roboto-Medium',
  }),
  bold: Platform.select({
    ios: 'Roboto-Bold',
    android: 'Roboto-Bold',
    web: 'Roboto, sans-serif',
    default: 'Roboto-Bold',
  }),
};

