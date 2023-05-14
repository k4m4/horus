import { ethers } from 'hardhat';
import { PasswordWallet as PasswordWalletContract } from '../typechain';
import { random } from '../crypto/utils';
import { deployDecryptor, deployPasswordWallet } from '../utils/deploy';
import { Timelocker } from './timelocker';
import {
  dateToUNIXTimestamp,
  unixTimestampToDate,
  HexlifiedCiphertext,
} from '../utils';
import { PASSWORD_SIZE_BYTES, COMMITMENT_NONCE_SIZE_BYTES } from '../constants';

const { solidityKeccak256 } = ethers.utils;

export type PasswordWalletParams = {
  expirationDate: Date;
  ciphertext?: HexlifiedCiphertext;
  plaintext?: Buffer; // TODO: split into two types
  commitmentCollateralAmount: BigInt;
};

export class PasswordWallet {
  private params: PasswordWalletParams;
  private decryptorAddress?: string;

  private contract?: PasswordWalletContract;

  // TODO: fix `new Date(expirationDate)`

  constructor(params: PasswordWalletParams, decryptorAddress?: string) {
    this.params = params;
    this.decryptorAddress = decryptorAddress;
  }

  static generatePassword() {
    return random(PASSWORD_SIZE_BYTES);
  }

  public get expirationDate() {
    return new Date(this.params.expirationDate);
  }

  static async loadContract(address: string) {
    const contract = (await ethers.getContractAt(
      'PasswordWallet',
      address
    )) as PasswordWalletContract;
    const expirationUNIXTimestamp: number = (
      await contract.expirationTimestamp()
    ).toNumber();
    const ciphertext: HexlifiedCiphertext = await contract.ciphertext();
    const commitmentCollateralAmount: BigInt = (
      await contract.commitmentCollateral()
    ).toBigInt();
    const params: PasswordWalletParams = {
      expirationDate: unixTimestampToDate(expirationUNIXTimestamp),
      ciphertext,
      commitmentCollateralAmount,
    };

    const passwordWallet = new PasswordWallet(params);
    passwordWallet.contract = contract;
    return passwordWallet;
  }

  public async deploy(): Promise<string> {
    if (!this.decryptorAddress) {
      const decryptor = await deployDecryptor();
      this.decryptorAddress = decryptor.address;
    }

    // TODO: handle undefined ciphertext
    this.contract = await deployPasswordWallet(
      this.decryptorAddress,
      this.params.ciphertext!,
      dateToUNIXTimestamp(new Date(this.params.expirationDate)),
      this.params.commitmentCollateralAmount
    );

    return this.contract.address;
  }

  public async commit(password: string, recipientAddress: string) {
    if (!this.contract) {
      throw new Error('PasswordWallet contract not initialized');
    }

    const now = new Date();
    if (now >= new Date(this.params.expirationDate)) {
      throw new Error('Cannot commit after expiration time');
    }

    const salt = await random(COMMITMENT_NONCE_SIZE_BYTES);
    // TODO: ensure password is in correct format
    const commitment = solidityKeccak256(
      ['bytes', 'bytes', 'address'],
      [password, salt, recipientAddress]
    );

    const transaction = await this.contract.commit(commitment, {
      value: String(this.params.commitmentCollateralAmount),
    });

    return {
      salt,
      transaction,
    };
  }

  public async reveal(
    getDecryptionPairing: typeof Timelocker.prototype.getDecryptionPairing,
    salt: Uint8Array,
    recipientAddress: string
  ) {
    if (!this.contract) {
      throw new Error('PasswordWallet contract not initialized');
    }

    const now = new Date();
    if (now < new Date(this.params.expirationDate)) {
      throw new Error('Cannot reveal before expiration time');
    }

    // TODO: handle undefined ciphertext
    const gidt = await getDecryptionPairing(
      this.params.ciphertext!,
      new Date(this.params.expirationDate)
    );

    const transaction = await this.contract.reveal(
      salt,
      recipientAddress,
      gidt
    );

    return { transaction };
  }
}
