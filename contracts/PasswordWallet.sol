// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {IDecryptor} from './interfaces/IDecryptor.sol';

// TODO: rename "expiration" to "maturity"
contract PasswordWallet {
  uint256 public constant BLOCK_DELAY = 2; // TODO: determine optimal value

  IDecryptor public immutable decryptor;
  IDecryptor.Ciphertext public ciphertext;
  uint256 public immutable expirationTimestamp;
  uint256 public immutable commitmentCollateral;

  mapping(bytes32 => bool) public commitments;

  uint256 public totalLockedCollateral;

  // TODO: Move to abstract contract
  address public constant CELO = 0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9;

  receive() external payable {}

  fallback() external payable {}

  constructor(
    IDecryptor _decryptor,
    IDecryptor.Ciphertext memory _ciphertext,
    uint256 _expirationTimestamp,
    uint256 _commitmentCollateral
  ) {
    decryptor = _decryptor;
    ciphertext = _ciphertext;
    expirationTimestamp = _expirationTimestamp;
    commitmentCollateral = _commitmentCollateral;
  }

  function commit(bytes32 _commitment) external payable {
    require(msg.value == commitmentCollateral, 'Invalid collateral amount');
    require(
      block.timestamp < expirationTimestamp - BLOCK_DELAY,
      'Expiration date has passed'
    );
    commitments[_commitment] = true;
    totalLockedCollateral += commitmentCollateral;
  }

  function reveal(
    bytes memory _salt,
    address payable _recipient,
    bytes memory _gidt
  ) external {
    bytes memory secret = decryptor.decrypt(ciphertext, _gidt);
    bytes32 hash = keccak256(abi.encodePacked(secret, _salt, _recipient));
    require(commitments[hash], 'Commitment not found');
    totalLockedCollateral -= commitmentCollateral;
    IERC20(CELO).transfer(
      _recipient,
      IERC20(CELO).balanceOf(address(this)) - totalLockedCollateral
    );
  }
}
