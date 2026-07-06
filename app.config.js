// Dynamic config layered on app.json: dev/preview builds get their own bundle ID
// and name so they install alongside the TestFlight/App Store app instead of
// replacing it. Production is untouched. APP_VARIANT is set per-profile in eas.json.
const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const idSuffix = IS_DEV ? '.dev' : IS_PREVIEW ? '.preview' : '';
const nameSuffix = IS_DEV ? ' (Dev)' : IS_PREVIEW ? ' (Preview)' : '';

export default ({ config }) => ({
  ...config,
  name: config.name + nameSuffix,
  ios: {
    ...config.ios,
    bundleIdentifier: config.ios.bundleIdentifier + idSuffix,
  },
});
