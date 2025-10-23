// apps/web/src/polyfills.ts
import { Buffer as NodeBuffer } from 'buffer';

// Attach Buffer globally for all chunks (main + lazy routes)
if (!(globalThis as any).Buffer) {
  (globalThis as any).Buffer = NodeBuffer;
}

