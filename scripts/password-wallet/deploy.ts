import fs from 'fs';
import prompts from 'prompts';
import { testnetClient } from '../../drand/testnet-client';
import { PasswordWalletParams } from '../../lib/password-wallet';
import { Timelocker } from '../../lib/timelocker';
import { PasswordWalletInteractor } from '../../lib/password-wallet-interactor';
import { WALLET_INFO_FILENAME } from '../../constants';

const main = async () => {
  const { expirationDate, commitmentCollateral } = await prompts([
    {
      type: 'date',
      name: 'expirationDate',
      message: 'Pick an expiration date',
      initial: new Date(),
      validate: (date) =>
        date < Date.now() ? 'Date must be in the future' : true,
    },
    {
      type: 'number',
      name: 'commitmentCollateral',
      message: 'Cost of commitment (in wei)?',
    },
  ]);

  const client = await testnetClient();
  const timelocker = new Timelocker(client);

  const walletParams: PasswordWalletParams = {
    expirationDate,
    commitmentCollateralAmount: commitmentCollateral,
  };

  const interactor = new PasswordWalletInteractor(timelocker);
  const walletInfo = await interactor.initialize(walletParams);

  // TODO: clean up
  // TODO: We need a new type for WalletInfo that doesn't include params
  fs.writeFileSync(
    WALLET_INFO_FILENAME,
    JSON.stringify({
      ...walletInfo,
      params: undefined,
    })
  );

  console.log(`Your wallet has been deployed at ${walletInfo.address}`);
  // TODO: handle undefined plaintext
  console.log(
    `Your password is 0x${Buffer.from(walletInfo.params.plaintext!).toString(
      'hex'
    )}`
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
