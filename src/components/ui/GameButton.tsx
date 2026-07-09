import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { button, ButtonVariant, font, labelShadow, radius, shadow } from '@/theme';

interface GameButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** home-screen CTA scale */
  big?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/** Chunky tactile game button (v2): top highlight band, deep bottom rim, sinks 4pt when pressed. */
export function GameButton({ label, onPress, variant = 'violet', big, disabled, style }: GameButtonProps) {
  const c = button[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        big ? styles.big : styles.normal,
        {
          backgroundColor: c.fill,
          borderColor: c.rim,
          borderBottomWidth: pressed ? 1 : 5,
          transform: [{ translateY: pressed ? 4 : 0 }],
          opacity: disabled ? 0.4 : 1,
        },
        shadow.button,
        style,
      ]}
    >
      <View style={[styles.highlight, { backgroundColor: c.top }]} pointerEvents="none" />
      <Text style={[styles.label, big && styles.labelBig, { color: c.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 48,
  },
  normal: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  big: {
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    opacity: 0.55,
    borderTopLeftRadius: radius.card - 2,
    borderTopRightRadius: radius.card - 2,
  },
  label: {
    fontFamily: font.bold,
    fontSize: 18,
    ...labelShadow,
  },
  labelBig: {
    fontFamily: font.display,
    fontSize: 22,
  },
});
