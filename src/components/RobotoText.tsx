import React from 'react';
import { Text, TextProps } from 'react-native';
import { fonts } from '../styles/fonts';

interface RobotoTextProps extends TextProps {
  weight?: 'regular' | 'medium' | 'bold';
}

const RobotoText: React.FC<RobotoTextProps> = ({ 
  style, 
  weight = 'regular',
  ...props 
}) => {
  const fontFamily = fonts[weight];

  return (
    <Text 
      style={[{ fontFamily }, style]} 
      {...props} 
    />
  );
};

export default RobotoText;

