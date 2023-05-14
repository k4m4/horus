import { ethers } from 'hardhat';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { HorusWallet as HorusWalletContract } from '../typechain';
import { random } from '../crypto/utils';
import { deployDecryptor, deployHorusWallet } from '../utils/deploy';
import type { MerkleTreeEntry } from '../utils';
import { Timelocker } from './timelocker';
import {
  dateToUNIXTimestamp,
  unixTimestampToDate,
  merkleTreeEntryToHexlifiedCiphertext,
  calculateUpcomingExpirationUNIXTimestamp,
} from '../utils';
import { COMMITMENT_NONCE_SIZE_BYTES } from '../constants';

const { hexlify, solidityKeccak256 } = ethers.utils;

export type HorusWalletParams = {
  otpDigits: number;
  otpRotationInterval: number;
  otpRotations: number;
  commitmentCollateralAmount: BigInt;
};

export class HorusWallet {
  private params: HorusWalletParams;
  private merkleTree: StandardMerkleTree<MerkleTreeEntry>;
  private genesis: Date;
  private genesisUNIXTimestamp: number;
  private decryptorAddress?: string;

  private contract?: HorusWalletContract;

  constructor(
    params: HorusWalletParams,
    merkleTree: StandardMerkleTree<MerkleTreeEntry>,
    genesis: Date,
    decryptorAddress?: string
  ) {
    this.params = params;
    this.decryptorAddress = decryptorAddress;
    this.merkleTree = merkleTree;
    this.genesis = genesis;
    this.genesisUNIXTimestamp = dateToUNIXTimestamp(this.genesis);
  }

  public async loadContract(address: string) {
    this.contract = (await ethers.getContractAt(
      'HorusWallet',
      address
    )) as HorusWalletContract;
  }

  public async deploy(): Promise<string> {
    if (!this.decryptorAddress) {
      const decryptor = await deployDecryptor();
      this.decryptorAddress = decryptor.address;
    }

    this.contract = await deployHorusWallet(
      this.decryptorAddress,
      this.merkleTree.root,
      this.genesisUNIXTimestamp,
      this.params.otpRotationInterval,
      this.params.commitmentCollateralAmount
    );

    return this.contract.address;
  }

  public async commit(
    otpToken: number,
    recipientAddress: string,
    amount: number
  ) {
    if (!this.contract) {
      throw new Error('HorusWallet contract not initialized');
    }

    const now = new Date();
    const nowUNIXTimestamp = dateToUNIXTimestamp(now);
    const expirationUNIXTimestamp = calculateUpcomingExpirationUNIXTimestamp(
      nowUNIXTimestamp,
      this.genesisUNIXTimestamp,
      this.params.otpRotationInterval
    );

    const expirationDate = unixTimestampToDate(expirationUNIXTimestamp);
    if (now >= expirationDate) {
      throw new Error('Cannot commit after expiration time');
    }

    const salt = await random(COMMITMENT_NONCE_SIZE_BYTES);
    const commitment = solidityKeccak256(
      ['bytes', 'bytes', 'address', 'uint256'],
      [hexlify(otpToken), salt, recipientAddress, amount]
    );

    const transaction = await this.contract.commit(
      commitment,
      expirationUNIXTimestamp,
      { value: String(this.params.commitmentCollateralAmount) }
    );

    return {
      expirationDate,
      salt,
      transaction,
    };
  }

  public async reveal(
    getDecryptionPairing: typeof Timelocker.prototype.getDecryptionPairing,
    salt: Uint8Array,
    recipientAddress: string,
    amount: number,
    expirationDate: Date
  ) {
    if (!this.contract) {
      throw new Error('HorusWallet contract not initialized');
    }

    const now = new Date();
    if (now < expirationDate) {
      throw new Error('Cannot reveal before expiration time');
    }

    const walletBalance = await ethers.provider.getBalance(
      this.contract.address
    );
    if (walletBalance.lt(amount)) {
      throw new Error('Transfer value exceeds wallet balance');
    }

    const expirationUNIXTimestamp = dateToUNIXTimestamp(expirationDate);
    const entry = Array.from(this.merkleTree.entries()).find(
      ([_, v]) => v[3] === expirationUNIXTimestamp
    );
    if (!entry) {
      throw new Error('Failed to find Merkle Tree entry for given timestamp');
    }

    const [i, merkleTreeEntry] = entry as [number, MerkleTreeEntry];
    const proof = this.merkleTree.getProof(i);

    const hexlifiedCiphertext =
      merkleTreeEntryToHexlifiedCiphertext(merkleTreeEntry);
    const gidt = await getDecryptionPairing(
      hexlifiedCiphertext,
      expirationDate
    );

    const transaction = await this.contract.reveal(
      salt,
      recipientAddress,
      amount,
      hexlifiedCiphertext,
      gidt,
      expirationUNIXTimestamp,
      proof
    );

    return { transaction };
  }
}
