require('dotenv').config();

import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';

const config: HardhatUserConfig = {
  solidity: '0.8.4',
  defaultNetwork: 'alfajores',
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    ganache: {
      url: 'http://127.0.0.1:8545',
      chainId: 1337,
    },
    alfajores: {
      url: 'https://alfajores-forno.celo-testnet.org',
      accounts: [process.env.PRIVATE_KEY || ''],
    },
    hardhat: {
      allowUnlimitedContractSize: true,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 100000000,
  },
};

export default config;
