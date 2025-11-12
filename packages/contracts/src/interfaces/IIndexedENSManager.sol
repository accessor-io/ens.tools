// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IIndexedENSManager
 * @dev Interface for the Indexed ENS Manager
 * @notice Defines the contract interface for gas-indexed ENS domain management
 */
interface IIndexedENSManager {
    // Structs
    struct TopLevelDomain {
        bytes32 namehash;
        uint8 domainIndex;
        bool isActive;
        uint16 subdomainCount;
        uint32 createdAt;
    }
    
    struct Subdomain {
        bytes32 labelHash;
        uint8 parentDomainIndex;
        uint16 subdomainIndex;
        bool isActive;
        uint32 createdAt;
    }
    
    struct PackedDelegatePermission {
        uint128 permissions;
        uint32 expiresAt;
        uint8 flags;
        uint8 domainIndex;
        uint16 subdomainIndex;
    }

    // Events
    event TopLevelDomainRegistered(uint8 indexed domainIndex, bytes32 indexed namehash);
    event SubdomainRegistered(uint8 indexed parentDomainIndex, uint16 indexed subdomainIndex, bytes32 indexed labelHash, string label);
    event DelegateAdded(uint8 indexed domainIndex, uint16 indexed delegateIndex, address indexed delegate, uint128 permissionMask, uint32 expiresAt);
    event SubdomainDelegateAdded(uint8 indexed domainIndex, uint16 indexed subdomainIndex, uint16 indexed delegateIndex, address delegate, uint128 permissionMask, uint32 expiresAt);
    event DelegateRemoved(uint8 indexed domainIndex, uint16 indexed delegateIndex, address indexed delegate);
    event DelegateUpdated(uint8 indexed domainIndex, uint16 indexed delegateIndex, address indexed delegate, uint128 permissionMask, uint32 expiresAt);
    event DelegateLocked(uint8 indexed domainIndex, uint16 indexed delegateIndex, address indexed delegate);
    event DelegateUnlocked(uint8 indexed domainIndex, uint16 indexed delegateIndex, address indexed delegate);
    event DelegateEnabled(uint8 indexed domainIndex, uint16 indexed delegateIndex, address indexed delegate);
    event DelegateDisabled(uint8 indexed domainIndex, uint16 indexed delegateIndex, address indexed delegate);
    event EmergencyPause(uint8 indexed domainIndex, bool paused);
    event EmergencyRevokeAll(uint8 indexed domainIndex);
    event MaxDelegationDurationSet(uint8 indexed domainIndex, uint32 maxDuration);

    // Permission constants
    function MANAGE_SUBDOMAINS() external view returns (uint128);
    function SET_ADDR_RECORD() external view returns (uint128);
    function SET_TEXT_RECORD() external view returns (uint128);
    function SET_CONTENT_HASH() external view returns (uint128);
    function SET_PUBKEY() external view returns (uint128);
    function SET_ABI() external view returns (uint128);
    function SET_ZONEHASH() external view returns (uint128);
    function SET_TTL() external view returns (uint128);
    function SET_RESOLVER() external view returns (uint128);
    function SET_OWNER() external view returns (uint128);
    function SET_FUSES() external view returns (uint128);

    // Domain registration
    function registerTopLevelDomain(bytes32 namehash) external returns (uint8 domainIndex);
    function registerSubdomain(uint8 parentDomainIndex, string calldata label) external returns (uint16 subdomainIndex);
    function getSubdomainIndex(uint8 parentDomainIndex, string calldata label) external view returns (uint16 subdomainIndex);

    // Delegate management
    function addDelegate(uint8 domainIndex, address delegate, uint128 permissionMask, uint32 expiresAt) external;
    function addSubdomainDelegate(uint8 domainIndex, uint16 subdomainIndex, address delegate, uint128 permissionMask, uint32 expiresAt) external;
    function removeDelegate(uint8 domainIndex, uint16 delegateIndex) external;
    function updateDelegate(uint8 domainIndex, uint16 delegateIndex, uint128 permissionMask, uint32 expiresAt) external;
    function lockDelegate(uint8 domainIndex, uint16 delegateIndex) external;
    function unlockDelegate(uint8 domainIndex, uint16 delegateIndex) external;
    function enableDelegate(uint8 domainIndex, uint16 delegateIndex) external;
    function disableDelegate(uint8 domainIndex, uint16 delegateIndex) external;

    // Permission checking
    function isAuthorizedDelegate(uint8 domainIndex, address delegate, uint128 requiredPermission) external view returns (bool);
    function hasPermission(uint8 domainIndex, address delegate, uint128 requiredPermission) external view returns (bool);
    function getPermissions(uint8 domainIndex, address delegate) external view returns (uint128);

    // Query functions
    function getDomainDelegates(uint8 domainIndex) external view returns (address[] memory delegateAddresses, uint128[] memory permissionMasks);
    function getDelegatesWithPermission(uint8 domainIndex, uint128 requiredPermission) external view returns (address[] memory delegateAddresses);
    function getDomainSubdomains(uint8 domainIndex) external view returns (string[] memory subdomainLabels, uint16[] memory subdomainIndexes);

    // Emergency controls
    function emergencyPause(uint8 domainIndex, bool paused) external;
    function isEmergencyPaused(uint8 domainIndex) external view returns (bool);

    // Utility functions
    function getDomainNamehash(uint8 domainIndex) external view returns (bytes32);
    function getSubdomainLabelHash(uint8 domainIndex, uint16 subdomainIndex) external view returns (bytes32);
    function getTotalDomainCount() external view returns (uint8);
    function getSubdomainCount(uint8 domainIndex) external view returns (uint16);
    function getDelegateCount(uint8 domainIndex) external view returns (uint16);

    // Reverse lookups
    function namehashToDomainIndex(bytes32 namehash) external view returns (uint8);
    function addressToDelegateIndex(address delegate, uint8 domainIndex) external view returns (uint16);
    function labelHashToSubdomainIndex(uint8 domainIndex, bytes32 labelHash) external view returns (uint16);
}
