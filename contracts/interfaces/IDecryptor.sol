// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDecryptor {
  struct Ciphertext {
    bytes U;
    bytes V;
    bytes W;
  }

  function decrypt(Ciphertext memory _c, bytes memory _gidt)
    external
    view
    returns (bytes memory);
}
