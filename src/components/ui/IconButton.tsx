import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { color, shadow } from '@/theme';

interface IconButtonProps {
  glyph: string;
  onPress: () => void;
  /** brass-trimmed variant for emphasized chrome */
  brass?: boolean;
  style?: ViewStyle;
}

/** v2 mahogany chip button for top bars (gear, quit, restart, close).
 *  Glyphs stay in the system font — display fonts lack symbol coverage. */
export function IconButton({ glyph, onPress, brass, style }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        brass && styles.brass,
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
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: color.panelLight,
    borderWidth: 1.5,
    borderColor: color.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brass: {
    borderWidth: 2,
    borderColor: color.goldRimBottom,
  },
  pressed: {
    backgroundColor: color.panel,
    transform: [{ scale: 0.94 }],
  },
  glyph: {
    color: color.text,
    fontSize: 19,
    fontWeight: '700',
  },
});
