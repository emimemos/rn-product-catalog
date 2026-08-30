import 'fast-text-encoding';
import 'react-native-url-polyfill/auto';
import 'web-streams-polyfill/polyfill';

// msw importa su módulo de WebSocket incluso cuando solo se usan handlers
// HTTP, y ese módulo instancia un BroadcastChannel a nivel de módulo para
// coordinar clientes de WS entre pestañas. Hermes no expone BroadcastChannel
// y esta app no registra handlers de WebSocket, así que este stub no necesita
// entregar mensajes de verdad: solo evita que la construcción falle.
if (typeof global.BroadcastChannel === 'undefined') {
  class NoopBroadcastChannel {
    constructor(name) {
      this.name = name;
    }
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
    close() {}
  }
  global.BroadcastChannel = NoopBroadcastChannel;
}
