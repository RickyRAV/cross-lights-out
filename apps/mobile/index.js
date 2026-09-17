import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// We register explicitly instead of using `expo/AppEntry.js`, because AppEntry
// resolves the app as `../../App` relative to the `expo` package directory —
// which points at the monorepo root, not apps/mobile, once pnpm hoists `expo`.
registerRootComponent(App);
