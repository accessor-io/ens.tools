// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IENSRegistry.sol";
import "./interfaces/INameWrapper.sol";

/**
 * @title ENSNamingDelegateGranular
 * @dev Advanced granular delegation contract for ENS domain management
 * @notice This contract provides fine-grained permission control for ENS domains
 */
contract ENSNamingDelegateGranular is Ownable, Pausable, ReentrancyGuard {
    using Address for address;

    // ENS Registry address on mainnet (hardcoded for production use)
    address public constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;
    
    // NameWrapper address on mainnet (hardcoded for production use)
    address public constant NAME_WRAPPER = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;
    
    // Interface instances for type safety
    IENSRegistry private immutable ensRegistry;
    INameWrapper private immutable nameWrapper;

    // Permission constants (bitmask positions) - ENSIP GNA Standard
    uint256 public constant MANAGE_SUBDOMAINS = 1 << 0;      // 1 - setSubnodeOwner, setSubnodeRecord
    uint256 public constant SET_ADDR_RECORD = 1 << 1;       // 2 - setAddr (any coin type)
    uint256 public constant SET_TEXT_RECORD = 1 << 2;       // 4 - setText (any key)
    uint256 public constant SET_CONTENT_HASH = 1 << 3;      // 8 - setContenthash
    uint256 public constant SET_PUBKEY = 1 << 4;            // 16 - setPubkey
    uint256 public constant SET_ABI = 1 << 5;               // 32 - setABI
    uint256 public constant SET_ZONEHASH = 1 << 6;          // 64 - setZonehash
    uint256 public constant SET_TTL = 1 << 7;               // 128 - setTTL
    uint256 public constant SET_RESOLVER = 1 << 8;          // 256 - setResolver
    uint256 public constant SET_OWNER = 1 << 9;             // 512 - setOwner (Registry operations)
    uint256 public constant SET_FUSES = 1 << 10;            // 1024 - setFuses (NameWrapper operations)
    
    // Legacy operation constants for backward compatibility
    uint256 public constant OP_CREATE_SUBDOMAIN = MANAGE_SUBDOMAINS;
    uint256 public constant OP_SET_RECORDS = SET_ADDR_RECORD | SET_TEXT_RECORD | SET_CONTENT_HASH | SET_PUBKEY | SET_ABI | SET_ZONEHASH;
    uint256 public constant OP_TRANSFER = SET_OWNER;
    uint256 public constant OP_SET_FUSES = SET_FUSES;

    // Struct for individual delegate permissions
    struct DelegatePermission {
        uint256 allowedOperations;
        uint256 expiresAt;        // Mandatory expiration (0 = no expiration, but discouraged)
        bool enabled;
        bool locked;
        uint256 createdAt;        // Creation timestamp for audit
        address createdBy;        // Who created this delegation
    }

    // Struct for delegation configuration
    struct DelegationConfig {
        mapping(address => DelegatePermission) permissions;
        mapping(address => bool) delegateExists;
        mapping(address => bool) whitelist;
        mapping(address => bool) blacklist;
        bool enableWhitelist;
        bool enableBlacklist;
        bool emergencyPaused;     // Emergency pause for this specific node
        uint256 maxDelegationDuration; // Maximum allowed delegation duration (0 = no limit)
    }

    // Mapping from namehash to delegation configuration
    mapping(bytes32 => DelegationConfig) public delegations;

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

    event SubdomainCreated(
        bytes32 indexed parentNode,
        string label,
        bytes32 indexed subnode,
        address indexed owner
    );

    event SubdomainTransferred(
        bytes32 indexed parentNode,
        string label,
        bytes32 indexed subnode,
        address indexed newOwner
    );

    // Emergency control events
    event EmergencyPause(bytes32 indexed node, bool paused);
    event EmergencyRevokeAll(bytes32 indexed node);
    event MaxDelegationDurationSet(bytes32 indexed node, uint256 maxDuration);
    event SecurityAlert(bytes32 indexed node, address indexed delegate, string reason);

    // Modifiers
    modifier onlyAuthorizedDelegate(bytes32 node, uint256 requiredOperation) {
        require(
            isAuthorizedDelegate(node, msg.sender, requiredOperation),
            "Not authorized for this operation"
        );
        _;
    }

    modifier onlyValidExpiration(uint256 expiresAt) {
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiration");
        _;
    }

    modifier onlyNotEmergencyPaused(bytes32 node) {
        require(!delegations[node].emergencyPaused, "Node is emergency paused");
        _;
    }

    modifier onlyValidDelegationDuration(bytes32 node, uint256 expiresAt) {
        uint256 maxDuration = delegations[node].maxDelegationDuration;
        if (maxDuration > 0 && expiresAt > 0) {
            require(expiresAt <= block.timestamp + maxDuration, "Delegation duration exceeds maximum");
        }
        _;
    }

    modifier onlyUnlockedDelegate(bytes32 node, address delegate) {
        require(!delegations[node].permissions[delegate].locked, "Delegate is locked");
        _;
    }

    /**
     * @dev Constructor
     * @notice Uses hardcoded mainnet addresses for production ENS integration
     */
    constructor() {
        // Initialize interface instances with hardcoded mainnet addresses
        ensRegistry = IENSRegistry(ENS_REGISTRY);
        nameWrapper = INameWrapper(NAME_WRAPPER);
    }

    /**
     * @dev Add a delegate with specific permissions
     * @param node The namehash of the domain
     * @param delegate The delegate address
     * @param operations Bitmask of allowed operations
     * @param expiresAt Expiration timestamp (0 for no expiration, but discouraged)
     */
    function addDelegate(
        bytes32 node,
        address delegate,
        uint256 operations,
        uint256 expiresAt
    ) external onlyOwner onlyValidExpiration(expiresAt) onlyNotEmergencyPaused(node) onlyValidDelegationDuration(node, expiresAt) {
        require(delegate != address(0), "Delegate cannot be zero");
        require(operations > 0, "Operations must be specified");
        require(!delegations[node].delegateExists[delegate], "Delegate already exists");

        DelegationConfig storage config = delegations[node];
        
        config.permissions[delegate] = DelegatePermission({
            allowedOperations: operations,
            expiresAt: expiresAt,
            enabled: true,
            locked: false,
            createdAt: block.timestamp,
            createdBy: msg.sender
        });
        
        config.delegateExists[delegate] = true;

        emit DelegateAdded(node, delegate, operations, expiresAt);
    }

    /**
     * @dev Remove a delegate
     * @param node The namehash of the domain
     * @param delegate The delegate address to remove
     */
    function removeDelegate(
        bytes32 node,
        address delegate
    ) external onlyOwner onlyUnlockedDelegate(node, delegate) {
        DelegationConfig storage config = delegations[node];
        
        require(config.delegateExists[delegate], "Delegate does not exist");
        
        delete config.permissions[delegate];
        config.delegateExists[delegate] = false;

        emit DelegateRemoved(node, delegate);
    }

    /**
     * @dev Update delegate permissions
     * @param node The namehash of the domain
     * @param delegate The delegate address
     * @param operations New bitmask of allowed operations
     * @param expiresAt New expiration timestamp
     */
    function updateDelegate(
        bytes32 node,
        address delegate,
        uint256 operations,
        uint256 expiresAt
    ) external onlyOwner onlyValidExpiration(expiresAt) {
        DelegationConfig storage config = delegations[node];
        
        require(config.delegateExists[delegate], "Delegate does not exist");
        require(operations > 0, "Operations must be specified");
        
        config.permissions[delegate].allowedOperations = operations;
        config.permissions[delegate].expiresAt = expiresAt;

        emit DelegateUpdated(node, delegate, operations, expiresAt);
    }

    /**
     * @dev Lock a delegate to prevent removal
     * @param node The namehash of the domain
     * @param delegate The delegate address to lock
     */
    function lockDelegate(bytes32 node, address delegate) external onlyOwner {
        DelegationConfig storage config = delegations[node];
        
        require(config.delegateExists[delegate], "Delegate does not exist");
        
        config.permissions[delegate].locked = true;

        emit DelegateLocked(node, delegate);
    }

    /**
     * @dev Unlock a delegate to allow removal
     * @param node The namehash of the domain
     * @param delegate The delegate address to unlock
     */
    function unlockDelegate(bytes32 node, address delegate) external onlyOwner {
        DelegationConfig storage config = delegations[node];
        
        require(config.delegateExists[delegate], "Delegate does not exist");
        
        config.permissions[delegate].locked = false;

        emit DelegateUnlocked(node, delegate);
    }

    /**
     * @dev Enable a delegate
     * @param node The namehash of the domain
     * @param delegate The delegate address to enable
     */
    function enableDelegate(bytes32 node, address delegate) external onlyOwner {
        DelegationConfig storage config = delegations[node];
        
        require(config.delegateExists[delegate], "Delegate does not exist");
        
        config.permissions[delegate].enabled = true;

        emit DelegateEnabled(node, delegate);
    }

    /**
     * @dev Disable a delegate
     * @param node The namehash of the domain
     * @param delegate The delegate address to disable
     */
    function disableDelegate(bytes32 node, address delegate) external onlyOwner {
        DelegationConfig storage config = delegations[node];
        
        require(config.delegateExists[delegate], "Delegate does not exist");
        
        config.permissions[delegate].enabled = false;

        emit DelegateDisabled(node, delegate);
    }

    /**
     * @dev Toggle whitelist functionality
     * @param node The namehash of the domain
     * @param enabled Whether to enable whitelist
     */
    function toggleWhitelist(bytes32 node, bool enabled) external onlyOwner {
        delegations[node].enableWhitelist = enabled;
        emit WhitelistToggled(node, enabled);
    }

    /**
     * @dev Toggle blacklist functionality
     * @param node The namehash of the domain
     * @param enabled Whether to enable blacklist
     */
    function toggleBlacklist(bytes32 node, bool enabled) external onlyOwner {
        delegations[node].enableBlacklist = enabled;
        emit BlacklistToggled(node, enabled);
    }

    /**
     * @dev Add/remove address from whitelist
     * @param node The namehash of the domain
     * @param delegate The address to add/remove
     * @param added Whether to add (true) or remove (false)
     */
    function updateWhitelist(
        bytes32 node,
        address delegate,
        bool added
    ) external onlyOwner {
        delegations[node].whitelist[delegate] = added;
        emit WhitelistUpdated(node, delegate, added);
    }

    /**
     * @dev Add/remove address from blacklist
     * @param node The namehash of the domain
     * @param delegate The address to add/remove
     * @param added Whether to add (true) or remove (false)
     */
    function updateBlacklist(
        bytes32 node,
        address delegate,
        bool added
    ) external onlyOwner {
        delegations[node].blacklist[delegate] = added;
        emit BlacklistUpdated(node, delegate, added);
    }

    /**
     * @dev Create a subdomain via delegation
     * @param parentNode The namehash of the parent domain
     * @param label The label for the subdomain
     * @param owner The owner of the new subdomain
     * @param resolver The resolver for the new subdomain
     * @param ttl The TTL for the new subdomain
     */
    function createSubdomain(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl
    ) external onlyAuthorizedDelegate(parentNode, OP_CREATE_SUBDOMAIN) nonReentrant whenNotPaused {
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
        
        // Call ENS Registry to create the subdomain
        ensRegistry.setSubnodeRecord(parentNode, label, owner, resolver, ttl);
        
        emit SubdomainCreated(parentNode, label, subnode, owner);
    }

    /**
     * @dev Transfer subdomain ownership via delegation
     * @param parentNode The namehash of the parent domain
     * @param label The label of the subdomain
     * @param newOwner The new owner of the subdomain
     */
    function transferSubdomain(
        bytes32 parentNode,
        string calldata label,
        address newOwner
    ) external onlyAuthorizedDelegate(parentNode, OP_TRANSFER) nonReentrant whenNotPaused {
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
        
        // Call ENS Registry to transfer ownership
        ensRegistry.setSubnodeOwner(parentNode, label, newOwner);
        
        emit SubdomainTransferred(parentNode, label, subnode, newOwner);
    }

    /**
     * @dev Check if an address is authorized for a specific operation
     * @param parentNode The namehash of the domain
     * @param delegate The address to check
     * @param requiredOperation The operation to check
     * @return True if the address is authorized
     */
    function isAuthorizedDelegate(
        bytes32 parentNode,
        address delegate,
        uint256 requiredOperation
    ) public view returns (bool) {
        DelegationConfig storage config = delegations[parentNode];
        
        // Check if emergency paused
        if (config.emergencyPaused) {
            return false;
        }
        
        // Check if delegate exists
        if (!config.delegateExists[delegate]) {
            return false;
        }
        
        DelegatePermission memory perm = config.permissions[delegate];
        
        // Check if enabled
        if (!perm.enabled) {
            return false;
        }
        
        // Check expiration
        if (perm.expiresAt > 0 && block.timestamp > perm.expiresAt) {
            return false;
        }
        
        // Check if address has required operation permission
        if ((perm.allowedOperations & requiredOperation) != requiredOperation) {
            return false;
        }
        
        // Check whitelist if enabled
        if (config.enableWhitelist && !config.whitelist[delegate]) {
            return false;
        }
        
        // Check blacklist if enabled
        if (config.enableBlacklist && config.blacklist[delegate]) {
            return false;
        }
        
        return true;
    }

    /**
     * @dev Get delegate information
     * @param node The namehash of the domain
     * @param delegate The delegate address
     * @return The delegate permission information
     */
    function getDelegateInfo(
        bytes32 node,
        address delegate
    ) external view returns (DelegatePermission memory) {
        return delegations[node].permissions[delegate];
    }

    /**
     * @dev Get all delegates for a domain
     * @param node The namehash of the domain
     * @return delegates Array of delegate addresses
     * @return permissions Array of delegate permissions
     */
    function getAllDelegates(
        bytes32 node
    ) external view returns (address[] memory delegates, DelegatePermission[] memory permissions) {
        // This is a simplified version - in practice, you'd need to track delegates in an array
        // For now, this returns empty arrays
        delegates = new address[](0);
        permissions = new DelegatePermission[](0);
    }

    /**
     * @dev Pause the contract (emergency function)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency function to recover stuck ETH
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // ============ EMERGENCY CONTROL FUNCTIONS ============

    /**
     * @dev Emergency pause for a specific node
     * @param node The namehash of the domain
     * @param paused Whether to pause (true) or unpause (false)
     */
    function emergencyPause(bytes32 node, bool paused) external onlyOwner {
        delegations[node].emergencyPaused = paused;
        emit EmergencyPause(node, paused);
    }

    /**
     * @dev Emergency revoke all delegations for a node
     * @param node The namehash of the domain
     */
    function emergencyRevokeAll(bytes32 node) external onlyOwner {
        // Note: This is a simplified implementation
        // In practice, you'd need to iterate through all delegates
        delegations[node].emergencyPaused = true;
        emit EmergencyRevokeAll(node);
    }

    /**
     * @dev Set maximum delegation duration for a node
     * @param node The namehash of the domain
     * @param maxDuration Maximum duration in seconds (0 = no limit)
     */
    function setMaxDelegationDuration(bytes32 node, uint256 maxDuration) external onlyOwner {
        delegations[node].maxDelegationDuration = maxDuration;
        emit MaxDelegationDurationSet(node, maxDuration);
    }

    /**
     * @dev Trigger security alert for monitoring
     * @param node The namehash of the domain
     * @param delegate The delegate address
     * @param reason The reason for the alert
     */
    function triggerSecurityAlert(bytes32 node, address delegate, string calldata reason) external onlyOwner {
        emit SecurityAlert(node, delegate, reason);
    }

    // ============ ENHANCED PERMISSION FUNCTIONS ============

    /**
     * @dev Check if an address has specific permission for a node
     * @param node The namehash of the domain
     * @param delegate The address to check
     * @param permission The specific permission to check
     * @return True if the address has the permission
     */
    function hasPermission(bytes32 node, address delegate, uint256 permission) external view returns (bool) {
        return isAuthorizedDelegate(node, delegate, permission);
    }

    /**
     * @dev Get all permissions for a delegate
     * @param node The namehash of the domain
     * @param delegate The delegate address
     * @return The permission mask
     */
    function getPermissions(bytes32 node, address delegate) external view returns (uint256) {
        if (!delegations[node].delegateExists[delegate]) {
            return 0;
        }
        return delegations[node].permissions[delegate].allowedOperations;
    }

    /**
     * @dev Check if a node is emergency paused
     * @param node The namehash of the domain
     * @return True if emergency paused
     */
    function isEmergencyPaused(bytes32 node) external view returns (bool) {
        return delegations[node].emergencyPaused;
    }

    /**
     * @dev Get maximum delegation duration for a node
     * @param node The namehash of the domain
     * @return Maximum duration in seconds
     */
    function getMaxDelegationDuration(bytes32 node) external view returns (uint256) {
        return delegations[node].maxDelegationDuration;
    }
}
