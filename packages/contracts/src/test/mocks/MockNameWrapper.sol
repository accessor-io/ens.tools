// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockNameWrapper
 * @dev Mock implementation of NameWrapper for testing
 */
contract MockNameWrapper {
    mapping(uint256 => address) private _owners;
    mapping(uint256 => uint32) private _fuses;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return _owners[id] == account ? 1 : 0;
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            balances[i] = _owners[ids[i]] == accounts[i] ? 1 : 0;
        }
        return balances;
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) external view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external {
        require(_owners[id] == from, "Not owner");
        require(to != address(0), "Transfer to zero address");
        _owners[id] = to;
        emit TransferSingle(msg.sender, from, to, id, amount);
    }

    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external {
        for (uint256 i = 0; i < ids.length; i++) {
            require(_owners[ids[i]] == from, "Not owner");
            _owners[ids[i]] = to;
        }
        emit TransferSingle(msg.sender, from, to, ids[0], amounts[0]);
    }

    function ownerOf(uint256 id) external view returns (address) {
        return _owners[id];
    }

    function getFuses(uint256 node) external view returns (uint32) {
        return _fuses[node];
    }

    function setFuses(uint256 node, uint32 fuses) external {
        _fuses[node] = fuses;
    }

    function setSubnodeRecord(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) external {
        // Mock implementation - just set owner
        bytes32 labelHash = keccak256(abi.encodePacked(label));
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, labelHash));
        _owners[uint256(subnode)] = owner;
    }

    function setSubnodeOwner(
        bytes32 parentNode,
        string calldata label,
        address owner,
        uint32 fuses,
        uint64 expiry
    ) external {
        // Mock implementation - just set owner
        bytes32 labelHash = keccak256(abi.encodePacked(label));
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, labelHash));
        _owners[uint256(subnode)] = owner;
    }

    function unwrap(bytes32 parentNode, bytes32 label, address owner) external {
        // Mock implementation
    }

    function wrap(bytes calldata name, address wrappedOwner, address resolver) external {
        // Mock implementation
    }

    function extendExpiry(bytes32 parentNode, bytes32 label, uint64 expiry) external {
        // Mock implementation
    }

    function allFusesBurned(bytes32 node, uint32 fuseMask) external view returns (bool) {
        return (_fuses[uint256(node)] & fuseMask) == fuseMask;
    }

    function isWrapped(bytes32 node) external view returns (bool) {
        return _owners[uint256(node)] != address(0);
    }

    function canModifyName(bytes32 node, address addr) external view returns (bool) {
        return _owners[uint256(node)] == addr;
    }

    function setChildFuses(bytes32 parentNode, bytes32 labelhash, uint32 fuses, uint64 expiry) external {
        // Mock implementation
    }

    function setSubnodeRecord(bytes32 parentNode, string calldata label, address owner, address resolver, uint64 ttl) external {
        // Mock implementation
    }

    function setSubnodeOwner(bytes32 parentNode, string calldata label, address owner) external {
        // Mock implementation
    }
}
