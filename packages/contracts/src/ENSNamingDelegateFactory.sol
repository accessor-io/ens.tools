// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ENSNamingDelegate.sol";
import "./ENSNamingDelegateGranular.sol";

/**
 * @title ENSNamingDelegateFactory
 * @dev Factory contract for deploying isolated delegate contracts
 * @notice This contract enables project isolation by deploying separate delegate contracts
 */
contract ENSNamingDelegateFactory is Ownable, Pausable, ReentrancyGuard {
    
    // Struct to hold project information
    struct Project {
        address basicDelegate;
        address granularDelegate;
        address owner;
        string name;
        uint256 createdAt;
        bool isActive;
    }

    // Mapping from project name to project info
    mapping(string => Project) public projects;
    
    // Mapping from delegate address to project name
    mapping(address => string) public delegateToProject;
    
    // Array of all project names
    string[] public projectNames;
    
    // Events
    event ProjectCreated(
        string indexed projectName,
        address indexed owner,
        address indexed basicDelegate,
        address granularDelegate
    );
    
    event ProjectDeactivated(string indexed projectName);
    
    event ProjectReactivated(string indexed projectName);
    
    event DelegateUpgraded(
        string indexed projectName,
        address indexed oldDelegate,
        address indexed newDelegate
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
     * @dev Create a new project with isolated delegate contracts
     * @param projectName The name of the project
     * @param owner The owner of the project (can be different from msg.sender)
     */
    function createProject(
        string memory projectName,
        address owner
    ) external onlyOwner nonReentrant whenNotPaused returns (
        address basicDelegate,
        address granularDelegate
    ) {
        require(bytes(projectName).length > 0, "Project name cannot be empty");
        require(owner != address(0), "Owner cannot be zero address");
        require(!projects[projectName].isActive, "Project already exists");

        // Deploy basic delegate contract
        ENSNamingDelegate basic = new ENSNamingDelegate();
        basic.transferOwnership(owner);

        // Deploy granular delegate contract
        ENSNamingDelegateGranular granular = new ENSNamingDelegateGranular();
        granular.transferOwnership(owner);

        // Store project information
        projects[projectName] = Project({
            basicDelegate: address(basic),
            granularDelegate: address(granular),
            owner: owner,
            name: projectName,
            createdAt: block.timestamp,
            isActive: true
        });

        // Update mappings
        delegateToProject[address(basic)] = projectName;
        delegateToProject[address(granular)] = projectName;
        projectNames.push(projectName);

        emit ProjectCreated(
            projectName,
            owner,
            address(basic),
            address(granular)
        );

        return (address(basic), address(granular));
    }

    /**
     * @dev Deactivate a project
     * @param projectName The name of the project to deactivate
     */
    function deactivateProject(
        string memory projectName
    ) external onlyProjectOwner(projectName) onlyValidProject(projectName) {
        projects[projectName].isActive = false;
        emit ProjectDeactivated(projectName);
    }

    /**
     * @dev Reactivate a project
     * @param projectName The name of the project to reactivate
     */
    function reactivateProject(
        string memory projectName
    ) external onlyProjectOwner(projectName) {
        require(
            !projects[projectName].isActive,
            "Project is already active"
        );
        
        projects[projectName].isActive = true;
        emit ProjectReactivated(projectName);
    }

    /**
     * @dev Transfer project ownership
     * @param projectName The name of the project
     * @param newOwner The new owner address
     */
    function transferProjectOwnership(
        string memory projectName,
        address newOwner
    ) external onlyProjectOwner(projectName) onlyValidProject(projectName) {
        require(newOwner != address(0), "New owner cannot be zero address");
        
        Project storage project = projects[projectName];
        address oldOwner = project.owner;
        project.owner = newOwner;

        // Transfer ownership of delegate contracts
        ENSNamingDelegate(project.basicDelegate).transferOwnership(newOwner);
        ENSNamingDelegateGranular(project.granularDelegate).transferOwnership(newOwner);
    }

    /**
     * @dev Get project information
     * @param projectName The name of the project
     * @return The project information
     */
    function getProject(
        string memory projectName
    ) external view returns (Project memory) {
        return projects[projectName];
    }

    /**
     * @dev Get all project names
     * @return Array of all project names
     */
    function getAllProjects() external view returns (string[] memory) {
        return projectNames;
    }

    /**
     * @dev Get project by delegate address
     * @param delegateAddress The delegate contract address
     * @return The project name
     */
    function getProjectByDelegate(
        address delegateAddress
    ) external view returns (string memory) {
        return delegateToProject[delegateAddress];
    }

    /**
     * @dev Check if a project exists and is active
     * @param projectName The name of the project
     * @return True if the project exists and is active
     */
    function isProjectActive(string memory projectName) external view returns (bool) {
        return projects[projectName].isActive;
    }

    /**
     * @dev Get the number of projects
     * @return The total number of projects
     */
    function getProjectCount() external view returns (uint256) {
        return projectNames.length;
    }

    /**
     * @dev Get projects by owner
     * @param owner The owner address
     * @return projectNames Array of project names owned by the address
     */
    function getProjectsByOwner(
        address owner
    ) external view returns (string[] memory projectNames) {
        uint256 count = 0;
        
        // Count projects owned by the address
        for (uint256 i = 0; i < projectNames.length; i++) {
            if (projects[projectNames[i]].owner == owner && projects[projectNames[i]].isActive) {
                count++;
            }
        }
        
        // Create result array
        projectNames = new string[](count);
        uint256 index = 0;
        
        // Fill result array
        for (uint256 i = 0; i < projectNames.length; i++) {
            if (projects[projectNames[i]].owner == owner && projects[projectNames[i]].isActive) {
                projectNames[index] = projectNames[i];
                index++;
            }
        }
    }

    /**
     * @dev Emergency function to pause the factory
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Emergency function to unpause the factory
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
