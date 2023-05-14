import fs from 'fs';
import prompts from 'prompts';
import { decrypt } from '../../utils/passworder';
import { dateToUNIXTimestamp, unixTimestampToDate } from '../../utils';
import { OTPGenerator } from '../../lib/otp-generator';
import { HorusWalletInfo } from '../../lib/horus-wallet-interactor';
import { WALLET_INFO_FILENAME } from '../../constants';

// TODO: clean up
const loadModules = async () => {
  const { default: chalk } = await import('chalk');
  const { default: boxen } = await import('boxen');
  return { chalk, boxen };
};

// TODO: relocate
const calculateOTPParams = (
  genesisUnixTimestamp: number,
  otpInterval: number
): [Date, number] => {
  const now = new Date();
  const nowUNIXTimestamp = dateToUNIXTimestamp(now);

  // TODO: fix duplication w/ calculateUpcomingExpirationUNIXTimestamp
  const secondsSinceGenesis = nowUNIXTimestamp - genesisUnixTimestamp;
  // TODO: rename intervalsUntilExpiration
  const intervalsUntilExpiration = Math.ceil(secondsSinceGenesis / otpInterval);
  const expirationUNIXTimestamp =
    genesisUnixTimestamp + otpInterval * intervalsUntilExpiration;

  const expirationDate = unixTimestampToDate(expirationUNIXTimestamp);
  return [expirationDate, intervalsUntilExpiration];
};

const main = async () => {
  const { chalk, boxen } = await loadModules();
  // TODO: gracefully handle read error
  const walletInfo: HorusWalletInfo = JSON.parse(
    fs.readFileSync(WALLET_INFO_FILENAME, 'utf-8')
  );
  const [expirationDate, counter] = calculateOTPParams(
    dateToUNIXTimestamp(new Date(walletInfo.genesis)),
    walletInfo.params.otpRotationInterval
  );

  const { password } = await prompts([
    {
      type: 'password',
      name: 'password',
      message: 'Password to decrypt OTP seed',
    },
  ]);

  // TODO: handle case were walletInfo.encryptedOTPSeed is undefined
  const decryptedOTPSeed = await decrypt(
    password,
    walletInfo.encryptedOTPSeed!
  );
  const otp = new OTPGenerator(walletInfo.params.otpDigits, decryptedOTPSeed);
  const token = otp.generate(counter);

  const box = boxen(chalk.green(token), {
    title: 'OTP',
    titleAlignment: 'center',
    padding: 1,
  });

  console.log(box);
  console.log(`Valid until:\n${expirationDate.toTimeString()}`);
};

main();
