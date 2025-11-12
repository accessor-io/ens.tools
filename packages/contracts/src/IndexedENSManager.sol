// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IENSRegistry.sol";
import "./interfaces/INameWrapper.sol";

/**
 * @title IndexedENSManager
 * @dev Gas-indexed ENS domain management with indexed storage
 * @notice Implements efficient packed data structures for managing multiple ENS domains and subdomains
 */
contract IndexedENSManager is Ownable, Pausable, ReentrancyGuard {
    using Address for address;

    // ENS Registry address on mainnet (hardcoded for production use)
    address public constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;
    
    // NameWrapper address on mainnet (hardcoded for production use)
    address public constant NAME_WRAPPER = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;
    
    // Interface instances for type safety
    IENSRegistry private immutable ensRegistry;
    INameWrapper private immutable nameWrapper;

    // Permission constants (bitmask positions) - ENSIP GNA Standard
    uint128 public constant MANAGE_SUBDOMAINS = 1 << 0;      // 1
    uint128 public constant SET_ADDR_RECORD = 1 << 1;       // 2
    uint128 public constant SET_TEXT_RECORD = 1 << 2;       // 4
    uint128 public constant SET_CONTENT_HASH = 1 << 3;      // 8
    uint128 public constant SET_PUBKEY = 1 << 4;            // 16
    uint128 public constant SET_ABI = 1 << 5;               // 32
    uint128 public constant SET_ZONEHASH = 1 << 6;          // 64
    uint128 public constant SET_TTL = 1 << 7;               // 128
    uint128 public constant SET_RESOLVER = 1 << 8;          // 256
    uint128 public constant SET_OWNER = 1 << 9;             // 512
    uint128 public constant SET_FUSES = 1 << 10;            // 1024

    // ============ CORE INDEXED STORAGE ============
    
    // Top-level domain registry (indexed by domain index)
    struct TopLevelDomain {
        bytes32 namehash;           // 32 bytes
        uint8 domainIndex;          // 1 byte (max 255 domains)
        bool isActive;              // 1 byte
        uint16 subdomainCount;      // 2 bytes (max 65,535 subdomains)
        uint32 createdAt;           // 4 bytes (timestamp)
        // Total: 40 bytes (fits in 2 storage slots)
    }
    
    // Subdomain registry (indexed by parent domain + subdomain index)
    struct Subdomain {
        bytes32 labelHash;          // 32 bytes
        uint8 parentDomainIndex;    // 1 byte
        uint16 subdomainIndex;      // 2 bytes
        bool isActive;              // 1 byte
        uint32 createdAt;           // 4 bytes
        // Total: 40 bytes (fits in 2 storage slots)
    }
    
    // Packed delegate permission (fits in 1 storage slot)
    struct PackedDelegatePermission {
        uint128 permissions;        // 16 bytes (bitmask)
        uint32 expiresAt;           // 4 bytes (timestamp)
        uint8 flags;                // 1 byte (enabled, locked, etc.)
        uint8 domainIndex;          // 1 byte
        uint16 subdomainIndex;      // 2 bytes
        // Total: 24 bytes (fits in 1 storage slot)
    }
    
    // ============ INDEXED MAPPINGS ============
    
    // Top-level domains by index
    mapping(uint8 => TopLevelDomain) public topLevelDomains;
    uint8 public topLevelDomainCount;
    
    // Subdomains by parent domain index + subdomain index
    mapping(uint8 => mapping(uint16 => Subdomain)) public subdomains;
    mapping(uint8 => uint16) public subdomainCounts;
    
    // Delegates by domain index + delegate index
    mapping(uint8 => mapping(uint16 => address)) public delegates;
    mapping(uint8 => uint16) public delegateCounts;
    
    // Packed permissions by domain index + delegate index
    mapping(uint8 => mapping(uint16 => PackedDelegatePermission)) public permissions;
    
    // Reverse lookups for gas efficiency
    mapping(bytes32 => uint8) public namehashToDomainIndex;
    mapping(address => mapping(uint8 => uint16)) public addressToDelegateIndex;
    
    // Subdomain label hash to index mapping for efficient lookups
    mapping(uint8 => mapping(bytes32 => uint16)) public labelHashToSubdomainIndex;
    
    // ============ EVENTS ============
    
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
    
    // Emergency control events
    event EmergencyPause(uint8 indexed domainIndex, bool paused);
    event EmergencyRevokeAll(uint8 indexed domainIndex);
    event MaxDelegationDurationSet(uint8 indexed domainIndex, uint32 maxDuration);
    
    // ============ MODIFIERS ============
    
    modifier onlyValidDomain(uint8 domainIndex) {
        require(domainIndex > 0 && domainIndex <= topLevelDomainCount, "Invalid domain index");
        require(topLevelDomains[domainIndex].isActive, "Domain not active");
        _;
    }
    
    modifier onlyValidSubdomain(uint8 domainIndex, uint16 subdomainIndex) {
        require(subdomainIndex > 0 && subdomainIndex <= subdomainCounts[domainIndex], "Invalid subdomain index");
        require(subdomains[domainIndex][subdomainIndex].isActive, "Subdomain not active");
        _;
    }
    
    modifier onlyValidExpiration(uint32 expiresAt) {
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiration");
        _;
    }
    
    modifier onlyNotEmergencyPaused(uint8 domainIndex) {
        require(!topLevelDomains[domainIndex].isActive || !isEmergencyPaused(domainIndex), "Domain emergency paused");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() {
        ensRegistry = IENSRegistry(ENS_REGISTRY);
        nameWrapper = INameWrapper(NAME_WRAPPER);
    }
    
    // ============ DOMAIN REGISTRATION ============
    
    /**
     * @dev Register a top-level domain
     * @param namehash The namehash of the domain
     * @return domainIndex The assigned domain index
     */
    function registerTopLevelDomain(bytes32 namehash) external onlyOwner returns (uint8 domainIndex) {
        require(topLevelDomainCount < 255, "Max domains reached");
        require(namehashToDomainIndex[namehash] == 0, "Domain already registered");
        
        domainIndex = topLevelDomainCount + 1;
        topLevelDomainCount = domainIndex;
        
        topLevelDomains[domainIndex] = TopLevelDomain({
            namehash: namehash,
            domainIndex: domainIndex,
            isActive: true,
            subdomainCount: 0,
            createdAt: uint32(block.timestamp)
        });
        
        namehashToDomainIndex[namehash] = domainIndex;
        
        emit TopLevelDomainRegistered(domainIndex, namehash);
    }
    
    /**
     * @dev Register a subdomain by label
     * @param parentDomainIndex The parent domain index
     * @param label The label of the subdomain (e.g., "abc", "def")
     * @return subdomainIndex The assigned subdomain index
     */
    function registerSubdomain(uint8 parentDomainIndex, string calldata label) external onlyOwner returns (uint16 subdomainIndex) {
        require(parentDomainIndex > 0 && parentDomainIndex <= topLevelDomainCount, "Invalid parent domain");
        require(subdomainCounts[parentDomainIndex] < 65535, "Max subdomains reached");
        require(bytes(label).length > 0, "Empty label");
        
        bytes32 labelHash = keccak256(bytes(label));
        require(labelHashToSubdomainIndex[parentDomainIndex][labelHash] == 0, "Subdomain already exists");
        
        subdomainIndex = subdomainCounts[parentDomainIndex] + 1;
        subdomainCounts[parentDomainIndex] = subdomainIndex;
        
        subdomains[parentDomainIndex][subdomainIndex] = Subdomain({
            labelHash: labelHash,
            parentDomainIndex: parentDomainIndex,
            subdomainIndex: subdomainIndex,
            isActive: true,
            createdAt: uint32(block.timestamp)
        });
        
        labelHashToSubdomainIndex[parentDomainIndex][labelHash] = subdomainIndex;
        
        // Update parent domain subdomain count
        topLevelDomains[parentDomainIndex].subdomainCount = subdomainIndex;
        
        emit SubdomainRegistered(parentDomainIndex, subdomainIndex, labelHash, label);
    }
    
    /**
     * @dev Get subdomain index by label
     * @param parentDomainIndex The parent domain index
     * @param label The subdomain label
     * @return subdomainIndex The subdomain index (0 if not found)
     */
    function getSubdomainIndex(uint8 parentDomainIndex, string calldata label) external view returns (uint16 subdomainIndex) {
        bytes32 labelHash = keccak256(bytes(label));
        return labelHashToSubdomainIndex[parentDomainIndex][labelHash];
    }
    
    // ============ DELEGATE MANAGEMENT ============
    
    /**
     * @dev Add delegate with packed permissions for top-level domain
     * @param domainIndex The domain index
     * @param delegate The delegate address
     * @param permissionMask The permission bitmask
     * @param expiresAt The expiration timestamp
     */
    function addDelegate(
        uint8 domainIndex,
        address delegate,
        uint128 permissionMask,
        uint32 expiresAt
    ) external onlyOwner onlyValidDomain(domainIndex) onlyValidExpiration(expiresAt) onlyNotEmergencyPaused(domainIndex) {
        require(delegate != address(0), "Invalid delegate");
        require(permissionMask > 0, "No permissions specified");
        
        uint16 delegateIndex = delegateCounts[domainIndex] + 1;
        delegateCounts[domainIndex] = delegateIndex;
        
        delegates[domainIndex][delegateIndex] = delegate;
        addressToDelegateIndex[delegate][domainIndex] = delegateIndex;
        
        permissions[domainIndex][delegateIndex] = PackedDelegatePermission({
            permissions: permissionMask,
            expiresAt: expiresAt,
            flags: 0x01, // enabled = true
            domainIndex: domainIndex,
            subdomainIndex: 0 // 0 means top-level domain
        });
        
        emit DelegateAdded(domainIndex, delegateIndex, delegate, permissionMask, expiresAt);
    }
    
    /**
     * @dev Add delegate for specific subdomain
     * @param domainIndex The parent domain index
     * @param subdomainIndex The subdomain index
     * @param delegate The delegate address
     * @param permissionMask The permission bitmask
     * @param expiresAt The expiration timestamp
     */
    function addSubdomainDelegate(
        uint8 domainIndex,
        uint16 subdomainIndex,
        address delegate,
        uint128 permissionMask,
        uint32 expiresAt
    ) external onlyOwner onlyValidDomain(domainIndex) onlyValidSubdomain(domainIndex, subdomainIndex) onlyValidExpiration(expiresAt) onlyNotEmergencyPaused(domainIndex) {
        require(delegate != address(0), "Invalid delegate");
        require(permissionMask > 0, "No permissions specified");
        
        uint16 delegateIndex = delegateCounts[domainIndex] + 1;
        delegateCounts[domainIndex] = delegateIndex;
        
        delegates[domainIndex][delegateIndex] = delegate;
        addressToDelegateIndex[delegate][domainIndex] = delegateIndex;
        
        permissions[domainIndex][delegateIndex] = PackedDelegatePermission({
            permissions: permissionMask,
            expiresAt: expiresAt,
            flags: 0x01, // enabled = true
            domainIndex: domainIndex,
            subdomainIndex: subdomainIndex
        });
        
        emit SubdomainDelegateAdded(domainIndex, subdomainIndex, delegateIndex, delegate, permissionMask, expiresAt);
    }
    
    /**
     * @dev Remove delegate
     * @param domainIndex The domain index
     * @param delegateIndex The delegate index to remove
     */
    function removeDelegate(uint8 domainIndex, uint16 delegateIndex) external onlyOwner onlyValidDomain(domainIndex) {
        require(delegateIndex > 0 && delegateIndex <= delegateCounts[domainIndex], "Invalid delegate index");
        
        address delegate = delegates[domainIndex][delegateIndex];
        require(delegate != address(0), "Delegate not found");
        
        // Check if locked
        PackedDelegatePermission memory perm = permissions[domainIndex][delegateIndex];
        require((perm.flags & 0x02) == 0, "Delegate is locked");
        
        // Clear mappings
        delete delegates[domainIndex][delegateIndex];
        delete permissions[domainIndex][delegateIndex];
        addressToDelegateIndex[delegate][domainIndex] = 0;
        
        emit DelegateRemoved(domainIndex, delegateIndex, delegate);
    }
    
    /**
     * @dev Update delegate permissions
     * @param domainIndex The domain index
     * @param delegateIndex The delegate index
     * @param permissionMask New permission bitmask
     * @param expiresAt New expiration timestamp
     */
    function updateDelegate(
        uint8 domainIndex,
        uint16 delegateIndex,
        uint128 permissionMask,
        uint32 expiresAt
    ) external onlyOwner onlyValidDomain(domainIndex) onlyValidExpiration(expiresAt) {
        require(delegateIndex > 0 && delegateIndex <= delegateCounts[domainIndex], "Invalid delegate index");
        require(permissionMask > 0, "No permissions specified");
        
        address delegate = delegates[domainIndex][delegateIndex];
        require(delegate != address(0), "Delegate not found");
        
        PackedDelegatePermission storage perm = permissions[domainIndex][delegateIndex];
        perm.permissions = permissionMask;
        perm.expiresAt = expiresAt;
        
        emit DelegateUpdated(domainIndex, delegateIndex, delegate, permissionMask, expiresAt);
    }
    
    /**
     * @dev Lock delegate to prevent removal
     * @param domainIndex The domain index
     * @param delegateIndex The delegate index to lock
     */
    function lockDelegate(uint8 domainIndex, uint16 delegateIndex) external onlyOwner onlyValidDomain(domainIndex) {
        require(delegateIndex > 0 && delegateIndex <= delegateCounts[domainIndex], "Invalid delegate index");
        
        address delegate = delegates[domainIndex][delegateIndex];
        require(delegate != address(0), "Delegate not found");
        
        PackedDelegatePermission storage perm = permissions[domainIndex][delegateIndex];
        perm.flags |= 0x02; // Set locked bit
        
        emit DelegateLocked(domainIndex, delegateIndex, delegate);
    }
    
    /**
     * @dev Unlock delegate to allow removal
     * @param domainIndex The domain index
     * @param delegateIndex The delegate index to unlock
     */
    function unlockDelegate(uint8 domainIndex, uint16 delegateIndex) external onlyOwner onlyValidDomain(domainIndex) {
        require(delegateIndex > 0 && delegateIndex <= delegateCounts[domainIndex], "Invalid delegate index");
        
        address delegate = delegates[domainIndex][delegateIndex];
        require(delegate != address(0), "Delegate not found");
        
        PackedDelegatePermission storage perm = permissions[domainIndex][delegateIndex];
        perm.flags &= uint8(~uint8(0x02)); // Clear locked bit
        
        emit DelegateUnlocked(domainIndex, delegateIndex, delegate);
    }
    
    /**
     * @dev Enable delegate
     * @param domainIndex The domain index
     * @param delegateIndex The delegate index to enable
     */
    function enableDelegate(uint8 domainIndex, uint16 delegateIndex) external onlyOwner onlyValidDomain(domainIndex) {
        require(delegateIndex > 0 && delegateIndex <= delegateCounts[domainIndex], "Invalid delegate index");
        
        address delegate = delegates[domainIndex][delegateIndex];
        require(delegate != address(0), "Delegate not found");
        
        PackedDelegatePermission storage perm = permissions[domainIndex][delegateIndex];
        perm.flags |= 0x01; // Set enabled bit
        
        emit DelegateEnabled(domainIndex, delegateIndex, delegate);
    }
    
    /**
     * @dev Disable delegate
     * @param domainIndex The domain index
     * @param delegateIndex The delegate index to disable
     */
    function disableDelegate(uint8 domainIndex, uint16 delegateIndex) external onlyOwner onlyValidDomain(domainIndex) {
        require(delegateIndex > 0 && delegateIndex <= delegateCounts[domainIndex], "Invalid delegate index");
        
        address delegate = delegates[domainIndex][delegateIndex];
        require(delegate != address(0), "Delegate not found");
        
        PackedDelegatePermission storage perm = permissions[domainIndex][delegateIndex];
        perm.flags &= uint8(~uint8(0x01)); // Clear enabled bit
        
        emit DelegateDisabled(domainIndex, delegateIndex, delegate);
    }
    
    // ============ PERMISSION CHECKING ============
    
    /**
     * @dev Check if address is authorized for specific operation
     * @param domainIndex The domain index
     * @param delegate The address to check
     * @param requiredPermission The required permission
     * @return isAuthorized True if authorized
     */
    function isAuthorizedDelegate(
        uint8 domainIndex,
        address delegate,
        uint128 requiredPermission
    ) public view returns (bool) {
        uint16 delegateIndex = addressToDelegateIndex[delegate][domainIndex];
        if (delegateIndex == 0) return false;
        
        PackedDelegatePermission memory perm = permissions[domainIndex][delegateIndex];
        
        // Check if enabled
        if ((perm.flags & 0x01) == 0) return false;
        
        // Check expiration
        if (perm.expiresAt > 0 && block.timestamp > perm.expiresAt) return false;
        
        // Check permission
        return (perm.permissions & requiredPermission) == requiredPermission;
    }
    
    /**
     * @dev Check permission efficiently
     * @param domainIndex The domain index
     * @param delegate The delegate address
     * @param requiredPermission The required permission
     * @return hasPermission True if delegate has permission
     */
    function hasPermission(uint8 domainIndex, address delegate, uint128 requiredPermission) external view returns (bool) {
        return isAuthorizedDelegate(domainIndex, delegate, requiredPermission);
    }
    
    /**
     * @dev Get all permissions for a delegate
     * @param domainIndex The domain index
     * @param delegate The delegate address
     * @return permissionMask The permission mask
     */
    function getPermissions(uint8 domainIndex, address delegate) external view returns (uint128) {
        uint16 delegateIndex = addressToDelegateIndex[delegate][domainIndex];
        if (delegateIndex == 0) return 0;
        
        PackedDelegatePermission memory perm = permissions[domainIndex][delegateIndex];
        if ((perm.flags & 0x01) == 0) return 0; // Not enabled
        if (perm.expiresAt > 0 && block.timestamp > perm.expiresAt) return 0; // Expired
        
        return perm.permissions;
    }
    
    // ============ QUERY FUNCTIONS ============
    
    /**
     * @dev Get all delegates for a domain (gas efficient)
     * @param domainIndex The domain index
     * @return delegateAddresses Array of delegate addresses
     * @return permissionMasks Array of permission masks
     */
    function getDomainDelegates(uint8 domainIndex) external view returns (
        address[] memory delegateAddresses,
        uint128[] memory permissionMasks
    ) {
        uint16 count = delegateCounts[domainIndex];
        delegateAddresses = new address[](count);
        permissionMasks = new uint128[](count);
        
        for (uint16 i = 1; i <= count; i++) {
            delegateAddresses[i-1] = delegates[domainIndex][i];
            permissionMasks[i-1] = permissions[domainIndex][i].permissions;
        }
    }
    
    /**
     * @dev Get delegates with specific permission (gas efficient)
     * @param domainIndex The domain index
     * @param requiredPermission The required permission bit
     * @return delegateAddresses Array of delegate addresses with permission
     */
    function getDelegatesWithPermission(uint8 domainIndex, uint128 requiredPermission) external view returns (
        address[] memory delegateAddresses
    ) {
        uint16 count = delegateCounts[domainIndex];
        address[] memory temp = new address[](count);
        uint16 resultCount = 0;
        
        for (uint16 i = 1; i <= count; i++) {
            PackedDelegatePermission memory perm = permissions[domainIndex][i];
            if ((perm.permissions & requiredPermission) == requiredPermission && 
                (perm.flags & 0x01) == 0x01 && // enabled
                (perm.expiresAt == 0 || perm.expiresAt > block.timestamp)) {
                temp[resultCount] = delegates[domainIndex][i];
                resultCount++;
            }
        }
        
        delegateAddresses = new address[](resultCount);
        for (uint16 i = 0; i < resultCount; i++) {
            delegateAddresses[i] = temp[i];
        }
    }
    
    /**
     * @dev Get all subdomains for a domain
     * @param domainIndex The domain index
     * @return subdomainLabels Array of subdomain labels
     * @return subdomainIndexes Array of subdomain indexes
     */
    function getDomainSubdomains(uint8 domainIndex) external view returns (
        string[] memory subdomainLabels,
        uint16[] memory subdomainIndexes
    ) {
        uint16 count = subdomainCounts[domainIndex];
        subdomainIndexes = new uint16[](count);
        
        // Note: We can't easily reverse labelHash to label without storing it
        // This would require additional storage for labels
        for (uint16 i = 1; i <= count; i++) {
            subdomainIndexes[i-1] = i;
        }
        
        // Return empty labels array - would need additional storage to reverse
        subdomainLabels = new string[](0);
    }
    
    // ============ EMERGENCY CONTROLS ============
    
    /**
     * @dev Emergency pause for a specific domain
     * @param domainIndex The domain index
     * @param paused Whether to pause (true) or unpause (false)
     */
    function emergencyPause(uint8 domainIndex, bool paused) external onlyOwner onlyValidDomain(domainIndex) {
        // This would require additional storage for emergency pause state
        // For now, we can use the existing isActive flag
        if (paused) {
            topLevelDomains[domainIndex].isActive = false;
        } else {
            topLevelDomains[domainIndex].isActive = true;
        }
        
        emit EmergencyPause(domainIndex, paused);
    }
    
    /**
     * @dev Check if domain is emergency paused
     * @param domainIndex The domain index
     * @return isPaused True if emergency paused
     */
    function isEmergencyPaused(uint8 domainIndex) public view returns (bool) {
        return !topLevelDomains[domainIndex].isActive;
    }
    
    // ============ UTILITY FUNCTIONS ============
    
    /**
     * @dev Get domain namehash by index
     * @param domainIndex The domain index
     * @return namehash The domain namehash
     */
    function getDomainNamehash(uint8 domainIndex) external view returns (bytes32) {
        require(domainIndex > 0 && domainIndex <= topLevelDomainCount, "Invalid domain index");
        return topLevelDomains[domainIndex].namehash;
    }
    
    /**
     * @dev Get subdomain label hash by index
     * @param domainIndex The parent domain index
     * @param subdomainIndex The subdomain index
     * @return labelHash The subdomain label hash
     */
    function getSubdomainLabelHash(uint8 domainIndex, uint16 subdomainIndex) external view returns (bytes32) {
        require(domainIndex > 0 && domainIndex <= topLevelDomainCount, "Invalid domain index");
        require(subdomainIndex > 0 && subdomainIndex <= subdomainCounts[domainIndex], "Invalid subdomain index");
        return subdomains[domainIndex][subdomainIndex].labelHash;
    }
    
    /**
     * @dev Get total domain count
     * @return count The total number of registered domains
     */
    function getTotalDomainCount() external view returns (uint8) {
        return topLevelDomainCount;
    }
    
    /**
     * @dev Get subdomain count for a domain
     * @param domainIndex The domain index
     * @return count The number of subdomains
     */
    function getSubdomainCount(uint8 domainIndex) external view returns (uint16) {
        require(domainIndex > 0 && domainIndex <= topLevelDomainCount, "Invalid domain index");
        return subdomainCounts[domainIndex];
    }
    
    /**
     * @dev Get delegate count for a domain
     * @param domainIndex The domain index
     * @return count The number of delegates
     */
    function getDelegateCount(uint8 domainIndex) external view returns (uint16) {
        require(domainIndex > 0 && domainIndex <= topLevelDomainCount, "Invalid domain index");
        return delegateCounts[domainIndex];
    }
}
