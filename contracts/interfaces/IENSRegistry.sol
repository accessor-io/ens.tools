// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IENSRegistry
 * @dev Interface for the ENS Registry contract
 * @notice This interface matches the official ENS Registry contract from ensdomains/ens-contracts
 * Reference: https://github.com/ensdomains/ens-contracts/blob/master/contracts/registry/ENSRegistry.sol
 */
interface IENSRegistry {
    // Events (matching official ENS Registry)
    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
    event Transfer(bytes32 indexed node, address owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint64 ttl);

    // View functions (matching official ENS Registry)
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
    function ttl(bytes32 node) external view returns (uint64);

    // State-changing functions (matching official ENS Registry)
    function setOwner(bytes32 node, address owner) external;
    function setSubnodeOwner(bytes32 node, string calldata label, address owner) external;
    function setSubnodeRecord(bytes32 node, string calldata label, address owner, address resolver, uint64 ttl) external;
    function setResolver(bytes32 node, address resolver) external;
    function setTTL(bytes32 node, uint64 ttl) external;
}
