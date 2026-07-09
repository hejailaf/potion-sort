import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, shadow } from '@/theme';

interface GameModalProps {
  visible: boolean;
  title: string;
  /** X button, backdrop tap, and hardware back all land here — never applies a penalty */
  onClose: () => void;
  /** large emoji shown in the cream card */
  icon?: string;
  message?: string;
  /** buttons row / extra content below the cream card */
  children?: ReactNode;
}

/** The reference dialog: gold-rimmed night panel, title plate over the top edge,
 *  cream inset card, red X overlapping the corner. */
export function GameModal({ visible, title, onClose, icon, message, children }: GameModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.panel, shadow.panel]} onPress={() => undefined}>
          <View style={styles.plate}>
            <Text style={styles.plateText}>{title}</Text>
          </View>
          {(icon || message) && (
            <View style={styles.cream}>
              {icon ? <Text style={styles.icon}>{icon}</Text> : null}
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
          )}
          {children}
          <Pressable onPress={onClose} style={styles.close} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: 312,
    backgroundColor: color.panel,
    borderRadius: radius.panel,
    borderWidth: 3,
    borderColor: color.goldRimBottom,
    paddingTop: 36,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  plate: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    backgroundColor: color.gold,
    borderRadius: radius.chip,
    borderWidth: 2.5,
    borderColor: color.goldRimBottom,
    paddingHorizontal: 22,
    paddingVertical: 7,
    ...shadow.chip,
  },
  plateText: {
    fontFamily: font.bold,
    fontSize: 18,
    color: color.panelDeep,
  },
  cream: {
    backgroundColor: color.cream,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.creamEdge,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 48,
  },
  message: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.brownText,
    textAlign: 'center',
  },
  close: {
    position: 'absolute',
    top: -14,
    right: -14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D93D2B',
    borderWidth: 2,
    borderColor: '#A32516',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.chip,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
