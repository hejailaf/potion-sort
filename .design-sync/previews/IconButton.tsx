import { IconButton } from 'potion-sort';

const noop = () => undefined;

export const Settings = () => <IconButton glyph="⚙" onPress={noop} />;
export const Quit = () => <IconButton glyph="🚪" onPress={noop} />;
export const Restart = () => <IconButton glyph="↻" onPress={noop} />;
export const Hint = () => <IconButton glyph="💡" onPress={noop} />;
