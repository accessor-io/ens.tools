// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockNameWrapper
 * @dev Mock implementation of NameWrapper for testing
 */
contract MockNameWrapper {
    mapping(address => mapping(bytes32 => uint256)) private _balances;
    mapping(bytes32 => address) private _owners;
    mapping(bytes32 => uint32) private _fuses;

    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );

    function balanceOf(address account, bytes32 id) external view returns (uint256) {
        return _balances[account][id];
    }

    function ownerOf(bytes32 id) external view returns (address) {
        return _owners[id];
    }

    function setOwner(bytes32 id, address owner) external {
        _owners[id] = owner;
    }

    function getFuses(bytes32 node) external view returns (uint32) {
        return _fuses[node];
    }

    function setFuses(bytes32 node, uint32 fuses) external {
        _fuses[node] = fuses;
    }

    function setSubnodeRecord(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) external {
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
        _owners[subnode] = owner;
        _fuses[subnode] = fuses;
    }
}
