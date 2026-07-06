import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { color, radius, shadow } from '@/theme';

interface IconButtonProps {
  glyph: string;
  onPress: () => void;
  style?: ViewStyle;
}

/** Rounded-square chrome button for top bars (gear, quit, restart, close).
 *  Glyphs stay in the system font — Fredoka lacks symbol coverage. */
export function IconButton({ glyph, onPress, style }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        shadow.chip,
        style,
      ]}
    >
      <Text style={styles.glyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: radius.chip,
    backgroundColor: color.panelLight,
    borderWidth: 1.5,
    borderColor: color.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: color.panel,
    transform: [{ scale: 0.94 }],
  },
  glyph: {
    color: color.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
