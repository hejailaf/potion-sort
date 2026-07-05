import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useMetaStore } from '@/state/metaStore';

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>Settings</Text>
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
          <Pressable onPress={onClose} style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1B1E4B',
    borderRadius: 20,
    padding: 24,
    width: 280,
    gap: 18,
  },
  title: {
    color: '#E8E6FF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#E8E6FF',
    fontSize: 16,
  },
  done: {
    backgroundColor: '#8A4AE6',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
