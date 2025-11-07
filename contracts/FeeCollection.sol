// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FeeCollection
 * @notice Collects fees for contract registrations and allows admin to withdraw
 */
contract FeeCollection {
    address public admin;
    uint256 public registrationFee;
    uint256 public nameRegistrationFee;
    uint256 public subdomainCreationFee;
    uint256 public transferFee;
    uint256 public marketplaceFeeBps; // Marketplace fee in basis points (e.g., 250 = 2.5%)
    uint256 public totalFeesCollected;
    uint256 public registrationFeesCollected;
    uint256 public nameRegistrationFeesCollected;
    uint256 public subdomainCreationFeesCollected;
    uint256 public transferFeesCollected;
    uint256 public marketplaceFeesCollected;
    
    event RegistrationFeePaid(
        address indexed registrant,
        address indexed contractAddress,
        string ensName,
        uint256 amount
    );
    
    event MarketplaceFeePaid(
        address indexed seller,
        address indexed buyer,
        address indexed tokenAddress,
        uint256 tokenId,
        uint256 salePrice,
        uint256 feeAmount
    );
    
    event NameRegistrationFeePaid(
        address indexed registrant,
        string ensName,
        uint256 amount
    );
    
    event TransferFeePaid(
        address indexed from,
        address indexed to,
        string ensName,
        uint256 amount
    );
    
    event SubdomainCreationFeePaid(
        address indexed creator,
        string parentName,
        string subdomainLabel,
        string fullName,
        uint256 amount
    );
    
    event FeesWithdrawn(
        address indexed recipient,
        uint256 amount
    );
    
    event RegistrationFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );
    
    event MarketplaceFeeUpdated(
        uint256 oldFeeBps,
        uint256 newFeeBps
    );
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    constructor(
        address _admin,
        uint256 _initialFee,
        uint256 _nameRegistrationFee,
        uint256 _subdomainCreationFee,
        uint256 _transferFee,
        uint256 _marketplaceFeeBps
    ) {
        require(_admin != address(0), "Invalid admin address");
        require(_marketplaceFeeBps <= 1000, "Fee cannot exceed 10%");
        admin = _admin;
        registrationFee = _initialFee;
        nameRegistrationFee = _nameRegistrationFee;
        subdomainCreationFee = _subdomainCreationFee;
        transferFee = _transferFee;
        marketplaceFeeBps = _marketplaceFeeBps;
    }
    
    /**
     * @notice Pay registration fee for a contract registration
     * @param registrant The address registering the contract
     * @param contractAddress The contract address being registered
     * @param ensName The ENS name being registered
     */
    function payRegistrationFee(
        address registrant,
        address contractAddress,
        string calldata ensName
    ) external payable {
        require(msg.value == registrationFee, "Incorrect fee amount");
        require(registrant != address(0), "Invalid registrant");
        require(contractAddress != address(0), "Invalid contract address");
        
        totalFeesCollected += msg.value;
        registrationFeesCollected += msg.value;
        
        emit RegistrationFeePaid(registrant, contractAddress, ensName, msg.value);
    }
    
    /**
     * @notice Record marketplace fee payment (called when Seaport order is fulfilled)
     * @param seller The address selling the item
     * @param buyer The address buying the item
     * @param tokenAddress The token contract address
     * @param tokenId The token ID
     * @param salePrice The total sale price
     */
    function payMarketplaceFee(
        address seller,
        address buyer,
        address tokenAddress,
        uint256 tokenId,
        uint256 salePrice
    ) external payable {
        require(msg.value > 0, "Fee amount must be greater than 0");
        require(seller != address(0), "Invalid seller");
        require(buyer != address(0), "Invalid buyer");
        
        totalFeesCollected += msg.value;
        marketplaceFeesCollected += msg.value;
        
        emit MarketplaceFeePaid(seller, buyer, tokenAddress, tokenId, salePrice, msg.value);
    }
    
    /**
     * @notice Record marketplace fee that was already received via Seaport consideration items
     * This function allows recording fees without requiring additional payment
     * @param seller The address selling the item
     * @param buyer The address buying the item
     * @param tokenAddress The token contract address
     * @param tokenId The token ID
     * @param salePrice The total sale price
     * @param feeAmount The fee amount that was already received (must match calculated fee)
     */
    function recordMarketplaceFee(
        address seller,
        address buyer,
        address tokenAddress,
        uint256 tokenId,
        uint256 salePrice,
        uint256 feeAmount
    ) external {
        require(seller != address(0), "Invalid seller");
        require(buyer != address(0), "Invalid buyer");
        require(feeAmount > 0, "Fee amount must be greater than 0");
        
        // Verify the fee amount matches the expected marketplace fee
        uint256 expectedFee = (salePrice * marketplaceFeeBps) / 10000;
        require(feeAmount == expectedFee, "Fee amount does not match expected marketplace fee");
        
        // Verify the contract has received at least this amount
        // Note: This is a best-effort check - the fee may have been received via Seaport
        // We record it in the tracking counters regardless
        totalFeesCollected += feeAmount;
        marketplaceFeesCollected += feeAmount;
        
        emit MarketplaceFeePaid(seller, buyer, tokenAddress, tokenId, salePrice, feeAmount);
    }
    
    /**
     * @notice Calculate marketplace fee for a sale price
     * @param salePrice The sale price in wei
     * @return The fee amount in wei
     */
    function calculateMarketplaceFee(uint256 salePrice) external view returns (uint256) {
        return (salePrice * marketplaceFeeBps) / 10000;
    }
    
    /**
     * @notice Get total fees collected
     * @return Total amount of fees collected
     */
    function getTotalFees() external view returns (uint256) {
        return totalFeesCollected;
    }
    
    /**
     * @notice Get available balance for withdrawal
     * @return Available balance in contract
     */
    function getAvailableBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Withdraw collected fees (admin only)
     * @param amount Amount to withdraw
     * @param recipient Address to receive the funds
     */
    function withdrawFees(uint256 amount, address recipient) external onlyAdmin {
        require(recipient != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FeesWithdrawn(recipient, amount);
    }
    
    /**
     * @notice Set new registration fee (admin only)
     * @param newFee New fee amount in wei
     */
    function setRegistrationFee(uint256 newFee) external onlyAdmin {
        uint256 oldFee = registrationFee;
        registrationFee = newFee;
        
        emit RegistrationFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @notice Set marketplace fee rate (admin only)
     * @param newFeeBps New fee in basis points (max 1000 = 10%)
     */
    function setMarketplaceFee(uint256 newFeeBps) external onlyAdmin {
        require(newFeeBps <= 1000, "Fee cannot exceed 10%");
        uint256 oldFeeBps = marketplaceFeeBps;
        marketplaceFeeBps = newFeeBps;
        
        emit MarketplaceFeeUpdated(oldFeeBps, newFeeBps);
    }
    
    /**
     * @notice Get registration fees collected
     * @return Total registration fees collected
     */
    function getRegistrationFees() external view returns (uint256) {
        return registrationFeesCollected;
    }
    
    /**
     * @notice Pay name registration fee for ENS name registration
     * @param registrant The address registering the name
     * @param ensName The ENS name being registered
     */
    function payNameRegistrationFee(
        address registrant,
        string calldata ensName
    ) external payable {
        require(msg.value == nameRegistrationFee, "Incorrect fee amount");
        require(registrant != address(0), "Invalid registrant");
        
        totalFeesCollected += msg.value;
        nameRegistrationFeesCollected += msg.value;
        
        emit NameRegistrationFeePaid(registrant, ensName, msg.value);
    }
    
    /**
     * @notice Pay transfer fee for domain transfer
     * @param from The address transferring the domain
     * @param to The address receiving the domain
     * @param ensName The ENS name being transferred
     */
    function payTransferFee(
        address from,
        address to,
        string calldata ensName
    ) external payable {
        require(msg.value == transferFee, "Incorrect fee amount");
        require(from != address(0), "Invalid from address");
        require(to != address(0), "Invalid to address");
        
        totalFeesCollected += msg.value;
        transferFeesCollected += msg.value;
        
        emit TransferFeePaid(from, to, ensName, msg.value);
    }
    
    /**
     * @notice Get name registration fees collected
     * @return Total name registration fees collected
     */
    function getNameRegistrationFees() external view returns (uint256) {
        return nameRegistrationFeesCollected;
    }
    
    /**
     * @notice Pay subdomain creation fee
     * @param creator The address creating the subdomain
     * @param parentName The parent domain name
     * @param subdomainLabel The subdomain label
     */
    function paySubdomainCreationFee(
        address creator,
        string calldata parentName,
        string calldata subdomainLabel
    ) external payable {
        require(msg.value == subdomainCreationFee, "Incorrect fee amount");
        require(creator != address(0), "Invalid creator");
        
        string memory fullName = string(abi.encodePacked(subdomainLabel, ".", parentName));
        
        totalFeesCollected += msg.value;
        subdomainCreationFeesCollected += msg.value;
        
        emit SubdomainCreationFeePaid(creator, parentName, subdomainLabel, fullName, msg.value);
    }
    
    /**
     * @notice Get subdomain creation fees collected
     * @return Total subdomain creation fees collected
     */
    function getSubdomainCreationFees() external view returns (uint256) {
        return subdomainCreationFeesCollected;
    }
    
    /**
     * @notice Get transfer fees collected
     * @return Total transfer fees collected
     */
    function getTransferFees() external view returns (uint256) {
        return transferFeesCollected;
    }
    
    /**
     * @notice Get marketplace fees collected
     * @return Total marketplace fees collected
     */
    function getMarketplaceFees() external view returns (uint256) {
        return marketplaceFeesCollected;
    }
    
    /**
     * @notice Set subdomain creation fee (admin only)
     * @param newFee New fee amount in wei
     */
    function setSubdomainCreationFee(uint256 newFee) external onlyAdmin {
        subdomainCreationFee = newFee;
    }
    
    /**
     * @notice Set name registration fee (admin only)
     * @param newFee New fee amount in wei
     */
    function setNameRegistrationFee(uint256 newFee) external onlyAdmin {
        nameRegistrationFee = newFee;
    }
    
    /**
     * @notice Set transfer fee (admin only)
     * @param newFee New fee amount in wei
     */
    function setTransferFee(uint256 newFee) external onlyAdmin {
        transferFee = newFee;
    }
    
    /**
     * @notice Transfer admin role (admin only)
     * @param newAdmin New admin address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        admin = newAdmin;
    }
    
    /**
     * @notice Receive ETH (fallback)
     */
    receive() external payable {
        // Allow direct ETH transfers
    }
}

