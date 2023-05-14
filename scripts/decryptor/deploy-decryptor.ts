import { deployDecryptor } from '../../utils/deploy';

async function main() {
  const decryptor = await deployDecryptor();
  console.log('Decryptor deployed to:', decryptor.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
