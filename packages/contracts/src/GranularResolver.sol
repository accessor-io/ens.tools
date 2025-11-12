// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IENSRegistry.sol";
import "./interfaces/IENSResolver.sol";
import "./interfaces/IGranularAssignmentController.sol";

/**
 * @title GranularResolver
 * @dev ENS Resolver with granular permission enforcement
 * @notice Implements the ENSIP GNA specification for fine-grained delegation
 */
contract GranularResolver is IENSResolver, Ownable, Pausable, ReentrancyGuard {
    using Address for address;

    // ENS Registry address on mainnet (hardcoded for production use)
    address public constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;
    
    // Granular Assignment Controller address (set during deployment)
    address public immutable granularController;
    
    // Interface instances for type safety
    IENSRegistry private immutable ensRegistry;
    IGranularAssignmentController private immutable granularControllerInterface;

    // Permission constants (must match GranularAssignmentController)
    uint256 public constant MANAGE_SUBDOMAINS = 1 << 0;      // 1
    uint256 public constant SET_ADDR_RECORD = 1 << 1;       // 2
    uint256 public constant SET_TEXT_RECORD = 1 << 2;       // 4
    uint256 public constant SET_CONTENT_HASH = 1 << 3;      // 8
    uint256 public constant SET_PUBKEY = 1 << 4;            // 16
    uint256 public constant SET_ABI = 1 << 5;               // 32
    uint256 public constant SET_ZONEHASH = 1 << 6;          // 64
    uint256 public constant SET_TTL = 1 << 7;               // 128
    uint256 public constant SET_RESOLVER = 1 << 8;          // 256
    uint256 public constant SET_OWNER = 1 << 9;             // 512
    uint256 public constant SET_FUSES = 1 << 10;            // 1024

    // Storage for resolver records
    mapping(bytes32 => address) private _addresses;
    mapping(bytes32 => mapping(uint256 => bytes)) private _addressesByCoinType;
    mapping(bytes32 => mapping(string => string)) private _textRecords;
    mapping(bytes32 => bytes) private _contentHashes;
    mapping(bytes32 => bytes32) private _pubkeysX;
    mapping(bytes32 => bytes32) private _pubkeysY;
    mapping(bytes32 => mapping(uint256 => bytes)) private _abis;
    mapping(bytes32 => bytes) private _zoneHashes;
    mapping(bytes32 => uint64) private _ttls;
    mapping(bytes32 => mapping(bytes4 => address)) private _interfaces;

    // Owner override control
    mapping(bytes32 => bool) private _ownerOverrideDisabled;

    // Events
    event RecordSet(bytes32 indexed node, string recordType, address indexed setter);
    event OwnerOverrideToggled(bytes32 indexed node, bool disabled);
    event GranularControllerUpdated(address indexed oldController, address indexed newController);

    // Modifiers
    modifier onlyAuthorized(bytes32 node, uint256 requiredPermission) {
        require(
            isAuthorized(node, msg.sender, requiredPermission),
            "GranularResolver: Not authorized for this operation"
        );
        _;
    }

    modifier onlyNotPaused() {
        require(!paused(), "GranularResolver: Contract is paused");
        _;
    }

    /**
     * @dev Constructor
     * @param _granularController Address of the GranularAssignmentController
     * @notice Uses hardcoded mainnet ENS Registry address for production integration
     */
    constructor(address _granularController) {
        require(_granularController != address(0), "GranularResolver: Invalid controller address");
        
        granularController = _granularController;
        
        // Initialize interface instances with hardcoded mainnet addresses
        ensRegistry = IENSRegistry(ENS_REGISTRY);
        granularControllerInterface = IGranularAssignmentController(_granularController);
    }

    /**
     * @dev Update the granular controller address
     * @param _newController New controller address
     */
    function updateGranularController(address _newController) external onlyOwner {
        require(_newController != address(0), "GranularResolver: Invalid controller address");
        address oldController = address(granularController);
        // Note: This would require changing the immutable variable, which is not possible
        // In practice, you'd need to deploy a new resolver or use a proxy pattern
        revert("GranularResolver: Controller address cannot be changed after deployment");
    }

    /**
     * @dev Toggle owner override for a node
     * @param node The namehash of the domain
     * @param disabled Whether to disable owner override
     */
    function toggleOwnerOverride(bytes32 node, bool disabled) external {
        require(
            ensRegistry.owner(node) == msg.sender,
            "GranularResolver: Only ENS owner can toggle override"
        );
        _ownerOverrideDisabled[node] = disabled;
        emit OwnerOverrideToggled(node, disabled);
    }

    /**
     * @dev Check if caller is authorized for a specific operation
     * @param node The namehash of the domain
     * @param caller The address to check
     * @param requiredPermission The permission required
     * @return True if authorized
     */
    function isAuthorized(bytes32 node, address caller, uint256 requiredPermission) public view returns (bool) {
        // Check if caller is the ENS Registry owner
        if (ensRegistry.owner(node) == caller) {
            // If owner override is disabled, owner cannot bypass GNA
            if (_ownerOverrideDisabled[node]) {
                return false;
            }
            return true;
        }

        // Check GNA delegation
        return granularControllerInterface.isAuthorizedDelegate(
            node, 
            caller, 
            requiredPermission
        );
    }

    // ============ RESOLVER SETTER FUNCTIONS ============

    /**
     * @dev Set the address for a node (ETH address)
     * @param node The namehash of the domain
     * @param a The address to set
     */
    function setAddr(bytes32 node, address a) external onlyAuthorized(node, SET_ADDR_RECORD) nonReentrant whenNotPaused {
        _addresses[node] = a;
        emit RecordSet(node, "addr", msg.sender);
    }

    /**
     * @dev Set the address for a node (multicoin)
     * @param node The namehash of the domain
     * @param coinType The coin type
     * @param a The address bytes to set
     */
    function setAddr(bytes32 node, uint256 coinType, bytes memory a) external onlyAuthorized(node, SET_ADDR_RECORD) nonReentrant whenNotPaused {
        _addressesByCoinType[node][coinType] = a;
        emit RecordSet(node, "addr", msg.sender);
    }

    /**
     * @dev Set a text record for a node
     * @param node The namehash of the domain
     * @param key The text key
     * @param value The text value
     */
    function setText(bytes32 node, string calldata key, string calldata value) external onlyAuthorized(node, SET_TEXT_RECORD) nonReentrant whenNotPaused {
        _textRecords[node][key] = value;
        emit RecordSet(node, "text", msg.sender);
    }

    /**
     * @dev Set the content hash for a node
     * @param node The namehash of the domain
     * @param hash The content hash
     */
    function setContenthash(bytes32 node, bytes calldata hash) external onlyAuthorized(node, SET_CONTENT_HASH) nonReentrant whenNotPaused {
        _contentHashes[node] = hash;
        emit RecordSet(node, "contenthash", msg.sender);
    }

    /**
     * @dev Set the public key for a node
     * @param node The namehash of the domain
     * @param x The X coordinate
     * @param y The Y coordinate
     */
    function setPubkey(bytes32 node, bytes32 x, bytes32 y) external onlyAuthorized(node, SET_PUBKEY) nonReentrant whenNotPaused {
        _pubkeysX[node] = x;
        _pubkeysY[node] = y;
        emit RecordSet(node, "pubkey", msg.sender);
    }

    /**
     * @dev Set the ABI for a node
     * @param node The namehash of the domain
     * @param contentType The content type
     * @param data The ABI data
     */
    function setABI(bytes32 node, uint256 contentType, bytes calldata data) external onlyAuthorized(node, SET_ABI) nonReentrant whenNotPaused {
        _abis[node][contentType] = data;
        emit RecordSet(node, "abi", msg.sender);
    }

    /**
     * @dev Set the zone hash for a node
     * @param node The namehash of the domain
     * @param hash The zone hash
     */
    function setZonehash(bytes32 node, bytes calldata hash) external onlyAuthorized(node, SET_ZONEHASH) nonReentrant whenNotPaused {
        _zoneHashes[node] = hash;
        emit RecordSet(node, "zonehash", msg.sender);
    }

    /**
     * @dev Set the TTL for a node
     * @param node The namehash of the domain
     * @param ttl The TTL value
     */
    function setTTL(bytes32 node, uint64 ttl) external onlyAuthorized(node, SET_TTL) nonReentrant whenNotPaused {
        _ttls[node] = ttl;
        emit RecordSet(node, "ttl", msg.sender);
    }

    /**
     * @dev Set an interface for a node
     * @param node The namehash of the domain
     * @param interfaceID The interface ID
     * @param implementer The implementer address
     */
    function setInterface(bytes32 node, bytes4 interfaceID, address implementer) external onlyAuthorized(node, SET_ABI) nonReentrant whenNotPaused {
        _interfaces[node][interfaceID] = implementer;
        emit RecordSet(node, "interface", msg.sender);
    }

    // ============ RESOLVER GETTER FUNCTIONS ============

    /**
     * @dev Get the address for a node (ETH address)
     * @param node The namehash of the domain
     * @return The address
     */
    function addr(bytes32 node) external view returns (address) {
        return _addresses[node];
    }

    /**
     * @dev Get the address for a node (multicoin)
     * @param node The namehash of the domain
     * @param coinType The coin type
     * @return The address bytes
     */
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory) {
        return _addressesByCoinType[node][coinType];
    }

    /**
     * @dev Get a text record for a node
     * @param node The namehash of the domain
     * @param key The text key
     * @return The text value
     */
    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return _textRecords[node][key];
    }

    /**
     * @dev Get the content hash for a node
     * @param node The namehash of the domain
     * @return The content hash
     */
    function contenthash(bytes32 node) external view returns (bytes memory) {
        return _contentHashes[node];
    }

    /**
     * @dev Get the public key for a node
     * @param node The namehash of the domain
     * @return x The X coordinate
     * @return y The Y coordinate
     */
    function pubkey(bytes32 node) external view returns (bytes32 x, bytes32 y) {
        return (_pubkeysX[node], _pubkeysY[node]);
    }

    /**
     * @dev Get the ABI for a node
     * @param node The namehash of the domain
     * @param contentTypes The content types
     * @return The content type and ABI data
     */
    function ABI(bytes32 node, uint256 contentTypes) external view returns (uint256, bytes memory) {
        for (uint256 i = 0; i < 8; i++) {
            uint256 contentType = contentTypes & (1 << i);
            if (contentType > 0 && _abis[node][contentType].length > 0) {
                return (contentType, _abis[node][contentType]);
            }
        }
        return (0, "");
    }

    /**
     * @dev Get the zone hash for a node
     * @param node The namehash of the domain
     * @return The zone hash
     */
    function zonehash(bytes32 node) external view returns (bytes memory) {
        return _zoneHashes[node];
    }

    /**
     * @dev Get the TTL for a node
     * @param node The namehash of the domain
     * @return The TTL value
     */
    function ttl(bytes32 node) external view returns (uint64) {
        return _ttls[node];
    }

    /**
     * @dev Get an interface for a node
     * @param node The namehash of the domain
     * @param interfaceID The interface ID
     * @return The implementer address
     */
    function interfaceImplementer(bytes32 node, bytes4 interfaceID) external view returns (address) {
        return _interfaces[node][interfaceID];
    }

    // ============ EMERGENCY FUNCTIONS ============

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

    // ============ ADDITIONAL RESOLVER FUNCTIONS ============

    /**
     * @dev Set authorization for a node (legacy function)
     * @param node The namehash of the domain
     * @param target The target address
     * @param isAuthorised Whether the target is authorized
     */
    function setAuthorisation(bytes32 node, address target, bool isAuthorised) external {
        // This would need to be implemented based on the specific resolver interface
        revert("Not implemented in this version");
    }

    /**
     * @dev Check if a node is authorized (legacy function)
     * @param node The namehash of the domain
     * @return Whether the node is authorized
     */
    function isAuthorised(bytes32 node) external view returns (bool) {
        // This would need to be implemented based on the specific resolver interface
        return false;
    }

    /**
     * @dev Set multihash for a node (legacy function)
     * @param node The namehash of the domain
     * @param hash The multihash value
     */
    function setMultihash(bytes32 node, bytes calldata hash) external {
        // Legacy function - not implemented
        revert("Multihash not supported");
    }

    /**
     * @dev Get multihash for a node (legacy function)
     * @param node The namehash of the domain
     * @return The multihash value
     */
    function multihash(bytes32 node) external view returns (bytes memory) {
        // Legacy function - not implemented
        return "";
    }
}
