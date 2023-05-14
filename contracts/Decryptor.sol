// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BytesLib} from 'solidity-bytes-utils/contracts/BytesLib.sol';
import {IDecryptor} from './interfaces/IDecryptor.sol';

contract Decryptor is IDecryptor {
  using BytesLib for bytes;

  address internal constant G1_MUL = address(0xf1);

  bytes internal constant G1_BASE =
    '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x17\xf1\xd3\xa7\x31\x97\xd7\x94\x26\x95\x63\x8c\x4f\xa9\xac\x0f\xc3\x68\x8c\x4f\x97\x74\xb9\x05\xa1\x4e\x3a\x3f\x17\x1b\xac\x58\x6c\x55\xe8\x3f\xf9\x7a\x1a\xef\xfb\x3a\xf0\x0a\xdb\x22\xc6\xbb\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xb3\xf4\x81\xe3\xaa\xa0\xf1\xa0\x9e\x30\xed\x74\x1d\x8a\xe4\xfc\xf5\xe0\x95\xd5\xd0\x0a\xf6\x00\xdb\x18\xcb\x2c\x04\xb3\xed\xd0\x3c\xc7\x44\xa2\x88\x8a\xe4\x0c\xaa\x23\x29\x46\xc5\xe7\xe1';
  uint256 public constant CURVE_r =
    0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001;

  uint256 public constant BITS_TO_MASK_FOR_BLS12_381 = 1;

  function isEqual(bytes memory _a, bytes memory _b)
    internal
    pure
    returns (bool)
  {
    return keccak256(abi.encodePacked(_a)) == keccak256(abi.encodePacked(_b));
  }

  function bytesToUint256(bytes memory _bytes) internal pure returns (uint256) {
    uint256 n;
    assembly {
      n := mload(add(_bytes, add(0x20, 0)))
    }

    return n;
  }

  function decrypt(IDecryptor.Ciphertext memory _c, bytes memory _gidt)
    public
    view
    override
    returns (bytes memory)
  {
    bytes memory hgidt = gtToHash(_gidt, _c.W.length);
    require(hgidt.length == _c.V.length, 'XOR with incompatible sizes');
    bytes memory sigma = xor(hgidt, _c.V);
    bytes memory hsigma = h4(sigma, _c.W.length);
    bytes memory message = xor(hsigma, _c.W);
    bytes memory r = h3(sigma, message);
    bytes memory result;
    bool success;
    (success, result) = G1_MUL.staticcall(abi.encodePacked(G1_BASE, r));
    require(success, 'G1 multiplication failed');
    require(isEqual(result, _c.U), 'invalid proof: rP check failed');
    return message;
  }

  function gtToHash(bytes memory _gt, uint256 _len)
    internal
    pure
    returns (bytes memory)
  {
    return
      abi.encodePacked(sha256(abi.encodePacked('IBE-H2', _gt))).slice(0, _len);
  }

  function h3(bytes memory _sigma, bytes memory _msg)
    internal
    pure
    returns (bytes memory)
  {
    bytes memory h3ret = abi.encodePacked(
      sha256(abi.encodePacked('IBE-H3', _sigma, _msg))
    );

    return toField(h3ret);
  }

  function h4(bytes memory _sigma, uint256 _len)
    internal
    pure
    returns (bytes memory)
  {
    bytes memory h4sigma = abi.encodePacked(
      sha256(abi.encodePacked('IBE-H4', _sigma))
    );

    return h4sigma.slice(0, _len);
  }

  function toField(bytes memory _h3ret) internal pure returns (bytes memory) {
    bytes memory data = _h3ret;
    uint256 n = bytesToUint256(data);
    do {
      data = abi.encodePacked(sha256(data));
      data[0] = data[0] >> BITS_TO_MASK_FOR_BLS12_381;
      n = bytesToUint256(data);
    } while (n <= 0 || n > CURVE_r);
    return abi.encodePacked(n);
  }

  function xor(bytes memory _a, bytes memory _b)
    internal
    pure
    returns (bytes memory)
  {
    require(_a.length == _b.length, 'XOR with incompatible sizes');
    bytes memory ret = new bytes(_a.length);
    for (uint256 i = 0; i < _a.length; i++) {
      ret[i] = _a[i] ^ _b[i];
    }

    return ret;
  }
}
