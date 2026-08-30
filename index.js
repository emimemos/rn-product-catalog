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

// Registrar el componente sincrónicamente y arrancar el mocking en paralelo,
// sin bloquear el registro: el bootstrap nativo llama a runApplication en
// cuanto termina de evaluar el bundle, sin esperar a que se resuelvan los
// imports asíncronos de abajo. Si el registro queda detrás de un `await`,
// runApplication encuentra el componente sin registrar y la app nunca
// levanta pantalla.
AppRegistry.registerComponent(appName, () => App);
enableMocking().catch(error => {
  console.error('No se pudo arrancar el mock server de dev:', error);
});
