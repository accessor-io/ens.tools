// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title ENSNamingDelegate
 * @dev Basic delegation contract for ENS domain management
 * @notice This contract provides primary/secondary delegate functionality for ENS domains
 */
contract ENSNamingDelegate is Ownable, Pausable, ReentrancyGuard {
    using Address for address;

    // ENS Registry address on mainnet
    address public constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;
    
    // NameWrapper address on mainnet
    address public constant NAME_WRAPPER = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;

    // Struct to hold delegation information
    struct Delegation {
        address primaryDelegate;
        address secondaryDelegate;
        uint256 expiresAt;
        bool isActive;
    }

    // Mapping from namehash to delegation info
    mapping(bytes32 => Delegation) public delegations;

    // Events
    event DelegationSet(
        bytes32 indexed node,
        address indexed primaryDelegate,
        address indexed secondaryDelegate,
        uint256 expiresAt
    );

    event DelegationRevoked(bytes32 indexed node);
    
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

    // Modifiers
    modifier onlyAuthorizedDelegate(bytes32 node) {
        require(isAuthorizedDelegate(node, msg.sender), "Not authorized delegate");
        _;
    }

    modifier onlyValidExpiration(uint256 expiresAt) {
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiration");
        _;
    }

    /**
     * @dev Constructor
     */
    constructor() {}

    /**
     * @dev Set delegation for a domain
     * @param node The namehash of the domain
     * @param primaryDelegate The primary delegate address
     * @param secondaryDelegate The secondary delegate address (can be zero)
     * @param expiresAt Expiration timestamp (0 for no expiration)
     */
    function setDelegation(
        bytes32 node,
        address primaryDelegate,
        address secondaryDelegate,
        uint256 expiresAt
    ) external onlyOwner onlyValidExpiration(expiresAt) {
        require(primaryDelegate != address(0), "Primary delegate cannot be zero");
        
        delegations[node] = Delegation({
            primaryDelegate: primaryDelegate,
            secondaryDelegate: secondaryDelegate,
            expiresAt: expiresAt,
            isActive: true
        });

        emit DelegationSet(node, primaryDelegate, secondaryDelegate, expiresAt);
    }

    /**
     * @dev Revoke delegation for a domain
     * @param node The namehash of the domain
     */
    function revokeDelegation(bytes32 node) external onlyOwner {
        delete delegations[node];
        emit DelegationRevoked(node);
    }

    /**
     * @dev Create a subdomain via delegation
     * @param parentNode The namehash of the parent domain
     * @param label The label for the subdomain
     * @param owner The owner of the new subdomain
     * @param resolver The resolver for the new subdomain (can be zero)
     * @param ttl The TTL for the new subdomain
     */
    function createSubdomain(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl
    ) external onlyAuthorizedDelegate(parentNode) nonReentrant whenNotPaused {
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
        
        // Call ENS Registry to create the subdomain
        (bool success, ) = ENS_REGISTRY.call(
            abi.encodeWithSignature(
                "setSubnodeRecord(bytes32,string,address,address,uint64)",
                parentNode,
                label,
                owner,
                resolver,
                ttl
            )
        );
        
        require(success, "Failed to create subdomain");
        
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
    ) external onlyAuthorizedDelegate(parentNode) nonReentrant whenNotPaused {
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
        
        // Call ENS Registry to transfer ownership
        (bool success, ) = ENS_REGISTRY.call(
            abi.encodeWithSignature(
                "setSubnodeOwner(bytes32,string,address)",
                parentNode,
                label,
                newOwner
            )
        );
        
        require(success, "Failed to transfer subdomain");
        
        emit SubdomainTransferred(parentNode, label, subnode, newOwner);
    }

    /**
     * @dev Check if an address is an authorized delegate for a domain
     * @param node The namehash of the domain
     * @param delegate The address to check
     * @return True if the address is authorized
     */
    function isAuthorizedDelegate(bytes32 node, address delegate) public view returns (bool) {
        Delegation memory delegation = delegations[node];
        
        if (!delegation.isActive) {
            return false;
        }
        
        // Check expiration
        if (delegation.expiresAt > 0 && block.timestamp > delegation.expiresAt) {
            return false;
        }
        
        // Check if delegate is primary or secondary
        return delegate == delegation.primaryDelegate || delegate == delegation.secondaryDelegate;
    }

    /**
     * @dev Get delegation information for a domain
     * @param node The namehash of the domain
     * @return The delegation information
     */
    function getDelegation(bytes32 node) external view returns (Delegation memory) {
        return delegations[node];
    }

    /**
     * @dev Check if delegation is active and not expired
     * @param node The namehash of the domain
     * @return True if delegation is active
     */
    function isDelegationActive(bytes32 node) external view returns (bool) {
        Delegation memory delegation = delegations[node];
        
        if (!delegation.isActive) {
            return false;
        }
        
        if (delegation.expiresAt > 0 && block.timestamp > delegation.expiresAt) {
            return false;
        }
        
        return true;
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
}
