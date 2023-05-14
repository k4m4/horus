import base32 from 'thirty-two';
import { hotp } from 'otplib';
import { random } from '../crypto/utils';
import { OTP_SEED_SIZE_BYTES } from '../constants';

export class OTPGenerator {
  private hotp: typeof hotp;
  private seed: string;

  constructor(digits: number, seed: string) {
    this.hotp = hotp;
    this.hotp.options = { digits };
    this.seed = seed;
  }

  static async generateSeed(): Promise<string> {
    const randomBytes = await random(OTP_SEED_SIZE_BYTES);
    return base32.encode(Buffer.from(randomBytes)).toString();
  }

  public generate(counter: number): string {
    return hotp.generate(this.seed, counter);
  }
}
