// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IENSResolver
 * @dev Interface for ENS Resolver contracts
 * @notice This interface matches the official ENS resolver interfaces from ensdomains/ens-contracts
 * Reference: https://github.com/ensdomains/ens-contracts/blob/master/contracts/resolvers/PublicResolver.sol
 */
interface IENSResolver {
    // Events (matching official ENS resolver)
    event AddrChanged(bytes32 indexed node, address a);
    event AddressChanged(bytes32 indexed node, uint256 coinType, bytes newAddress);
    event TextChanged(bytes32 indexed node, string indexed key, string value);
    event ContenthashChanged(bytes32 indexed node, bytes hash);
    event PubkeyChanged(bytes32 indexed node, bytes32 x, bytes32 y);
    event ABIChanged(bytes32 indexed node, uint256 indexed contentType);
    event NameChanged(bytes32 indexed node, string name);
    event InterfaceChanged(bytes32 indexed node, bytes4 indexed interfaceID, address implementer);
    event AuthorisationChanged(bytes32 indexed node, address indexed target, bool isAuthorised);

    // Address functions (EIP-137)
    function setAddr(bytes32 node, address a) external;
    function setAddr(bytes32 node, uint256 coinType, bytes calldata a) external;
    function addr(bytes32 node) external view returns (address);
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory);

    // Text functions (EIP-634)
    function setText(bytes32 node, string calldata key, string calldata value) external;
    function text(bytes32 node, string calldata key) external view returns (string memory);

    // Content hash functions (EIP-1577)
    function setContenthash(bytes32 node, bytes calldata hash) external;
    function contenthash(bytes32 node) external view returns (bytes memory);

    // Public key functions (EIP-619)
    function setPubkey(bytes32 node, bytes32 x, bytes32 y) external;
    function pubkey(bytes32 node) external view returns (bytes32 x, bytes32 y);

    // ABI functions (EIP-205)
    function setABI(bytes32 node, uint256 contentType, bytes calldata data) external;
    function ABI(bytes32 node, uint256 contentTypes) external view returns (uint256, bytes memory);

    // Zone hash functions (EIP-1844)
    function setZonehash(bytes32 node, bytes calldata hash) external;
    function zonehash(bytes32 node) external view returns (bytes memory);

    // TTL functions
    function setTTL(bytes32 node, uint64 ttl) external;
    function ttl(bytes32 node) external view returns (uint64);

    // Interface functions (EIP-165)
    function setInterface(bytes32 node, bytes4 interfaceID, address implementer) external;
    function interfaceImplementer(bytes32 node, bytes4 interfaceID) external view returns (address);

    // Authorization functions (EIP-137)
    function setAuthorisation(bytes32 node, address target, bool isAuthorised) external;
    function isAuthorised(bytes32 node) external view returns (bool);

    // Multihash functions (legacy - EIP-1577)
    function setMultihash(bytes32 node, bytes calldata hash) external;
    function multihash(bytes32 node) external view returns (bytes memory);
}
