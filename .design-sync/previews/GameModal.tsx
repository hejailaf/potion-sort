import { GameModal, GameButton } from 'potion-sort';

const noop = () => undefined;

// The deadlock rescue dialog — title plate, cream card, emoji, action buttons.
export const Rescue = () => (
  <GameModal
    visible
    title="No Moves Left!"
    onClose={noop}
    icon="🧪"
    message="The board is stuck — brew your way out:"
  >
    <GameButton label="Shuffle" variant="green" onPress={noop} />
    <GameButton label="Restart (−1 ❤️)" variant="red" onPress={noop} />
  </GameModal>
);

// A simpler confirm with a single action.
export const Confirm = () => (
  <GameModal
    visible
    title="Leave Level?"
    onClose={noop}
    icon="🚪"
    message="Take a break and keep your progress — or abandon this board."
  >
    <GameButton label="Take a Break" variant="green" onPress={noop} />
  </GameModal>
);
