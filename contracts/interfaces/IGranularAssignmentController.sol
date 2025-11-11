// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IGranularAssignmentController
 * @dev Interface for the Granular Assignment Controller
 * @notice This interface defines the contract for managing granular ENS permissions
 */
interface IGranularAssignmentController {
    // Structs
    struct DelegatePermission {
        uint256 allowedOperations;
        uint256 expiresAt;
        bool enabled;
        bool locked;
        uint256 createdAt;
        address createdBy;
    }

    // Events
    event DelegateAdded(
        bytes32 indexed node,
        address indexed delegate,
        uint256 operations,
        uint256 expiresAt
    );
    event DelegateRemoved(bytes32 indexed node, address indexed delegate);
    event DelegateUpdated(
        bytes32 indexed node,
        address indexed delegate,
        uint256 operations,
        uint256 expiresAt
    );
    event DelegateLocked(bytes32 indexed node, address indexed delegate);
    event DelegateUnlocked(bytes32 indexed node, address indexed delegate);
    event DelegateEnabled(bytes32 indexed node, address indexed delegate);
    event DelegateDisabled(bytes32 indexed node, address indexed delegate);
    event WhitelistToggled(bytes32 indexed node, bool enabled);
    event BlacklistToggled(bytes32 indexed node, bool enabled);
    event WhitelistUpdated(bytes32 indexed node, address indexed delegate, bool added);
    event BlacklistUpdated(bytes32 indexed node, address indexed delegate, bool added);
    event EmergencyPause(bytes32 indexed node, bool paused);
    event EmergencyRevokeAll(bytes32 indexed node);
    event MaxDelegationDurationSet(bytes32 indexed node, uint256 maxDuration);
    event SecurityAlert(bytes32 indexed node, address indexed delegate, string reason);

    // Permission constants
    function MANAGE_SUBDOMAINS() external view returns (uint256);
    function SET_ADDR_RECORD() external view returns (uint256);
    function SET_TEXT_RECORD() external view returns (uint256);
    function SET_CONTENT_HASH() external view returns (uint256);
    function SET_PUBKEY() external view returns (uint256);
    function SET_ABI() external view returns (uint256);
    function SET_ZONEHASH() external view returns (uint256);
    function SET_TTL() external view returns (uint256);
    function SET_RESOLVER() external view returns (uint256);
    function SET_OWNER() external view returns (uint256);
    function SET_FUSES() external view returns (uint256);

    // Delegation management
    function addDelegate(bytes32 node, address delegate, uint256 operations, uint256 expiresAt) external;
    function removeDelegate(bytes32 node, address delegate) external;
    function updateDelegate(bytes32 node, address delegate, uint256 operations, uint256 expiresAt) external;
    function lockDelegate(bytes32 node, address delegate) external;
    function unlockDelegate(bytes32 node, address delegate) external;
    function enableDelegate(bytes32 node, address delegate) external;
    function disableDelegate(bytes32 node, address delegate) external;

    // Access control lists
    function toggleWhitelist(bytes32 node, bool enabled) external;
    function toggleBlacklist(bytes32 node, bool enabled) external;
    function updateWhitelist(bytes32 node, address delegate, bool added) external;
    function updateBlacklist(bytes32 node, address delegate, bool added) external;

    // Emergency controls
    function emergencyPause(bytes32 node, bool paused) external;
    function emergencyRevokeAll(bytes32 node) external;
    function setMaxDelegationDuration(bytes32 node, uint256 maxDuration) external;
    function triggerSecurityAlert(bytes32 node, address delegate, string calldata reason) external;

    // View functions
    function isAuthorizedDelegate(bytes32 node, address delegate, uint256 requiredOperation) external view returns (bool);
    function hasPermission(bytes32 node, address delegate, uint256 permission) external view returns (bool);
    function getPermissions(bytes32 node, address delegate) external view returns (uint256);
    function getDelegateInfo(bytes32 node, address delegate) external view returns (DelegatePermission memory);
    function isEmergencyPaused(bytes32 node) external view returns (bool);
    function getMaxDelegationDuration(bytes32 node) external view returns (uint256);

    // Subdomain operations
    function createSubdomain(bytes32 parentNode, string calldata label, address owner, address resolver, uint64 ttl) external;
    function transferSubdomain(bytes32 parentNode, string calldata label, address newOwner) external;

    // Emergency functions
    function pause() external;
    function unpause() external;
    function emergencyWithdraw() external;
}
