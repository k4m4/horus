# Horus

> Implementation of the "Hours of Horus" smart contract wallets, for Celo.

## Using the `PasswordWallet`

### Create a new wallet

```sh
$ npx hardhat run scripts/password-wallet/deploy.ts --network alfajores
✔ Pick an expiration date › 2023-05-14 14:16:37
✔ Cost of commitment (in wei)? 1000000000000000000
Your wallet has been deployed at 0xA82617762F0faEF59739331Bf19c0A2b35dD4b1B
Your password is 0x45c9cc98d74d
```

### Spend from your wallet

```sh
$ npx hardhat run scripts/password-wallet/spend.ts --network alfajores

✔ What is the recipient address? 0xA9c531b9FB9069a41AEAe3C684B0B46C9402c11e
✔ Enter password **************
Published commitment TX: 0xbdf1af7216b753c9bb683bd3dca330fc4e6f3d8153a324aba26a12149d231d34
Sleeping until wallet expiration: 14:16:37 GMT-0400 (Eastern Daylight Time)
Published reveal TX: 0x24d9e267601262d65fffede77c707b559991a55344d767916771a79b2d172a3f
Successfully sent wallet balance to 0xA9c531b9FB9069a41AEAe3C684B0B46C9402c11e
```

## Using the `HorusWallet`

### Create a new wallet

```sh
$ npx hardhat run scripts/horus-wallet/deploy.ts --network alfajores

✔ Number of OTP digits? 6
✔ OTP rotation interval (in seconds)? 30
✔ Total number of rotations? 100
✔ Password to encrypt OTP seed ************
✔ Cost of commitment (in wei)? 1000000000000000000
Your wallet has been deployed at 0x98516436BAC2EF5C570751a75dC52D45D77b2bbf
The Merkle Tree has been written to data/tree.json
Your OTP seed has been encrypted and saved to data/wallet.json
```

### Spend from your wallet

```sh
# Terminal 1
$ npx hardhat run scripts/horus-wallet/spend.ts --network alfajores

✔ What is the recipient address? 0xA9c531b9FB9069a41AEAe3C684B0B46C9402c11e
✔ How much CELO to send (in wei)? 1
? Enter OTP # Switch to a new terminal:
```

```sh
# Terminal 2
$ npx hardhat run scripts/horus-wallet/display-otp.ts

✔ Password to decrypt OTP seed ************
┌─── OTP ────┐
│            │
│   658266   │
│            │
└────────────┘
Valid until:
14:23:41 GMT-0400 (Eastern Daylight Time)
# Now switch back to Terminal 1
```

```sh
# Terminal 1
✔ Enter OTP 658266
Published commitment TX: 0xc08f5d2d5c808af6bfed8f78fb2edb21d6e660f0adc0e35e3d6fcf7b5cea04e4
Sleeping until OTP expiration: 14:23:41 GMT-0400 (Eastern Daylight Time)
Published reveal TX: 0x18fdec1c73d98e38fad4e1b32498467b7e5c75ea3d1eb55108ce6256f051bea8
Successfully sent 1 CELO to 0xA9c531b9FB9069a41AEAe3C684B0B46C9402c11e
```

## Running Tests

Keep in mind that the tests will not run locally.
They will run via the account of the `PRIVATE_KEY` specified in `.env`.

To run the tests, execute:

```sh
$ npm test
```

## Disclaimer

This code has not been audited. Use it at your own risk.

## License

GPL v3
