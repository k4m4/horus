import fs from 'fs';
import prompts from 'prompts';
import { testnetClient } from '../../drand/testnet-client';
import { Timelocker } from '../../lib/timelocker';
import {
  PasswordWalletInteractor,
  PasswordWalletInfo,
} from '../../lib/password-wallet-interactor';
import { WALLET_INFO_FILENAME } from '../../constants';

const main = async () => {
  // TODO: input validation
  const { recipientAddress, password } = await prompts([
    {
      type: 'text',
      name: 'recipientAddress',
      message: 'What is the recipient address?',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter password',
    },
  ]);

  const client = await testnetClient();
  const timelocker = new Timelocker(client);

  // TODO: gracefully handle read error
  const walletInfo: PasswordWalletInfo = JSON.parse(
    fs.readFileSync(WALLET_INFO_FILENAME, 'utf-8')
  );

  const interactor = await PasswordWalletInteractor.load(
    walletInfo,
    timelocker
  );

  // TODO: should password be in hex?
  await interactor.spend(password, recipientAddress);
  console.log(`Successfully sent wallet balance to ${recipientAddress}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
