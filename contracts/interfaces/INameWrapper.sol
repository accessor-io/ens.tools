// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title INameWrapper
 * @dev Interface for the ENS NameWrapper contract
 * @notice This interface matches the official NameWrapper contract from ensdomains/ens-contracts
 * Reference: https://github.com/ensdomains/ens-contracts/blob/master/contracts/wrapper/NameWrapper.sol
 */
interface INameWrapper {
    // Events (matching official NameWrapper)
    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);
    event NameWrapped(bytes32 indexed node, bytes name, address owner, uint32 fuses, uint64 expiry);
    event NameUnwrapped(bytes32 indexed node, address owner);
    event FusesSet(bytes32 indexed node, uint32 fuses, uint64 expiry);

    // ERC-1155 functions (matching official NameWrapper)
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external;

    // NameWrapper specific functions (matching official NameWrapper)
    function ownerOf(uint256 id) external view returns (address);
    function getFuses(uint256 node) external view returns (uint32);
    function setFuses(uint256 node, uint32 fuses) external;
    function setSubnodeRecord(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) external;
    function setSubnodeOwner(
        bytes32 parentNode,
        string calldata label,
        address owner,
        uint32 fuses,
        uint64 expiry
    ) external;
    function unwrap(bytes32 parentNode, bytes32 label, address owner) external;
    function wrap(bytes calldata name, address wrappedOwner, address resolver) external;
    function extendExpiry(bytes32 parentNode, bytes32 label, uint64 expiry) external;
    
    // Additional NameWrapper functions
    function allFusesBurned(bytes32 node, uint32 fuseMask) external view returns (bool);
    function isWrapped(bytes32 node) external view returns (bool);
    function canModifyName(bytes32 node, address addr) external view returns (bool);
    function setChildFuses(bytes32 parentNode, bytes32 labelhash, uint32 fuses, uint64 expiry) external;
    function setSubnodeRecord(bytes32 parentNode, string calldata label, address owner, address resolver, uint64 ttl) external;
    function setSubnodeOwner(bytes32 parentNode, string calldata label, address owner) external;
}
