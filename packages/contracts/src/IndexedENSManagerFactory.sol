// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IndexedENSManager.sol";
import "./IndexedGranularResolver.sol";

/**
 * @title IndexedENSManagerFactory
 * @dev Factory contract for deploying indexed ENS management systems
 * @notice Enables project isolation with gas-indexed indexed storage
 */
contract IndexedENSManagerFactory is Ownable, Pausable, ReentrancyGuard {
    
    // Struct to hold project information
    struct Project {
        address manager;
        address resolver;
        address owner;
        string name;
        uint32 createdAt;
        bool isActive;
        uint8 domainCount;
        uint16 totalDelegates;
    }

    // Mapping from project name to project info
    mapping(string => Project) public projects;
    
    // Mapping from manager address to project name
    mapping(address => string) public managerToProject;
    
    // Mapping from resolver address to project name
    mapping(address => string) public resolverToProject;
    
    // Array of all project names
    string[] public projectNames;
    
    // Events
    event ProjectCreated(
        string indexed projectName,
        address indexed owner,
        address indexed manager,
        address resolver
    );
    
    event ProjectDeactivated(string indexed projectName);
    
    event ProjectReactivated(string indexed projectName);
    
    event ManagerUpgraded(
        string indexed projectName,
        address indexed oldManager,
        address indexed newManager
    );
    
    event ResolverUpgraded(
        string indexed projectName,
        address indexed oldResolver,
        address indexed newResolver
    );

    // Modifiers
    modifier onlyProjectOwner(string memory projectName) {
        require(
            projects[projectName].owner == msg.sender,
            "Not project owner"
        );
        _;
    }

    modifier onlyValidProject(string memory projectName) {
        require(
            projects[projectName].isActive,
            "Project does not exist or is inactive"
        );
        _;
    }

    /**
     * @dev Constructor
     */
    constructor() {}

    /**
     * @dev Create a new project with indexed ENS management
     * @param projectName The name of the project
     * @return manager The deployed manager contract address
     * @return resolver The deployed resolver contract address
     */
    function createProject(string calldata projectName) external onlyOwner returns (address manager, address resolver) {
        require(bytes(projectName).length > 0, "Project name cannot be empty");
        require(projects[projectName].owner == address(0), "Project already exists");
        
        // Deploy IndexedENSManager
        IndexedENSManager newManager = new IndexedENSManager();
        manager = address(newManager);
        
        // Deploy IndexedGranularResolver
        IndexedGranularResolver newResolver = new IndexedGranularResolver(manager);
        resolver = address(newResolver);
        
        // Store project information
        projects[projectName] = Project({
            manager: manager,
            resolver: resolver,
            owner: msg.sender,
            name: projectName,
            createdAt: uint32(block.timestamp),
            isActive: true,
            domainCount: 0,
            totalDelegates: 0
        });
        
        // Update reverse mappings
        managerToProject[manager] = projectName;
        resolverToProject[resolver] = projectName;
        projectNames.push(projectName);
        
        emit ProjectCreated(projectName, msg.sender, manager, resolver);
    }

    /**
     * @dev Deactivate a project
     * @param projectName The name of the project
     */
    function deactivateProject(string calldata projectName) external onlyProjectOwner(projectName) onlyValidProject(projectName) {
        projects[projectName].isActive = false;
        emit ProjectDeactivated(projectName);
    }

    /**
     * @dev Reactivate a project
     * @param projectName The name of the project
     */
    function reactivateProject(string calldata projectName) external onlyProjectOwner(projectName) {
        require(projects[projectName].owner != address(0), "Project does not exist");
        projects[projectName].isActive = true;
        emit ProjectReactivated(projectName);
    }

    /**
     * @dev Upgrade manager for a project
     * @param projectName The name of the project
     * @return newManager The new manager contract address
     */
    function upgradeManager(string calldata projectName) external onlyProjectOwner(projectName) onlyValidProject(projectName) returns (address newManager) {
        address oldManager = projects[projectName].manager;
        
        // Deploy new manager
        IndexedENSManager newManagerContract = new IndexedENSManager();
        newManager = address(newManagerContract);
        
        // Update project
        projects[projectName].manager = newManager;
        
        // Update reverse mapping
        managerToProject[oldManager] = "";
        managerToProject[newManager] = projectName;
        
        emit ManagerUpgraded(projectName, oldManager, newManager);
    }

    /**
     * @dev Upgrade resolver for a project
     * @param projectName The name of the project
     * @return newResolver The new resolver contract address
     */
    function upgradeResolver(string calldata projectName) external onlyProjectOwner(projectName) onlyValidProject(projectName) returns (address newResolver) {
        address oldResolver = projects[projectName].resolver;
        address manager = projects[projectName].manager;
        
        // Deploy new resolver
        IndexedGranularResolver newResolverContract = new IndexedGranularResolver(manager);
        newResolver = address(newResolverContract);
        
        // Update project
        projects[projectName].resolver = newResolver;
        
        // Update reverse mapping
        resolverToProject[oldResolver] = "";
        resolverToProject[newResolver] = projectName;
        
        emit ResolverUpgraded(projectName, oldResolver, newResolver);
    }

    /**
     * @dev Get project information
     * @param projectName The name of the project
     * @return project The project information
     */
    function getProject(string calldata projectName) external view returns (Project memory project) {
        return projects[projectName];
    }

    /**
     * @dev Get all project names
     * @return names Array of project names
     */
    function getAllProjectNames() external view returns (string[] memory names) {
        return projectNames;
    }

    /**
     * @dev Get project count
     * @return count The total number of projects
     */
    function getProjectCount() external view returns (uint256 count) {
        return projectNames.length;
    }

    /**
     * @dev Check if project exists
     * @param projectName The name of the project
     * @return exists True if project exists
     */
    function projectExists(string calldata projectName) external view returns (bool exists) {
        return projects[projectName].owner != address(0);
    }

    /**
     * @dev Get project by manager address
     * @param managerAddress The manager contract address
     * @return projectName The project name
     */
    function getProjectByManager(address managerAddress) external view returns (string memory projectName) {
        return managerToProject[managerAddress];
    }

    /**
     * @dev Get project by resolver address
     * @param resolverAddress The resolver contract address
     * @return projectName The project name
     */
    function getProjectByResolver(address resolverAddress) external view returns (string memory projectName) {
        return resolverToProject[resolverAddress];
    }

    /**
     * @dev Update project statistics
     * @param projectName The name of the project
     * @param domainCount The current domain count
     * @param totalDelegates The total delegate count
     */
    function updateProjectStats(string calldata projectName, uint8 domainCount, uint16 totalDelegates) external {
        require(projects[projectName].manager == msg.sender, "Only project manager can update stats");
        require(projects[projectName].isActive, "Project not active");
        
        projects[projectName].domainCount = domainCount;
        projects[projectName].totalDelegates = totalDelegates;
    }

    /**
     * @dev Pause the factory (emergency function)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the factory
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
}
