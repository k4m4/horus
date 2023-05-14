import { ethers } from 'hardhat';
import {
  Decryptor,
  Decryptor__factory,
  PasswordWallet,
  PasswordWallet__factory,
  HorusWallet,
  HorusWallet__factory,
} from '../typechain';
import type { HexlifiedCiphertext } from './';

export const deployDecryptor = async (): Promise<Decryptor> => {
  const Decryptor: Decryptor__factory = await ethers.getContractFactory(
    'Decryptor'
  );
  const decryptor: Decryptor = await Decryptor.deploy();
  await decryptor.deployed();
  return decryptor;
};

export const deployPasswordWallet = async (
  decryptorAddress: string,
  ciphertext: HexlifiedCiphertext,
  expirationTimestamp: number,
  commitmentCollateral: BigInt
): Promise<PasswordWallet> => {
  const Wallet: PasswordWallet__factory = await ethers.getContractFactory(
    'PasswordWallet'
  );
  const wallet: PasswordWallet = await Wallet.deploy(
    decryptorAddress,
    ciphertext,
    expirationTimestamp,
    String(commitmentCollateral)
  );

  await wallet.deployed();
  return wallet;
};

export const deployHorusWallet = async (
  decryptorAddress: string,
  merkleTreeRoot: string,
  genesisTimestamp: number,
  otpInterval: number,
  commitmentCollateral: BigInt
): Promise<HorusWallet> => {
  const Wallet: HorusWallet__factory = await ethers.getContractFactory(
    'HorusWallet'
  );
  const wallet: HorusWallet = await Wallet.deploy(
    decryptorAddress,
    merkleTreeRoot,
    genesisTimestamp,
    otpInterval,
    String(commitmentCollateral)
  );

  await wallet.deployed();
  return wallet;
};
