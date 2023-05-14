import fs from 'fs';
import prompts from 'prompts';
import { testnetClient } from '../../drand/testnet-client';
import { Timelocker } from '../../lib/timelocker';
import {
  HorusWalletInteractor,
  HorusWalletInfo,
} from '../../lib/horus-wallet-interactor';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import type { MerkleTreeEntry } from '../../utils';
import {
  WALLET_INFO_FILENAME,
  OTP_MERKLE_TREE_FILENAME,
} from '../../constants';

const main = async () => {
  // TODO: input validation
  const { recipientAddress, amount, otp } = await prompts([
    {
      type: 'text',
      name: 'recipientAddress',
      message: 'What is the recipient address?',
    },
    {
      type: 'number',
      name: 'amount',
      message: 'How much CELO to send (in wei)?',
    },
    {
      type: 'number',
      name: 'otp',
      message: 'Enter OTP',
    },
  ]);

  const client = await testnetClient();
  const timelocker = new Timelocker(client);

  // TODO: gracefully handle read error
  const walletInfo: HorusWalletInfo = JSON.parse(
    fs.readFileSync(WALLET_INFO_FILENAME, 'utf-8')
  );

  const merkleTree: StandardMerkleTree<MerkleTreeEntry> =
    StandardMerkleTree.load(
      JSON.parse(fs.readFileSync(OTP_MERKLE_TREE_FILENAME, 'utf-8'))
    );
  walletInfo.merkleTree = merkleTree;

  const interactor = await HorusWalletInteractor.load(walletInfo, timelocker);

  await interactor.spend(otp, amount, recipientAddress);
  console.log(`Successfully sent ${amount} CELO to ${recipientAddress}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
