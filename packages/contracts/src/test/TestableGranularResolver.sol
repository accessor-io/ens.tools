// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../interfaces/IENSRegistry.sol";
import "../interfaces/IENSResolver.sol";
import "../interfaces/IGranularAssignmentController.sol";

/**
 * @title TestableGranularResolver
 * @dev Testable version of GranularResolver that accepts constructor parameters
 * @notice This contract is for testing purposes only - use GranularResolver for production
 */
contract TestableGranularResolver is IENSResolver, Ownable, Pausable, ReentrancyGuard {
    using Address for address;

    // ENS Registry and Granular Controller addresses (configurable for testing)
    address public immutable ENS_REGISTRY;
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
            "TestableGranularResolver: Not authorized for this operation"
        );
        _;
    }

    modifier onlyNotPaused() {
        require(!paused(), "TestableGranularResolver: Contract is paused");
        _;
    }

    /**
     * @dev Constructor for testing
     * @param _ensRegistry Address of the ENS Registry contract
     * @param _granularController Address of the GranularAssignmentController
     */
    constructor(address _ensRegistry, address _granularController) {
        require(_ensRegistry != address(0), "TestableGranularResolver: Invalid ENS Registry address");
        require(_granularController != address(0), "TestableGranularResolver: Invalid controller address");
        
        ENS_REGISTRY = _ensRegistry;
        granularController = _granularController;
        
        ensRegistry = IENSRegistry(_ensRegistry);
        granularControllerInterface = IGranularAssignmentController(_granularController);
    }

    /**
     * @dev Toggle owner override for a node
     */
    function toggleOwnerOverride(bytes32 node, bool disabled) external {
        require(
            ensRegistry.owner(node) == msg.sender,
            "TestableGranularResolver: Only ENS owner can toggle override"
        );
        _ownerOverrideDisabled[node] = disabled;
        emit OwnerOverrideToggled(node, disabled);
    }

    /**
     * @dev Check if caller is authorized for a specific operation
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

    function setAddr(bytes32 node, address a) external onlyAuthorized(node, SET_ADDR_RECORD) nonReentrant whenNotPaused {
        _addresses[node] = a;
        emit RecordSet(node, "addr", msg.sender);
    }

    function setAddr(bytes32 node, uint256 coinType, bytes memory a) external onlyAuthorized(node, SET_ADDR_RECORD) nonReentrant whenNotPaused {
        _addressesByCoinType[node][coinType] = a;
        emit RecordSet(node, "addr", msg.sender);
    }

    function setText(bytes32 node, string calldata key, string calldata value) external onlyAuthorized(node, SET_TEXT_RECORD) nonReentrant whenNotPaused {
        _textRecords[node][key] = value;
        emit RecordSet(node, "text", msg.sender);
    }

    function setContenthash(bytes32 node, bytes calldata hash) external onlyAuthorized(node, SET_CONTENT_HASH) nonReentrant whenNotPaused {
        _contentHashes[node] = hash;
        emit RecordSet(node, "contenthash", msg.sender);
    }

    function setPubkey(bytes32 node, bytes32 x, bytes32 y) external onlyAuthorized(node, SET_PUBKEY) nonReentrant whenNotPaused {
        _pubkeysX[node] = x;
        _pubkeysY[node] = y;
        emit RecordSet(node, "pubkey", msg.sender);
    }

    function setABI(bytes32 node, uint256 contentType, bytes calldata data) external onlyAuthorized(node, SET_ABI) nonReentrant whenNotPaused {
        _abis[node][contentType] = data;
        emit RecordSet(node, "abi", msg.sender);
    }

    function setZonehash(bytes32 node, bytes calldata hash) external onlyAuthorized(node, SET_ZONEHASH) nonReentrant whenNotPaused {
        _zoneHashes[node] = hash;
        emit RecordSet(node, "zonehash", msg.sender);
    }

    function setTTL(bytes32 node, uint64 ttl) external onlyAuthorized(node, SET_TTL) nonReentrant whenNotPaused {
        _ttls[node] = ttl;
        emit RecordSet(node, "ttl", msg.sender);
    }

    function setInterface(bytes32 node, bytes4 interfaceID, address implementer) external onlyAuthorized(node, SET_ABI) nonReentrant whenNotPaused {
        _interfaces[node][interfaceID] = implementer;
        emit RecordSet(node, "interface", msg.sender);
    }

    // ============ RESOLVER GETTER FUNCTIONS ============

    function addr(bytes32 node) external view returns (address) {
        return _addresses[node];
    }

    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory) {
        return _addressesByCoinType[node][coinType];
    }

    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return _textRecords[node][key];
    }

    function contenthash(bytes32 node) external view returns (bytes memory) {
        return _contentHashes[node];
    }

    function pubkey(bytes32 node) external view returns (bytes32 x, bytes32 y) {
        return (_pubkeysX[node], _pubkeysY[node]);
    }

    function ABI(bytes32 node, uint256 contentTypes) external view returns (uint256, bytes memory) {
        for (uint256 i = 0; i < 8; i++) {
            uint256 contentType = contentTypes & (1 << i);
            if (contentType > 0 && _abis[node][contentType].length > 0) {
                return (contentType, _abis[node][contentType]);
            }
        }
        return (0, "");
    }

    function zonehash(bytes32 node) external view returns (bytes memory) {
        return _zoneHashes[node];
    }

    function ttl(bytes32 node) external view returns (uint64) {
        return _ttls[node];
    }

    function interfaceImplementer(bytes32 node, bytes4 interfaceID) external view returns (address) {
        return _interfaces[node][interfaceID];
    }

    // ============ EMERGENCY FUNCTIONS ============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // ============ ADDITIONAL RESOLVER FUNCTIONS ============

    function setAuthorisation(bytes32 node, address target, bool isAuthorised) external {
        // This would need to be implemented based on the specific resolver interface
        revert("Not implemented in testable version");
    }

    function isAuthorised(bytes32 node) external view returns (bool) {
        // This would need to be implemented based on the specific resolver interface
        return false;
    }

    function setMultihash(bytes32 node, bytes calldata hash) external {
        // Legacy function - not implemented
        revert("Multihash not supported");
    }

    function multihash(bytes32 node) external view returns (bytes memory) {
        // Legacy function - not implemented
        return "";
    }
}
