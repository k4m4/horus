import { utils } from 'ethers';
import { PointG1, PointG2 } from '@noble/bls12-381';
import { Ciphertext } from '../crypto/ibe';

const { hexlify } = utils;

export { Ciphertext };

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const padU = (U: PointG1): string => {
  const slices = U.toHex().match(/.{1,96}/g);
  const pad = '0'.repeat(32);
  if (slices == null || slices.length !== 2) {
    throw new Error('Wrong ciphertext.U size');
  }

  return '0x' + pad + slices[0] + pad + slices[1];
};

export const unpadU = (U: string): PointG1 => {
  const slices = U.slice(2)
    .match(/.{1,128}/g)
    ?.map((s) => s.slice(32));
  if (slices == null || slices.length !== 2) {
    throw new Error('Could not unpad ciphertext.U');
  }

  return PointG1.fromHex(slices.join(''));
};

export const padSignature = (signature: string) => {
  const signatureG2 = PointG2.fromSignature(signature);
  const signatureSlices = signatureG2.toHex().match(/.{1,96}/g);
  const pad = '0'.repeat(32);
  if (signatureSlices == null || signatureSlices.length !== 4) {
    throw new Error('Wrong signature size');
  }
  const signatureParameter =
    '0x' +
    pad +
    signatureSlices[1] +
    pad +
    signatureSlices[0] +
    pad +
    signatureSlices[3] +
    pad +
    signatureSlices[2];
  return signatureParameter;
};

export interface HexlifiedCiphertext {
  U: string;
  V: string;
  W: string;
}

export function hexlifyCiphertext(ciphertext: Ciphertext): HexlifiedCiphertext {
  return {
    U: padU(ciphertext.U),
    V: hexlify(ciphertext.V),
    W: hexlify(ciphertext.W),
  };
}

export type MerkleTreeEntry = [
  HexlifiedCiphertext['V'],
  HexlifiedCiphertext['U'],
  HexlifiedCiphertext['W'],
  number
];

// TODO: rename to merkleTreeNode
export function merkleTreeEntryToHexlifiedCiphertext(
  merkleTreeEntry: MerkleTreeEntry
): HexlifiedCiphertext {
  const [U, V, W] = merkleTreeEntry;
  return { U, V, W };
}

export function dateToUNIXTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function unixTimestampToDate(unixTimestamp: number): Date {
  return new Date(unixTimestamp * 1000);
}

export function calculateUpcomingExpirationUNIXTimestamp(
  nowUNIXTimestamp: number,
  genesisUnixTimestamp: number,
  otpInterval: number
): number {
  const secondsSinceGenesis = nowUNIXTimestamp - genesisUnixTimestamp;
  const intervalsUntilExpiration = Math.ceil(secondsSinceGenesis / otpInterval);
  return genesisUnixTimestamp + otpInterval * intervalsUntilExpiration;
}

export const sleepUntilDate = (date: Date) => {
  const duration = date.getTime() - new Date().getTime();
  return new Promise((resolve) => setTimeout(resolve, duration));
};
