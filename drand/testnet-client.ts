import {
  HttpChainClient,
  HttpCachingChain,
  defaultChainOptions,
} from 'drand-client';
import { defaultChainUrl } from '../drand/defaults';

export function testnetClient(): HttpChainClient {
  const chain = new HttpCachingChain(defaultChainUrl, defaultChainOptions);
  return new HttpChainClient(chain, defaultChainOptions, {
    userAgent: 'tlock',
  });
}
