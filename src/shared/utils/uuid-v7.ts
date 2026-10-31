import { randomBytes } from 'node:crypto';

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let lastTimestampMs = -1;
let monotonicSeq = 0;

/**
 * Generates an RFC 9562 UUIDv7 (time-ordered, B-Tree index optimized identifier — DA-011).
 * Uses a 12-bit monotonic sequence within the same millisecond to guarantee strict temporal ordering.
 */
export function generateUuidV7(nowMs?: number): string {
  const isCustomTimestamp = nowMs !== undefined;
  let timestamp = Math.floor(nowMs ?? Date.now());
  const rand = randomBytes(10);

  if (!isCustomTimestamp && timestamp <= lastTimestampMs) {
    timestamp = lastTimestampMs;
    monotonicSeq = (monotonicSeq + 1) & 0x0fff;
    if (monotonicSeq === 0) {
      timestamp += 1;
      lastTimestampMs = timestamp;
    }
  } else if (isCustomTimestamp && timestamp === lastTimestampMs) {
    monotonicSeq = (monotonicSeq + 1) & 0x0fff;
  } else {
    lastTimestampMs = timestamp;
    monotonicSeq = ((rand[0] ?? 0) << 4) | ((rand[1] ?? 0) >> 4);
  }

  const tsHex = BigInt(timestamp).toString(16).padStart(12, '0');
  const verAndRandA = (0x7000 | (monotonicSeq & 0x0fff)).toString(16).padStart(4, '0');

  const variantByte = ((rand[2] ?? 0) & 0x3f) | 0x80;
  const randBHigh = ((variantByte << 8) | (rand[3] ?? 0)).toString(16).padStart(4, '0');
  const randBLow = rand.subarray(4, 10).toString('hex');

  return `${tsHex.slice(0, 8)}-${tsHex.slice(8, 12)}-${verAndRandA}-${randBHigh}-${randBLow}`;
}

export function isUuidV7(value: string): boolean {
  return UUID_V7_REGEX.test(value);
}

export function extractUuidV7Timestamp(uuid: string): number {
  if (!isUuidV7(uuid)) {
    throw new Error(`Invalid UUIDv7 string: ${uuid}`);
  }
  const hexTimestamp = uuid.slice(0, 8) + uuid.slice(9, 13);
  return Number(BigInt(`0x${hexTimestamp}`));
}
