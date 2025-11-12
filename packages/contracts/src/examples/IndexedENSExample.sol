// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../IndexedENSManager.sol";
import "../IndexedGranularResolver.sol";
import "../IndexedENSManagerFactory.sol";

/**
 * @title IndexedENSExample
 * @dev Example usage of the indexed ENS management system
 * @notice Demonstrates gas-efficient domain and subdomain management
 */
contract IndexedENSExample {
    
    IndexedENSManagerFactory public factory;
    IndexedENSManager public manager;
    IndexedGranularResolver public resolver;
    
    // Project name
    string public constant PROJECT_NAME = "example-project";
    
    // Domain indexes (set after registration)
    uint8 public whatDomainIndex;
    uint8 public whoDomainIndex;
    
    // Subdomain indexes (set after registration)
    uint16 public abcSubdomainIndex;
    uint16 public defSubdomainIndex;
    uint16 public aabbSubdomainIndex;
    uint16 public ccddSubdomainIndex;
    uint16 public eeffSubdomainIndex;
    
    // Permission constants for easy access
    uint128 public constant MANAGE_SUBDOMAINS = 1 << 0;
    uint128 public constant SET_ADDR_RECORD = 1 << 1;
    uint128 public constant SET_TEXT_RECORD = 1 << 2;
    uint128 public constant SET_CONTENT_HASH = 1 << 3;
    uint128 public constant SET_PUBKEY = 1 << 4;
    uint128 public constant SET_ABI = 1 << 5;
    uint128 public constant SET_ZONEHASH = 1 << 6;
    uint128 public constant SET_TTL = 1 << 7;
    uint128 public constant SET_RESOLVER = 1 << 8;
    uint128 public constant SET_OWNER = 1 << 9;
    uint128 public constant SET_FUSES = 1 << 10;
    
    // Events
    event ProjectInitialized(string indexed projectName, address indexed manager, address indexed resolver);
    event DomainsRegistered(uint8 indexed whatIndex, uint8 indexed whoIndex);
    event SubdomainsRegistered(uint16 indexed abcIndex, uint16 indexed defIndex, uint16 indexed aabbIndex, uint16 ccddIndex, uint16 eeffIndex);
    event DelegatesConfigured();
    
    constructor(address _factory) {
        factory = IndexedENSManagerFactory(_factory);
    }
    
    /**
     * @dev Initialize the example project
     * @return success True if initialization successful
     */
    function initializeProject() external returns (bool success) {
        // Create project through factory
        (address managerAddr, address resolverAddr) = factory.createProject(PROJECT_NAME);
        
        manager = IndexedENSManager(managerAddr);
        resolver = IndexedGranularResolver(resolverAddr);
        
        emit ProjectInitialized(PROJECT_NAME, managerAddr, resolverAddr);
        return true;
    }
    
    /**
     * @dev Register the top-level domains
     * @return success True if registration successful
     */
    function registerTopLevelDomains() external returns (bool success) {
        require(address(manager) != address(0), "Manager not initialized");
        
        // Register what.eth
        whatDomainIndex = manager.registerTopLevelDomain(keccak256(abi.encodePacked(bytes32(0), keccak256(bytes("what")))));
        
        // Register who.eth
        whoDomainIndex = manager.registerTopLevelDomain(keccak256(abi.encodePacked(bytes32(0), keccak256(bytes("who")))));
        
        emit DomainsRegistered(whatDomainIndex, whoDomainIndex);
        return true;
    }
    
    /**
     * @dev Register all subdomains
     * @return success True if registration successful
     */
    function registerSubdomains() external returns (bool success) {
        require(whatDomainIndex > 0 && whoDomainIndex > 0, "Top-level domains not registered");
        
        // Register subdomains for who.eth
        abcSubdomainIndex = manager.registerSubdomain(whoDomainIndex, "abc");
        defSubdomainIndex = manager.registerSubdomain(whoDomainIndex, "def");
        
        // Register subdomains for what.eth
        aabbSubdomainIndex = manager.registerSubdomain(whatDomainIndex, "aabb");
        ccddSubdomainIndex = manager.registerSubdomain(whatDomainIndex, "ccdd");
        eeffSubdomainIndex = manager.registerSubdomain(whatDomainIndex, "eeff");
        
        emit SubdomainsRegistered(abcSubdomainIndex, defSubdomainIndex, aabbSubdomainIndex, ccddSubdomainIndex, eeffSubdomainIndex);
        return true;
    }
    
    /**
     * @dev Configure delegates with different permission levels
     * @param treasuryWallet Treasury wallet address
     * @param devTeam Dev team wallet address
     * @param apiTeam API team wallet address
     * @param marketingTeam Marketing team wallet address
     * @param adminWallet Admin wallet address
     * @return success True if configuration successful
     */
    function configureDelegates(
        address treasuryWallet,
        address devTeam,
        address apiTeam,
        address marketingTeam,
        address adminWallet
    ) external returns (bool success) {
        require(abcSubdomainIndex > 0, "Subdomains not registered");
        
        // Top-level domain delegates
        // what.eth: Only treasury can set addresses
        manager.addDelegate(whatDomainIndex, treasuryWallet, SET_ADDR_RECORD, 0);
        
        // who.eth: Dev team can manage subdomains and text
        manager.addDelegate(whoDomainIndex, devTeam, MANAGE_SUBDOMAINS | SET_TEXT_RECORD, uint32(block.timestamp + 365 days));
        
        // Subdomain-specific delegates
        // abc.who.eth: API team can set text and content hash
        manager.addSubdomainDelegate(whoDomainIndex, abcSubdomainIndex, apiTeam, SET_TEXT_RECORD | SET_CONTENT_HASH, uint32(block.timestamp + 180 days));
        
        // def.who.eth: Marketing team can only set text
        manager.addSubdomainDelegate(whoDomainIndex, defSubdomainIndex, marketingTeam, SET_TEXT_RECORD, uint32(block.timestamp + 90 days));
        
        // aabb.what.eth: Admin has full control
        manager.addSubdomainDelegate(whatDomainIndex, aabbSubdomainIndex, adminWallet, 
            MANAGE_SUBDOMAINS | SET_ADDR_RECORD | SET_TEXT_RECORD | SET_CONTENT_HASH | 
            SET_PUBKEY | SET_ABI | SET_ZONEHASH | SET_TTL | SET_RESOLVER, 
            uint32(block.timestamp + 365 days));
        
        // ccdd.what.eth: API team for content management
        manager.addSubdomainDelegate(whatDomainIndex, ccddSubdomainIndex, apiTeam, SET_TEXT_RECORD | SET_CONTENT_HASH, uint32(block.timestamp + 120 days));
        
        // eeff.what.eth: Marketing team for text records
        manager.addSubdomainDelegate(whatDomainIndex, eeffSubdomainIndex, marketingTeam, SET_TEXT_RECORD, uint32(block.timestamp + 60 days));
        
        emit DelegatesConfigured();
        return true;
    }
    
    /**
     * @dev Demonstrate permission checking
     * @param delegate The delegate address to check
     * @param domainIndex The domain index
     * @param permission The permission to check
     * @return hasPermission True if delegate has permission
     */
    function checkPermission(address delegate, uint8 domainIndex, uint128 permission) external view returns (bool hasPermission) {
        return manager.hasPermission(domainIndex, delegate, permission);
    }
    
    /**
     * @dev Get all delegates for a domain
     * @param domainIndex The domain index
     * @return delegates Array of delegate addresses
     * @return permissions Array of permission masks
     */
    function getDomainDelegates(uint8 domainIndex) external view returns (address[] memory delegates, uint128[] memory permissions) {
        return manager.getDomainDelegates(domainIndex);
    }
    
    /**
     * @dev Get delegates with specific permission
     * @param domainIndex The domain index
     * @param permission The required permission
     * @return delegates Array of delegate addresses with permission
     */
    function getDelegatesWithPermission(uint8 domainIndex, uint128 permission) external view returns (address[] memory delegates) {
        return manager.getDelegatesWithPermission(domainIndex, permission);
    }
    
    /**
     * @dev Get project statistics
     * @return totalDomains Total number of domains
     * @return totalSubdomains Total number of subdomains
     * @return totalDelegates Total number of delegates
     * @return managerAddress Manager contract address
     * @return resolverAddress Resolver contract address
     */
    function getProjectStats() external view returns (
        uint8 totalDomains,
        uint16 totalSubdomains,
        uint16 totalDelegates,
        address managerAddress,
        address resolverAddress
    ) {
        totalDomains = manager.getTotalDomainCount();
        totalSubdomains = manager.getSubdomainCount(whatDomainIndex) + manager.getSubdomainCount(whoDomainIndex);
        totalDelegates = manager.getDelegateCount(whatDomainIndex) + manager.getDelegateCount(whoDomainIndex);
        managerAddress = address(manager);
        resolverAddress = address(resolver);
    }
    
    /**
     * @dev Demonstrate subdomain lookup by label
     * @param parentDomainIndex The parent domain index
     * @param label The subdomain label
     * @return subdomainIndex The subdomain index (0 if not found)
     */
    function findSubdomainByLabel(uint8 parentDomainIndex, string calldata label) external view returns (uint16 subdomainIndex) {
        return manager.getSubdomainIndex(parentDomainIndex, label);
    }
    
    /**
     * @dev Get domain information
     * @param domainIndex The domain index
     * @return namehash The domain namehash
     * @return subdomainCount The number of subdomains
     * @return delegateCount The number of delegates
     */
    function getDomainInfo(uint8 domainIndex) external view returns (
        bytes32 namehash,
        uint16 subdomainCount,
        uint16 delegateCount
    ) {
        namehash = manager.getDomainNamehash(domainIndex);
        subdomainCount = manager.getSubdomainCount(domainIndex);
        delegateCount = manager.getDelegateCount(domainIndex);
    }
    
    /**
     * @dev Demonstrate emergency controls
     * @param domainIndex The domain index to pause
     * @param paused Whether to pause or unpause
     */
    function emergencyPauseDomain(uint8 domainIndex, bool paused) external {
        manager.emergencyPause(domainIndex, paused);
    }
    
    /**
     * @dev Check if domain is emergency paused
     * @param domainIndex The domain index
     * @return isPaused True if emergency paused
     */
    function isDomainEmergencyPaused(uint8 domainIndex) external view returns (bool isPaused) {
        return manager.isEmergencyPaused(domainIndex);
    }
    
    /**
     * @dev Get all registered domain indexes
     * @return domains Array of domain indexes
     */
    function getAllDomainIndexes() external view returns (uint8[] memory domains) {
        uint8 totalDomains = manager.getTotalDomainCount();
        domains = new uint8[](totalDomains);
        
        for (uint8 i = 1; i <= totalDomains; i++) {
            domains[i-1] = i;
        }
    }
    
    /**
     * @dev Get subdomain information
     * @param parentDomainIndex The parent domain index
     * @param subdomainIndex The subdomain index
     * @return labelHash The subdomain label hash
     * @return isActive Whether the subdomain is active
     */
    function getSubdomainInfo(uint8 parentDomainIndex, uint16 subdomainIndex) external view returns (
        bytes32 labelHash,
        bool isActive
    ) {
        labelHash = manager.getSubdomainLabelHash(parentDomainIndex, subdomainIndex);
        // Note: isActive would need to be added to the manager interface
        isActive = true; // Placeholder
    }
}
