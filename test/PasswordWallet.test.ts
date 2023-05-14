import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { Signer } from 'ethers';
import { pairing, PointG1, PointG2 } from '@noble/bls12-381';
import { roundAt, fetchBeaconByTime } from 'drand-client';
import { testnetClient } from '../drand/testnet-client';
import { encrypt } from '../crypto/ibe';
import { fp12ToBytes, random } from '../crypto/utils';
import { Decryptor } from '../typechain/Decryptor';
import { PasswordWallet } from '../typechain';
import { hashedRoundNumber } from '../drand/utils';
import { hexlifyCiphertext, sleep } from '../utils';
import { deployPasswordWallet } from '../utils/deploy';
const { hexlify, solidityKeccak256, parseEther } = ethers.utils;

const NONCE_LENGTH_BYTES = 16;
const SECONDS_UNTIL_REVEAL = 3;

describe('PasswordWallet', function () {
  let decryptor: Decryptor;
  let signer: Signer;
  before(async () => {
    [signer] = await ethers.getSigners();
    const DecryptorFactory = await ethers.getContractFactory('Decryptor');
    decryptor = (await DecryptorFactory.deploy()) as Decryptor;
    await decryptor.deployed();
  });

  it('deploys, commits, reveals', async function () {
    const client = await testnetClient();
    const chainInfo = await client.chain().info();
    const point = PointG1.fromHex(chainInfo.public_key);

    const expirationTime = new Date();
    expirationTime.setSeconds(
      expirationTime.getSeconds() + SECONDS_UNTIL_REVEAL
    );
    const expirationTimestamp = expirationTime.getTime();

    const id = hashedRoundNumber(roundAt(expirationTimestamp, chainInfo));
    const plaintext = Buffer.from('1337_s3cr3t');
    const ciphertext = await encrypt(point, id, plaintext);
    const hexlifiedCiphertext = hexlifyCiphertext(ciphertext);

    const wallet: PasswordWallet = await deployPasswordWallet(
      decryptor.address,
      hexlifiedCiphertext,
      expirationTimestamp,
      BigInt(0) // TODO: test commitment collateral
    );

    await wallet.deployed();

    await signer.sendTransaction({
      to: wallet.address,
      value: parseEther('0.01'),
      maxPriorityFeePerGas: '5000000000',
      maxFeePerGas: '6000000000000',
      gasLimit: 250000,
    });

    expect(await wallet.ciphertext()).to.be.deep.equal([
      hexlifiedCiphertext.U,
      hexlifiedCiphertext.V,
      hexlifiedCiphertext.W,
    ]);
    expect((await wallet.expirationTimestamp()).toNumber()).to.be.equal(
      expirationTimestamp
    );

    const recipientAddress = '0xCEeaAE509771F7abf587a8803602895c4c296601';
    const salt = await random(NONCE_LENGTH_BYTES);
    const commitment = solidityKeccak256(
      ['bytes', 'bytes', 'address'],
      [plaintext, salt, recipientAddress]
    );

    const commitTx = await wallet.commit(commitment);
    await commitTx.wait();

    await sleep(SECONDS_UNTIL_REVEAL * 1000);

    expect(await wallet.commitments(commitment)).to.be.true;

    const beacon = await fetchBeaconByTime(client, expirationTimestamp);
    const p = PointG2.fromHex(beacon.signature);
    const gidt = hexlify(fp12ToBytes(pairing(ciphertext.U, p)));

    await expect(wallet.reveal(salt, recipientAddress, gidt)).to.not.be
      .reverted;
  });
});
