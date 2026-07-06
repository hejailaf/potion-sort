import { StyleSheet, Switch, Text, View } from 'react-native';
import { GameButton } from '@/components/ui/GameButton';
import { GameModal } from '@/components/ui/GameModal';
import { useMetaStore } from '@/state/metaStore';
import { color, font } from '@/theme';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  const soundEnabled = useMetaStore((s) => s.soundEnabled);
  const hapticsEnabled = useMetaStore((s) => s.hapticsEnabled);
  const colorBlindSymbols = useMetaStore((s) => s.colorBlindSymbols);
  const setSoundEnabled = useMetaStore((s) => s.setSoundEnabled);
  const setHapticsEnabled = useMetaStore((s) => s.setHapticsEnabled);
  const setColorBlindSymbols = useMetaStore((s) => s.setColorBlindSymbols);

  return (
    <GameModal visible={visible} title="Settings" onClose={onClose}>
      <View style={styles.rows}>
        <View style={styles.row}>
          <Text style={styles.label}>Sound</Text>
          <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Haptics</Text>
          <Switch value={hapticsEnabled} onValueChange={setHapticsEnabled} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Color-blind symbols</Text>
          <Switch value={colorBlindSymbols} onValueChange={setColorBlindSymbols} />
        </View>
      </View>
      <GameButton label="Done" variant="green" onPress={onClose} />
    </GameModal>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: color.text,
    fontFamily: font.medium,
    fontSize: 16,
  },
});
