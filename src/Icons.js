import React from 'react';
import Svg, { Circle, Line, Polyline, Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Clean line icons drawn as vectors (not emoji) so they look consistent
// and tint to match the selected state.
const base = { fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconMale({ size = 20, color = '#1C2430' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="10" cy="14" r="5" stroke={color} {...base} />
      <Line x1="13.6" y1="10.4" x2="19" y2="5" stroke={color} {...base} />
      <Polyline points="14 5 19 5 19 10" stroke={color} {...base} />
    </Svg>
  );
}
export function IconFemale({ size = 20, color = '#1C2430' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="5" stroke={color} {...base} />
      <Line x1="12" y1="13" x2="12" y2="21" stroke={color} {...base} />
      <Line x1="9" y1="18" x2="15" y2="18" stroke={color} {...base} />
    </Svg>
  );
}
export function IconNonbinary({ size = 20, color = '#1C2430' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="15" r="4.5" stroke={color} {...base} />
      <Line x1="12" y1="10.5" x2="12" y2="3" stroke={color} {...base} />
    </Svg>
  );
}
export function IconNotSay({ size = 20, color = '#1C2430' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="6" cy="12" r="1.6" fill={color} />
      <Circle cx="12" cy="12" r="1.6" fill={color} />
      <Circle cx="18" cy="12" r="1.6" fill={color} />
    </Svg>
  );
}
export function IconUser({ size = 26, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9.2" stroke={color} {...base} />
      <Circle cx="12" cy="10" r="3" stroke={color} {...base} />
      <Path d="M6.8 18.2c1.4-2.2 3.2-3.2 5.2-3.2s3.8 1 5.2 3.2" stroke={color} {...base} />
    </Svg>
  );
}
export function IconPin({ size = 18, color = '#0EA47A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" stroke={color} {...base} />
      <Circle cx="12" cy="10" r="2.5" stroke={color} {...base} />
    </Svg>
  );
}

// Look up a gender icon by key.
export const GENDER_ICONS = { male: IconMale, female: IconFemale, nonbinary: IconNonbinary, notsay: IconNotSay };


// Category icon (uses Expo's built-in MaterialCommunityIcons set).
export function CatIcon({ name, size = 22, color = '#1C2430' }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

// Brand logos for the sign-in buttons.
export function IconApple({ size = 18, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="M16.365 1.43c0 1.14-.42 2.2-1.13 3-.77.88-2.03 1.56-3.06 1.48-.12-1.1.42-2.26 1.1-3 .77-.86 2.11-1.5 3.09-1.48zM20.9 17.06c-.55 1.27-.81 1.83-1.52 2.95-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.77-4.04-3.33C.66 16.24-.13 11.6 1.55 8.45c.85-1.59 2.36-2.6 3.98-2.62 1.57-.03 3.05 1.05 4.02 1.05.96 0 2.76-1.3 4.65-1.11.79.03 3.01.32 4.44 2.41-3.9 2.13-3.27 7.62.26 8.88z" />
    </Svg>
  );
}
export function IconGoogle({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.19a5.29 5.29 0 0 1-2.29 3.47v2.88h3.7c2.17-2 3.42-4.94 3.42-8.36z" />
      <Path fill="#34A853" d="M12 24c3.1 0 5.7-1.03 7.6-2.79l-3.7-2.88c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.72v2.98A11.99 11.99 0 0 0 12 24z" />
      <Path fill="#FBBC05" d="M5.55 14.68a7.2 7.2 0 0 1 0-4.6V7.1H1.72a12 12 0 0 0 0 10.56l3.83-2.98z" />
      <Path fill="#EA4335" d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.28-3.28C17.7 1.19 15.1 0 12 0 7.32 0 3.28 2.69 1.72 6.6l3.83 2.98C6.46 6.86 9 4.75 12 4.75z" />
    </Svg>
  );
}
