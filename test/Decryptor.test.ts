import { expect } from 'chai';
import { ethers } from 'hardhat';
import { pairing, PointG1, PointG2 } from '@noble/bls12-381';
import { roundAt, fetchBeaconByTime } from 'drand-client';
import { testnetClient } from '../drand/testnet-client';
import { encrypt } from '../crypto/ibe';
import { fp12ToBytes } from '../crypto/utils';
import { Decryptor } from '../typechain/Decryptor';
import { hashedRoundNumber } from '../drand/utils';
import { hexlifyCiphertext, sleep } from '../utils';
const { hexlify } = ethers.utils;

describe('Decryptor', function () {
  let decryptor: Decryptor;
  before(async () => {
    const Decrypt = await ethers.getContractFactory('Decryptor');
    decryptor = (await Decrypt.deploy()) as Decryptor;
  });

  it('decrypts', async function () {
    const ciphertext = {
      U: '0x0000000000000000000000000000000016bb960ed9cc31f2c6913acdba41c836070539425d88f538a30743d1baaa3e030119375f5a5b1e248658f3654ec48add000000000000000000000000000000000331e5bf3c5faf733e19320419c0009c0b9890b9446dafb63e0c0d1c4f86f6508ac797cf51f445f0c00bf455ebe4e518',
      V: '0xfd682c68af2d5a7c7ca401948261624b',
      W: '0x9d676d3503577f8e1d01d2e9d656f8ac',
    };

    const gidt =
      '0x0fcd09bf6373431d97211f0be67ffb7e64c3d564da4e9e6e6f228f8886ea6e3d1a1d1653e04837e4cc413822f2ad235e0eef0f84aca7ee695cc1b76bf08e919d0b371837d436792ea5d44b3dd755e585ad63e7fb3ae39a343b3e17de0ed17fc0000285e7edd12d1aacccc5d499ce44ae9f4da160363982d39b3a8b96437d808956e838de6b989744da2def5ab9f8630f0acaa60b22f05283f396effede1a7139a8bc505c879970b351cadc6f4008743284a9f4b9a06f65b5f298735f37d6b53208a0baddfe1513f0a6d6db1bb61850b025c70baa87a454d06cbb1bfc2e3bdded4c0b42990d7633ad7aa826ddb335c3e11402fec7cdffcef8b5faca067e50561ca864b38298efa22cf3e4e1c6a49f094d3939e32b66115cd0cc64e399173d0ea60393c34f2ff91ba7d6f6e40bb1840d51c2411acf77663fe39ada1cd226848a0806180181e4f58bc4300f89181b430af80a5f6261adcef725904b4601135765d3dc55101b47e5ffd0c1c574bf9f20f0c11e85454adeea91d281eb65402b199bd81704653a0256c8b4d32b77dc55063cdb8e316dd0bd3135e25135d48bc469062ee1f7122d84976c5e87033801865dd805137ef8c62d3675d08b8070037a1cf9bf8f06696c3f6be8ffedc1132ed4385ab4cd64f69f41ca8697120da6292d11643f0faa5314f1f2c1b8294a4a9add7bd233f73259aa46a9806c738c394f433801eb58a7c10a3a43beb4f71a68c8bc1cd274003d4384d1c8b5071c9be48e4f13b6965d289afa39404188188336def9addf45d0a0ea43ffbc8d247e7e3280b3dab2bd';
    // const hgidt = '0x67cc0ac41fc14ae84c5d7a5944111f09';
    // const sigma = '0x9aa426acb0ec109430f97bcdc6707d42';
    // const hsigma = '0x3c75330c220f085613851b1f62817428';
    const msg = '0xa1125e39215877d80e84c9f6b4d78c84';
    // const r = '0x3580153dae438eef3b958c2c11581f87b6b6310c678bd985f968ef6a72d3ea71';
    expect(await decryptor.decrypt(ciphertext, gidt)).to.be.equal(msg);
  });

  it('decrypts fresh ciphertext with drand beacon', async function () {
    const client = await testnetClient();
    const chainInfo = await client.chain().info();
    const point = PointG1.fromHex(chainInfo.public_key);
    const beacon = await fetchBeaconByTime(client, Date.now());
    const id = hashedRoundNumber(beacon.round);
    const plaintext = Buffer.from('1337_s3cr3t');
    const ciphertext = await encrypt(point, id, plaintext);
    const p = PointG2.fromHex(beacon.signature);
    const gidt = pairing(ciphertext.U, p);

    expect(
      await decryptor.decrypt(
        hexlifyCiphertext(ciphertext),
        hexlify(fp12ToBytes(gidt))
      )
    ).to.be.equal(hexlify(plaintext));
  });

  it('decrypts old ciphertext with drand beacon', async function () {
    const client = await testnetClient();
    const chainInfo = await client.chain().info();
    const point = PointG1.fromHex(chainInfo.public_key);

    const expirationTime = new Date();
    expirationTime.setSeconds(expirationTime.getSeconds() + 5);

    const id = hashedRoundNumber(roundAt(expirationTime.getTime(), chainInfo));
    const plaintext = Buffer.from('1337_s3cr3t');
    const ciphertext = await encrypt(point, id, plaintext);

    await sleep(5 * 1000);

    const beacon = await fetchBeaconByTime(client, expirationTime.getTime());
    const p = PointG2.fromHex(beacon.signature);
    const gidt = pairing(ciphertext.U, p);

    expect(
      await decryptor.decrypt(
        hexlifyCiphertext(ciphertext),
        hexlify(fp12ToBytes(gidt))
      )
    ).to.be.equal(hexlify(plaintext));
  });
});
