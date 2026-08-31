import 'fast-text-encoding';
import 'react-native-url-polyfill/auto';
import 'web-streams-polyfill/polyfill';

// msw imports its WebSocket module even when only HTTP handlers are used,
// and that module instantiates a module-level BroadcastChannel to coordinate
// WS clients across tabs. Hermes doesn't expose BroadcastChannel and this
// app doesn't register any WebSocket handlers, so this stub doesn't need to
// deliver real messages: it just keeps construction from failing.
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
