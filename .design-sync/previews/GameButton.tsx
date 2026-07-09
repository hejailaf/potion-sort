import { GameButton } from 'potion-sort';

const noop = () => undefined;

export const Violet = () => <GameButton label="Level 12" variant="violet" onPress={noop} />;
export const Green = () => <GameButton label="Take a Break" variant="green" onPress={noop} />;
export const Red = () => <GameButton label="Abandon (−1 ❤️)" variant="red" onPress={noop} />;
export const Big = () => <GameButton label="Play" variant="violet" big onPress={noop} />;
export const Disabled = () => <GameButton label="Daily Complete" variant="green" disabled onPress={noop} />;
