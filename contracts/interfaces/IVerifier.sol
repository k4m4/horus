// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVerifier {
  function verify(bytes memory _msg, bytes memory _sig)
    external
    view
    returns (bool);
}
