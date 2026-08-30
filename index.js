/**
 * @format
 */

import {AppRegistry} from 'react-native';

import App from './App';
import {name as appName} from './app.json';

async function enableMocking() {
  if (!__DEV__) {
    return;
  }
  await import('./msw.polyfills');
  const {startMockServer} = await import('./src/mocks/server.native');
  await startMockServer();
}

enableMocking().finally(() => {
  AppRegistry.registerComponent(appName, () => App);
});
