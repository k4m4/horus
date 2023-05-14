import fs from 'fs';
import prompts from 'prompts';
import { testnetClient } from '../../drand/testnet-client';
import { encrypt } from '../../utils/passworder';
import { HorusWalletParams } from '../../lib/horus-wallet';
import { Timelocker } from '../../lib/timelocker';
import { HorusWalletInteractor } from '../../lib/horus-wallet-interactor';
import {
  OTP_MERKLE_TREE_FILENAME,
  WALLET_INFO_FILENAME,
} from '../../constants';

const main = async () => {
  // TODO: input validation
  const {
    otpDigits,
    otpRotationInterval,
    otpRotations,
    password,
    commitmentCollateral,
  } = await prompts([
    {
      type: 'number',
      name: 'otpDigits',
      message: 'Number of OTP digits?',
    },
    {
      type: 'number',
      name: 'otpRotationInterval',
      message: 'OTP rotation interval (in seconds)?',
    },
    {
      type: 'number',
      name: 'otpRotations',
      message: 'Total number of rotations?',
    }, // TODO: detect when # of rotations ran out
    {
      type: 'password',
      name: 'password',
      message: 'Password to encrypt OTP seed',
    },
    {
      type: 'number',
      name: 'commitmentCollateral',
      message: 'Cost of commitment (in wei)?',
    },
  ]);

  const client = await testnetClient();
  const timelocker = new Timelocker(client);

  const walletParams: HorusWalletParams = {
    otpDigits,
    otpRotationInterval,
    otpRotations,
    commitmentCollateralAmount: commitmentCollateral,
  };

  const interactor = new HorusWalletInteractor(timelocker);
  const walletInfo = await interactor.initialize(walletParams);

  const merkleTree = walletInfo.merkleTree;
  fs.writeFileSync(OTP_MERKLE_TREE_FILENAME, JSON.stringify(merkleTree.dump()));
  // TODO: clean up
  // TODO: We need a new type for WalletInfo that doesn't include the merkle tree
  fs.writeFileSync(
    WALLET_INFO_FILENAME,
    JSON.stringify({
      ...walletInfo,
      // TODO: handle case where walletInfo.encryptedOTPSeed is undefined
      encryptedOTPSeed: await encrypt(password, walletInfo.plaintextOTPSeed!),
      plaintextOTPSeed: undefined,
      merkleTree: undefined,
    })
  );

  console.log(`Your wallet has been deployed at ${walletInfo.address}`);
  console.log(
    `The Merkle Tree has been written to ${OTP_MERKLE_TREE_FILENAME}`
  );
  console.log(
    `Your OTP seed has been encrypted and saved to ${WALLET_INFO_FILENAME}`
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
