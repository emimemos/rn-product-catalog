// MSW 2 needs the streams and encoding Web APIs, which Jest's `node`
// environment doesn't expose by default under the React Native preset.
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
