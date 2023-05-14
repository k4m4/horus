import { HttpChainClient } from 'drand-client';
import {
  timelockEncrypt,
  fetchBeaconSignatureByDate,
  computeDecryptionPairing,
  pairingToHex,
} from '../utils/tlock';
import type { Ciphertext, HexlifiedCiphertext } from '../utils';

export class Timelocker {
  private client: HttpChainClient;

  constructor(client: HttpChainClient) {
    this.client = client;
  }

  public async encrypt(
    message: Uint8Array,
    unlockDate: Date
  ): Promise<Ciphertext> {
    return timelockEncrypt(this.client, message, unlockDate);
  }

  public async getDecryptionPairing(
    ciphertext: HexlifiedCiphertext,
    expirationDate: Date
  ) {
    const p = await fetchBeaconSignatureByDate(this.client, expirationDate);
    const gidt = pairingToHex(computeDecryptionPairing(ciphertext, p));
    return gidt;
  }
}
