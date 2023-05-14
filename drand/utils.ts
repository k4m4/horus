import { sha256 } from '@noble/hashes/sha256';

export function hashedRoundNumber(round: number): Uint8Array {
  const roundNumberBuffer = Buffer.alloc(64 / 8);
  roundNumberBuffer.writeBigUInt64BE(BigInt(round));
  return sha256(roundNumberBuffer);
}
