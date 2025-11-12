// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockENSRegistry
 * @dev Mock implementation of ENS Registry for testing
 */
contract MockENSRegistry {
    mapping(bytes32 => address) private _owners;
    mapping(bytes32 => address) private _resolvers;
    mapping(bytes32 => uint64) private _ttls;

    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
    event Transfer(bytes32 indexed node, address owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint64 ttl);

    function owner(bytes32 node) external view returns (address) {
        return _owners[node];
    }

    function resolver(bytes32 node) external view returns (address) {
        return _resolvers[node];
    }

    function ttl(bytes32 node) external view returns (uint64) {
        return _ttls[node];
    }

    function setOwner(bytes32 node, address owner) external {
        _owners[node] = owner;
        emit Transfer(node, owner);
    }

    function setSubnodeOwner(bytes32 node, string calldata label, address owner) external {
        bytes32 labelHash = keccak256(abi.encodePacked(label));
        bytes32 subnode = keccak256(abi.encodePacked(node, labelHash));
        _owners[subnode] = owner;
        emit NewOwner(node, labelHash, owner);
    }

    function setSubnodeRecord(bytes32 node, string calldata label, address owner, address resolver, uint64 ttl) external {
        bytes32 labelHash = keccak256(abi.encodePacked(label));
        bytes32 subnode = keccak256(abi.encodePacked(node, labelHash));
        _owners[subnode] = owner;
        _resolvers[subnode] = resolver;
        _ttls[subnode] = ttl;
        emit NewOwner(node, labelHash, owner);
        emit NewResolver(subnode, resolver);
        emit NewTTL(subnode, ttl);
    }

    function setResolver(bytes32 node, address resolver) external {
        _resolvers[node] = resolver;
        emit NewResolver(node, resolver);
    }

    function setTTL(bytes32 node, uint64 ttl) external {
        _ttls[node] = ttl;
        emit NewTTL(node, ttl);
    }
}
