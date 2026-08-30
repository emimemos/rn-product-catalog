// MSW 2 necesita las Web APIs de streams y encoding, que el entorno `node` de
// Jest no expone por defecto bajo el preset de React Native.
import {ReadableStream, TransformStream} from 'node:stream/web';
import {TextDecoder, TextEncoder} from 'node:util';
import {BroadcastChannel} from 'node:worker_threads';

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  TransformStream,
  BroadcastChannel,
});

export {};
