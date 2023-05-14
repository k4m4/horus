import { utils } from 'ethers'; // TODO: fix inconsistency
import { HttpChainClient, fetchBeaconByTime, roundAt } from 'drand-client';
import { Fp12, pairing, PointG1, PointG2 } from '@noble/bls12-381';
import { unpadU, HexlifiedCiphertext } from '.';
import { encrypt, Ciphertext } from '../crypto/ibe';
import { hashedRoundNumber } from '../drand/utils';
import { fp12ToBytes } from '../crypto/utils';

const { hexlify } = utils;

export const fetchBeaconSignatureByDate = async (
  client: HttpChainClient,
  expiration: Date
): Promise<PointG2> => {
  const beacon = await fetchBeaconByTime(client, expiration.getTime());
  const p = PointG2.fromHex(beacon.signature);
  return p;
};

export const computeDecryptionPairing = (
  ciphertext: HexlifiedCiphertext,
  beaconSignature: PointG2
) => {
  const gidt = pairing(unpadU(ciphertext.U), beaconSignature);
  return gidt;
};

export const timelockEncrypt = async (
  client: HttpChainClient,
  message: Uint8Array,
  expiration: Date
): Promise<Ciphertext> => {
  const chainInfo = await client.chain().info();
  const point = PointG1.fromHex(chainInfo.public_key);
  const id = hashedRoundNumber(roundAt(expiration.getTime(), chainInfo));
  const ciphertext = await encrypt(point, id, message);
  return ciphertext;
};

export const pairingToHex = (pairing: Fp12): string => {
  return hexlify(fp12ToBytes(pairing));
};
