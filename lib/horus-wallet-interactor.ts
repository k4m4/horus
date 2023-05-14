import { ethers } from 'hardhat';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import type { MerkleTreeEntry } from '../utils';
import {
  hexlifyCiphertext,
  dateToUNIXTimestamp,
  sleepUntilDate,
} from '../utils';
import { Timelocker } from './timelocker';
import { OTPGenerator } from './otp-generator';
import { HorusWallet, HorusWalletParams } from './horus-wallet';
import { DECRYPTOR_ADDRESS } from '../constants';

const { hexlify, arrayify } = ethers.utils;

export type HorusWalletInfo = {
  params: HorusWalletParams;
  address: string;
  merkleTree: StandardMerkleTree<MerkleTreeEntry>;
  genesis: Date;
} & (
  | { plaintextOTPSeed: string; encryptedOTPSeed?: never }
  | { plaintextOTPSeed?: never; encryptedOTPSeed: string }
);

export class HorusWalletInteractor {
  private timelocker: Timelocker;
  private horusWallet?: HorusWallet;

  constructor(timelocker: Timelocker) {
    this.timelocker = timelocker;
  }

  static async load(walletInfo: HorusWalletInfo, timelocker: Timelocker) {
    const horusWalletInteractor = new HorusWalletInteractor(timelocker);
    // TODO: Add this logic to HorusWallet.loadContract (make it static)
    // to be symmetric with PasswordWallet
    const horusWallet = new HorusWallet(
      walletInfo.params,
      walletInfo.merkleTree,
      new Date(walletInfo.genesis),
      DECRYPTOR_ADDRESS
    );

    await horusWallet.loadContract(walletInfo.address);
    horusWalletInteractor.horusWallet = horusWallet;
    return horusWalletInteractor;
  }

  public async initialize(
    walletParams: HorusWalletParams
  ): Promise<HorusWalletInfo> {
    const plaintextOTPSeed = await OTPGenerator.generateSeed();
    const otp = new OTPGenerator(walletParams.otpDigits, plaintextOTPSeed);

    const genesis = new Date();
    // Milisecond precision will be lost in JS Date to UNIX epoch conversions
    genesis.setMilliseconds(0);

    const merkleTreeEntries: MerkleTreeEntry[] = [];

    for (let counter = 1; counter <= walletParams.otpRotations; counter++) {
      const t = new Date(genesis);
      t.setSeconds(t.getSeconds() + counter * walletParams.otpRotationInterval);
      const otpToken = otp.generate(counter);
      const otpTokenBuffer = arrayify(hexlify(Number(otpToken)));
      const ciphertext = await this.timelocker.encrypt(otpTokenBuffer, t);
      const { U, V, W } = hexlifyCiphertext(ciphertext);
      merkleTreeEntries.push([U, V, W, dateToUNIXTimestamp(t)]);
    }

    const merkleTree = StandardMerkleTree.of(merkleTreeEntries, [
      'bytes',
      'bytes',
      'bytes',
      'uint256',
    ]);

    this.horusWallet = new HorusWallet(
      walletParams,
      merkleTree,
      genesis,
      DECRYPTOR_ADDRESS
    );
    const address = await this.horusWallet.deploy();

    return {
      params: walletParams,
      plaintextOTPSeed,
      address,
      merkleTree,
      genesis,
    };
  }

  public async spend(
    otpToken: number,
    amount: number,
    recipientAddress: string
  ) {
    if (!this.horusWallet) {
      throw new Error('HorusWallet has not been initialized');
    }

    // TODO: make sure commitment expiration date matches OTP
    const {
      expirationDate,
      salt,
      transaction: commitTx,
    } = await this.horusWallet.commit(otpToken, recipientAddress, amount);
    console.log(`Published commitment TX: ${commitTx.hash}`);
    await commitTx.wait();

    const millisecondsUntilExpiration =
      expirationDate.getTime() - new Date().getTime();
    if (millisecondsUntilExpiration > 0) {
      console.log(
        `Sleeping until OTP expiration: ${expirationDate.toTimeString()}`
      );
      await sleepUntilDate(expirationDate);
    }

    const { transaction: revealTx } = await this.horusWallet.reveal(
      this.timelocker.getDecryptionPairing.bind(this.timelocker),
      salt,
      recipientAddress,
      amount,
      expirationDate
    );

    console.log(`Published reveal TX: ${revealTx.hash}`);
    await revealTx.wait();

    return {
      commitTx,
      revealTx,
    };
  }
}
