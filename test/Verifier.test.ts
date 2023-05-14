import { expect } from 'chai';
import { ethers } from 'hardhat';
import { verify } from '@noble/bls12-381';
import { Verifier } from '../typechain/Verifier';
import { fetchBeaconByTime } from 'drand-client';
import { testnetClient } from '../drand/testnet-client';
import { hashedRoundNumber } from '../drand/utils';
import { padSignature } from '../utils';

const { hexlify } = ethers.utils;

describe('Verifier', function () {
  let verifier: Verifier;

  before(async () => {
    const Verifier = await ethers.getContractFactory('Verifier');
    verifier = await Verifier.deploy();
  });

  it('verifies', async function () {
    const msg =
      '0xcd2662154e6d76b2b2b92e70c0cac3ccf534f9b74eb5b89819ec509083d00a50';
    const sig =
      '0x000000000000000000000000000000000522898f33f23a7de363c66f90ffd49ec77ebf7f6c1478a9ecd6e714b4d532ab43d044da0a16fed13b4791d7fc999e2b0000000000000000000000000000000006ecea71376e78abd19aaf0ad52f462a6483626563b1023bd04815a7b953da888c74f5bf6ee672a5688603ab31002623000000000000000000000000000000000801c1decf8580d5691830e5b2fc88e0017566a4f08ad3881280f21132c10e118688aeb3a09afd5413a9b760e918c4370000000000000000000000000000000001e123c257341581c6cef6be28fd985c31c7d94b5a6a10351d339d36a8b8a65b361cbe92f01b9e215d51aed4a819f39d';
    expect(await verifier.verify(msg, sig)).equal(true);
  });

  it('verifies drand testnet beacon', async function () {
    const client = await testnetClient();
    const chain = await client.chain();
    const info = await chain.info();
    const publicKey = info.public_key;
    expect(publicKey).to.be.equal(
      '8200fc249deb0148eb918d6e213980c5d01acd7fc251900d9260136da3b54836ce125172399ddc69c4e3e11429b62c11'
    );
    const beacon = await fetchBeaconByTime(client, Date.now());
    const signature = beacon.signature;
    const message = hashedRoundNumber(beacon.round);
    const isValid = await verify(signature, message, publicKey);
    expect(isValid);

    const msg = hexlify(message);
    const sig = padSignature(signature);

    expect(await verifier.verify(msg, sig)).equal(true);
  });
});
