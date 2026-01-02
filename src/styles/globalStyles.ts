import { TextStyle } from 'react-native';
import { fonts } from './fonts';

export const textStyles = {
  regular: {
    fontFamily: fonts.regular,
  } as TextStyle,
  medium: {
    fontFamily: fonts.medium,
  } as TextStyle,
  bold: {
    fontFamily: fonts.bold,
  } as TextStyle,
};

// Helper function to merge Roboto font with existing styles
export const withRoboto = (style?: TextStyle | TextStyle[], weight: 'regular' | 'medium' | 'bold' = 'regular'): TextStyle | TextStyle[] => {
  const fontStyle = textStyles[weight];
  if (Array.isArray(style)) {
    return [fontStyle, ...style];
  }
  return { ...fontStyle, ...style };
};

