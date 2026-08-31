/**
 * @format
 */

import {AppRegistry} from 'react-native';

import {name as appName} from './app.json';
import App from './src/app/App';

// The native bootstrap calls runApplication as soon as it finishes
// evaluating the top-level bundle, without waiting for anything async. Dev
// mocking is set up here with synchronous requires, not dynamic imports: that
// way it finishes setting up before the component is registered, and there's
// no window left in which an early fetch beats the shim in a race. The
// try/catch keeps a failure here from blocking the app's startup.
if (__DEV__) {
  try {
    require('./msw.polyfills');
    const {startMockServer} = require('./src/mocks/server.native');
    startMockServer().catch(error => {
      console.error('Could not start the dev mock server:', error);
    });
  } catch (error) {
    console.error('Could not start the dev mock server:', error);
  }
}

AppRegistry.registerComponent(appName, () => App);
