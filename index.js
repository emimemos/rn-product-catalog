/**
 * @format
 */

import {AppRegistry} from 'react-native';

import App from './App';
import {name as appName} from './app.json';

// El bootstrap nativo llama a runApplication en cuanto termina de evaluar el
// bundle top-level, sin esperar nada asíncrono. El mocking de dev se arma acá
// con requires sincrónicos, no con imports dinámicos: así termina de armarse
// antes de que se registre el componente, y no queda ninguna ventana en la
// que un fetch temprano le gane la carrera al shim. El try/catch evita que
// un fallo acá bloquee el arranque de la app.
if (__DEV__) {
  try {
    require('./msw.polyfills');
    const {startMockServer} = require('./src/mocks/server.native');
    startMockServer().catch(error => {
      console.error('No se pudo arrancar el mock server de dev:', error);
    });
  } catch (error) {
    console.error('No se pudo arrancar el mock server de dev:', error);
  }
}

AppRegistry.registerComponent(appName, () => App);
