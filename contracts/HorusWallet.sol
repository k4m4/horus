// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {MerkleProof} from '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {IDecryptor} from './interfaces/IDecryptor.sol';

// TODO: rename expiration to maturity
// TODO: determine fallback (e.g., if wallet not used for > n weeks)
contract HorusWallet {
  uint256 public constant BLOCK_DELAY = 2; // TODO: determine optimal value

  IDecryptor public immutable decryptor;
  bytes32 public immutable root;

  uint256 public immutable genesisTimestamp;
  uint256 public immutable otpInterval;
  uint256 public immutable commitmentCollateral;

  uint256 public totalLockedCollateral;

  mapping(uint256 => bool) public spent;
  mapping(bytes32 => mapping(uint256 => bool)) public commitments;

  // TODO: Move to abstract contract
  address public constant CELO = 0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9;

  receive() external payable {}

  fallback() external payable {}

  constructor(
    IDecryptor _decryptor,
    bytes32 _root,
    uint256 _genesisTimestamp,
    uint256 _otpInterval,
    uint256 _commitmentCollateral
  ) {
    decryptor = _decryptor;
    root = _root;
    genesisTimestamp = _genesisTimestamp;
    otpInterval = _otpInterval;
    commitmentCollateral = _commitmentCollateral;
  }

  function commit(bytes32 _commitment, uint256 _expirationTimestamp)
    external
    payable
  {
    require(msg.value == commitmentCollateral, 'Invalid collateral amount');
    require(
      block.timestamp < _expirationTimestamp - BLOCK_DELAY,
      'Expiration date has passed'
    );
    commitments[_commitment][_expirationTimestamp] = true;
    totalLockedCollateral += commitmentCollateral;
  }

  function reveal(
    bytes memory _salt,
    address payable _recipient,
    uint256 _amount,
    IDecryptor.Ciphertext memory _ciphertext,
    bytes memory _gidt,
    uint256 _expirationTimestamp,
    bytes32[] memory _mtProof
  ) external {
    bytes memory otp = decryptor.decrypt(_ciphertext, _gidt);
    bytes32 hash = keccak256(abi.encodePacked(otp, _salt, _recipient, _amount));
    require(commitments[hash][_expirationTimestamp], 'Commitment not found');
    require(!spent[_expirationTimestamp], 'OTP has already been spent');
    bytes32 leaf = keccak256(
      bytes.concat(
        keccak256(
          abi.encode(
            _ciphertext.U,
            _ciphertext.V,
            _ciphertext.W,
            _expirationTimestamp
          )
        )
      )
    );
    require(
      MerkleProof.verify(_mtProof, root, leaf),
      'Invalid Merkle Tree proof'
    );
    totalLockedCollateral -= commitmentCollateral;
    require(
      IERC20(CELO).balanceOf(address(this)) - totalLockedCollateral >= _amount,
      'Insufficient wallet balance'
    );
    /*if (totalLockedCollateral > 0) {
            IERC20(CELO).burn(totalLockedCollateral);
        }*/
    spent[_expirationTimestamp] = true;
    IERC20(CELO).transfer(_recipient, _amount);
  }
}
