import { ethers } from 'hardhat';
import { hexlifyCiphertext, sleepUntilDate } from '../utils';
import { Timelocker } from './timelocker';
import { PasswordWallet, PasswordWalletParams } from './password-wallet';
import { DECRYPTOR_ADDRESS } from '../constants';

export type PasswordWalletInfo = {
  params: PasswordWalletParams;
  address: string;
};

export class PasswordWalletInteractor {
  private timelocker: Timelocker;
  private passwordWallet?: PasswordWallet;

  constructor(timelocker: Timelocker) {
    this.timelocker = timelocker;
  }

  static async load(walletInfo: PasswordWalletInfo, timelocker: Timelocker) {
    const passwordWalletInteractor = new PasswordWalletInteractor(timelocker);
    // TODO: make load signature symmetric with Horus loadContract
    passwordWalletInteractor.passwordWallet = await PasswordWallet.loadContract(
      walletInfo.address
    );
    return passwordWalletInteractor;
  }

  public async initialize(
    walletParams: PasswordWalletParams
  ): Promise<PasswordWalletInfo> {
    const password = await PasswordWallet.generatePassword();
    const ciphertext = await this.timelocker.encrypt(
      password,
      walletParams.expirationDate
    );

    walletParams.plaintext = Buffer.from(password);
    walletParams.ciphertext = hexlifyCiphertext(ciphertext);
    this.passwordWallet = new PasswordWallet(walletParams, DECRYPTOR_ADDRESS);
    const address = await this.passwordWallet.deploy();

    return {
      params: walletParams,
      address,
    };
  }

  public async spend(password: string, recipientAddress: string) {
    if (!this.passwordWallet) {
      throw new Error('PasswordWallet has not been initialized');
    }

    const { salt, transaction: commitTx } = await this.passwordWallet.commit(
      password,
      recipientAddress
    );
    console.log(`Published commitment TX: ${commitTx.hash}`);
    await commitTx.wait();

    const expirationDate = this.passwordWallet.expirationDate;
    const millisecondsUntilExpiration =
      expirationDate.getTime() - new Date().getTime();
    if (millisecondsUntilExpiration > 0) {
      console.log(
        `Sleeping until wallet expiration: ${expirationDate.toTimeString()}`
      );
      await sleepUntilDate(expirationDate);
    }

    const { transaction: revealTx } = await this.passwordWallet.reveal(
      this.timelocker.getDecryptionPairing.bind(this.timelocker),
      salt,
      recipientAddress
    );

    console.log(`Published reveal TX: ${revealTx.hash}`);
    await revealTx.wait();

    return {
      commitTx,
      revealTx,
    };
  }
}
