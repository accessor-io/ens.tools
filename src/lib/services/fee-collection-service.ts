import { PublicClient, WalletClient, Address, parseEther, formatEther } from 'viem';
import { toast } from 'sonner';

/**
 * Fee Collection Service
 * Handles fee collection for contract registrations and admin fee withdrawal
 */

export interface FeeCollectionConfig {
  contractAddress: Address;
  registrationFee: bigint; // Fee in wei for contract registration
  nameRegistrationFee: bigint; // Fee in wei for ENS name registration
  subdomainCreationFee: bigint; // Fee in wei for subdomain creation
  transferFee: bigint; // Fee in wei for domain transfers
  marketplaceFeeBps: number; // Marketplace fee in basis points (e.g., 250 = 2.5%)
  adminAddress: Address; // Admin address that can collect fees
}

export interface FeeBalance {
  totalCollected: bigint;
  registrationFees: bigint;
  nameRegistrationFees: bigint;
  subdomainCreationFees: bigint;
  transferFees: bigint;
  marketplaceFees: bigint;
  availableBalance: bigint;
  pendingWithdrawals: bigint;
}

export interface FeeEstimate {
  operation: string;
  fee: bigint;
  formattedFee: string;
  gasEstimate?: bigint;
  totalCost?: bigint;
}

// Default fees
const DEFAULT_REGISTRATION_FEE = parseEther('0.01'); // Contract registration
const DEFAULT_NAME_REGISTRATION_FEE = parseEther('0.005'); // ENS name registration
const DEFAULT_SUBDOMAIN_CREATION_FEE = parseEther('0.003'); // Subdomain creation
const DEFAULT_TRANSFER_FEE = parseEther('0.002'); // Domain transfer

// Fee Collection Contract ABI
export const FEE_COLLECTION_ABI = [
  {
    name: 'payRegistrationFee',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'registrant', type: 'address' },
      { name: 'contractAddress', type: 'address' },
      { name: 'ensName', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getTotalFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAvailableBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'withdrawFees',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'setRegistrationFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newFee', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'registrationFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'admin',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'marketplaceFeeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'setMarketplaceFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newFeeBps', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'calculateMarketplaceFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'salePrice', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getRegistrationFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getMarketplaceFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'payNameRegistrationFee',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'registrant', type: 'address' },
      { name: 'ensName', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'payTransferFee',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'ensName', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'nameRegistrationFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transferFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getNameRegistrationFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTransferFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'NameRegistrationFeePaid',
    type: 'event',
    inputs: [
      { name: 'registrant', type: 'address', indexed: true },
      { name: 'ensName', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'TransferFeePaid',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'ensName', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RegistrationFeePaid',
    type: 'event',
    inputs: [
      { name: 'registrant', type: 'address', indexed: true },
      { name: 'contractAddress', type: 'address', indexed: true },
      { name: 'ensName', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'MarketplaceFeePaid',
    type: 'event',
    inputs: [
      { name: 'seller', type: 'address', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'tokenAddress', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'salePrice', type: 'uint256', indexed: false },
      { name: 'feeAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'payMarketplaceFee',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'seller', type: 'address' },
      { name: 'buyer', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'salePrice', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'recordMarketplaceFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'seller', type: 'address' },
      { name: 'buyer', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'salePrice', type: 'uint256' },
      { name: 'feeAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'subdomainCreationFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getSubdomainCreationFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export class FeeCollectionService {
  private config: FeeCollectionConfig;
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;

  constructor(config: FeeCollectionConfig) {
    this.config = config;
  }

  setClients(publicClient: PublicClient, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    if (walletClient) {
      this.walletClient = walletClient;
    }
  }

  /**
   * Get the configured contract address
   */
  getContractAddress(): Address {
    return this.config.contractAddress;
  }

  /**
   * Get current registration fee
   */
  async getRegistrationFee(): Promise<bigint> {
    if (!this.publicClient) {
      return DEFAULT_REGISTRATION_FEE;
    }

    try {
      const fee = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'registrationFee',
      });
      return fee as bigint;
    } catch (error) {
      console.error('Error fetching registration fee:', error);
      return DEFAULT_REGISTRATION_FEE;
    }
  }

  /**
   * Pay registration fee
   */
  async payRegistrationFee(
    registrant: Address,
    contractAddress: Address,
    ensName: string
  ): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    const fee = await this.getRegistrationFee();

    // Check balance
    const balance = await this.publicClient.getBalance({
      address: registrant,
    });

    if (balance < fee) {
      throw new Error(`Insufficient balance. Required: ${formatEther(fee)} ETH, Available: ${formatEther(balance)} ETH`);
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'payRegistrationFee',
        args: [registrant, contractAddress, ensName],
        value: fee,
      });

      return hash;
    } catch (error) {
      console.error('Error paying registration fee:', error);
      throw error;
    }
  }

  /**
   * Pay name registration fee for ENS name registration
   */
  async payNameRegistrationFee(
    registrant: Address,
    ensName: string
  ): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    const fee = await this.getNameRegistrationFee();

    // Check balance
    const balance = await this.publicClient.getBalance({
      address: registrant,
    });

    if (balance < fee) {
      throw new Error(`Insufficient balance. Required: ${formatEther(fee)} ETH, Available: ${formatEther(balance)} ETH`);
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'payNameRegistrationFee',
        args: [registrant, ensName],
        value: fee,
      });

      return hash;
    } catch (error) {
      console.error('Error paying name registration fee:', error);
      throw error;
    }
  }

  /**
   * Pay transfer fee for domain transfer
   */
  async payTransferFee(
    from: Address,
    to: Address,
    ensName: string
  ): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    const fee = await this.getTransferFee();

    // Check balance
    const balance = await this.publicClient.getBalance({
      address: from,
    });

    if (balance < fee) {
      throw new Error(`Insufficient balance. Required: ${formatEther(fee)} ETH, Available: ${formatEther(balance)} ETH`);
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'payTransferFee',
        args: [from, to, ensName],
        value: fee,
      });

      return hash;
    } catch (error) {
      console.error('Error paying transfer fee:', error);
      throw error;
    }
  }

  /**
   * Pay subdomain creation fee
   */
  async paySubdomainCreationFee(
    creator: Address,
    parentName: string,
    subdomainLabel: string
  ): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    const fee = await this.getSubdomainCreationFee();
    const fullName = `${subdomainLabel}.${parentName}`;

    // Check balance
    const balance = await this.publicClient.getBalance({
      address: creator,
    });

    if (balance < fee) {
      throw new Error(`Insufficient balance. Required: ${formatEther(fee)} ETH, Available: ${formatEther(balance)} ETH`);
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'paySubdomainCreationFee',
        args: [creator, parentName, subdomainLabel],
        value: fee,
      });

      return hash;
    } catch (error) {
      console.error('Error paying subdomain creation fee:', error);
      throw error;
    }
  }

  /**
   * Get total fees collected
   */
  async getTotalFees(): Promise<bigint> {
    if (!this.publicClient) {
      return 0n;
    }

    try {
      const total = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'getTotalFees',
      });
      return total as bigint;
    } catch (error) {
      console.error('Error fetching total fees:', error);
      return 0n;
    }
  }

  /**
   * Get available balance for withdrawal
   */
  async getAvailableBalance(): Promise<bigint> {
    if (!this.publicClient) {
      console.warn('getAvailableBalance: No publicClient available');
      return 0n;
    }

    // Check if contract is configured
    if (this.config.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('getAvailableBalance: Contract address not configured (0x0000...)');
      return 0n;
    }

    try {
      const balance = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'getAvailableBalance',
      });
      console.log(`getAvailableBalance: Contract balance from getAvailableBalance(): ${formatEther(balance as bigint)} ETH`);
      return balance as bigint;
    } catch (error) {
      console.error('Error fetching available balance from contract function:', error);
      // Fallback to contract ETH balance (this might show balance even if contract doesn't exist)
      try {
        const contractBalance = await this.publicClient!.getBalance({
          address: this.config.contractAddress,
        });
        console.warn(`getAvailableBalance: Fallback to getBalance() - Contract ETH balance: ${formatEther(contractBalance)} ETH`);
        console.warn('Note: This might be showing balance from a different contract or account at this address');
        return contractBalance;
      } catch (fallbackError) {
        console.error('Error in fallback getBalance():', fallbackError);
        return 0n;
      }
    }
  }

  /**
   * Get fee balance information
   */
  async getFeeBalance(): Promise<FeeBalance> {
    if (!this.publicClient) {
      console.warn('getFeeBalance: No publicClient available');
      return {
        totalCollected: 0n,
        registrationFees: 0n,
        nameRegistrationFees: 0n,
        subdomainCreationFees: 0n,
        transferFees: 0n,
        marketplaceFees: 0n,
        availableBalance: 0n,
        pendingWithdrawals: 0n,
      };
    }

    // Check if contract is configured
    if (this.config.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('getFeeBalance: Contract address not configured (0x0000...)');
      return {
        totalCollected: 0n,
        registrationFees: 0n,
        nameRegistrationFees: 0n,
        subdomainCreationFees: 0n,
        transferFees: 0n,
        marketplaceFees: 0n,
        availableBalance: 0n,
        pendingWithdrawals: 0n,
      };
    }

    console.log(`getFeeBalance: Fetching balance for contract: ${this.config.contractAddress}`);

    try {
      const [totalCollected, availableBalance, registrationFees, nameRegistrationFees, subdomainCreationFees, transferFees, marketplaceFees] = await Promise.all([
        this.getTotalFees(),
        this.getAvailableBalance(),
        this.publicClient.readContract({
          address: this.config.contractAddress,
          abi: FEE_COLLECTION_ABI,
          functionName: 'getRegistrationFees',
        }).catch(() => 0n),
        this.publicClient.readContract({
          address: this.config.contractAddress,
          abi: FEE_COLLECTION_ABI,
          functionName: 'getNameRegistrationFees',
        }).catch(() => 0n),
        this.publicClient.readContract({
          address: this.config.contractAddress,
          abi: FEE_COLLECTION_ABI,
          functionName: 'getSubdomainCreationFees',
        }).catch(() => 0n),
        this.publicClient.readContract({
          address: this.config.contractAddress,
          abi: FEE_COLLECTION_ABI,
          functionName: 'getTransferFees',
        }).catch(() => 0n),
        this.publicClient.readContract({
          address: this.config.contractAddress,
          abi: FEE_COLLECTION_ABI,
          functionName: 'getMarketplaceFees',
        }).catch(() => 0n),
      ]);

      const result = {
        totalCollected: totalCollected as bigint,
        registrationFees: registrationFees as bigint,
        nameRegistrationFees: nameRegistrationFees as bigint,
        subdomainCreationFees: subdomainCreationFees as bigint,
        transferFees: transferFees as bigint,
        marketplaceFees: marketplaceFees as bigint,
        availableBalance: availableBalance as bigint,
        pendingWithdrawals: (totalCollected as bigint) - (availableBalance as bigint),
      };

      console.log(`getFeeBalance: Available balance: ${formatEther(result.availableBalance)} ETH`);
      console.log(`getFeeBalance: Total collected: ${formatEther(result.totalCollected)} ETH`);

      return result;
    } catch (error) {
      console.error('Error fetching fee balance:', error);
      return {
        totalCollected: 0n,
        registrationFees: 0n,
        nameRegistrationFees: 0n,
        subdomainCreationFees: 0n,
        transferFees: 0n,
        marketplaceFees: 0n,
        availableBalance: 0n,
        pendingWithdrawals: 0n,
      };
    }
  }

  /**
   * Get name registration fee
   */
  async getNameRegistrationFee(): Promise<bigint> {
    if (!this.publicClient) {
      return this.config.nameRegistrationFee || DEFAULT_NAME_REGISTRATION_FEE;
    }

    try {
      const fee = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'nameRegistrationFee',
      });
      return fee as bigint;
    } catch (error) {
      console.error('Error fetching name registration fee:', error);
      return this.config.nameRegistrationFee || DEFAULT_NAME_REGISTRATION_FEE;
    }
  }

  /**
   * Get subdomain creation fee
   */
  async getSubdomainCreationFee(): Promise<bigint> {
    if (!this.publicClient) {
      return this.config.subdomainCreationFee || DEFAULT_SUBDOMAIN_CREATION_FEE;
    }

    try {
      const fee = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'subdomainCreationFee',
      });
      return fee as bigint;
    } catch (error) {
      console.error('Error fetching subdomain creation fee:', error);
      return this.config.subdomainCreationFee || DEFAULT_SUBDOMAIN_CREATION_FEE;
    }
  }

  /**
   * Get transfer fee
   */
  async getTransferFee(): Promise<bigint> {
    if (!this.publicClient) {
      return this.config.transferFee || DEFAULT_TRANSFER_FEE;
    }

    try {
      const fee = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'transferFee',
      });
      return fee as bigint;
    } catch (error) {
      console.error('Error fetching transfer fee:', error);
      return this.config.transferFee || DEFAULT_TRANSFER_FEE;
    }
  }

  /**
   * Estimate fee for an operation
   */
  async estimateFee(operation: 'registration' | 'nameRegistration' | 'subdomainCreation' | 'transfer' | 'marketplace', salePrice?: bigint): Promise<FeeEstimate> {
    let fee: bigint;
    
    switch (operation) {
      case 'registration':
        fee = await this.getRegistrationFee();
        break;
      case 'nameRegistration':
        fee = await this.getNameRegistrationFee();
        break;
      case 'subdomainCreation':
        fee = await this.getSubdomainCreationFee();
        break;
      case 'transfer':
        fee = await this.getTransferFee();
        break;
      case 'marketplace':
        if (!salePrice) {
          throw new Error('Sale price required for marketplace fee estimation');
        }
        fee = this.calculateMarketplaceFee(salePrice);
        break;
      default:
        fee = 0n;
    }

    return {
      operation,
      fee,
      formattedFee: formatEther(fee),
    };
  }

  /**
   * Estimate total cost including gas
   */
  async estimateTotalCost(
    operation: 'registration' | 'nameRegistration' | 'subdomainCreation' | 'transfer',
    gasEstimate: bigint,
    gasPrice?: bigint
  ): Promise<FeeEstimate> {
    const feeEstimate = await this.estimateFee(operation);
    
    if (!this.publicClient || !gasPrice) {
      return feeEstimate;
    }

    const gasCost = gasEstimate * gasPrice;
    const totalCost = feeEstimate.fee + gasCost;

    return {
      ...feeEstimate,
      gasEstimate,
      totalCost,
    };
  }

  /**
   * Calculate marketplace fee from sale price
   * @param salePrice Sale price in wei
   * @returns Fee amount in wei
   */
  calculateMarketplaceFee(salePrice: bigint): bigint {
    const feeBps = this.config.marketplaceFeeBps || 250; // Default 2.5%
    return (salePrice * BigInt(feeBps)) / 10000n;
  }

  /**
   * Calculate seller payment after marketplace fee
   * @param salePrice Sale price in wei
   * @returns Seller payment in wei
   */
  calculateSellerPayment(salePrice: bigint): bigint {
    const fee = this.calculateMarketplaceFee(salePrice);
    return salePrice - fee;
  }

  /**
   * Withdraw fees (admin only)
   */
  async withdrawFees(amount: bigint, recipient: Address): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    // Verify caller is admin
    const admin = await this.publicClient.readContract({
      address: this.config.contractAddress,
      abi: FEE_COLLECTION_ABI,
      functionName: 'admin',
    });

    const callerAddress = this.walletClient.account?.address;
    if (callerAddress?.toLowerCase() !== (admin as Address).toLowerCase()) {
      throw new Error('Only admin can withdraw fees');
    }

    // Check available balance
    const availableBalance = await this.getAvailableBalance();
    if (amount > availableBalance) {
      throw new Error(`Insufficient balance. Available: ${formatEther(availableBalance)} ETH`);
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'withdrawFees',
        args: [amount, recipient],
      });

      return hash;
    } catch (error) {
      console.error('Error withdrawing fees:', error);
      throw error;
    }
  }

  /**
   * Set registration fee (admin only)
   */
  async setRegistrationFee(newFee: bigint): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    // Verify caller is admin
    const admin = await this.publicClient.readContract({
      address: this.config.contractAddress,
      abi: FEE_COLLECTION_ABI,
      functionName: 'admin',
    });

    const callerAddress = this.walletClient.account?.address;
    if (callerAddress?.toLowerCase() !== (admin as Address).toLowerCase()) {
      throw new Error('Only admin can set registration fee');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'setRegistrationFee',
        args: [newFee],
      });

      return hash;
    } catch (error) {
      console.error('Error setting registration fee:', error);
      throw error;
    }
  }

  /**
   * Get marketplace fee rate in basis points
   */
  async getMarketplaceFeeBps(): Promise<number> {
    if (!this.publicClient) {
      return this.config.marketplaceFeeBps || 250;
    }

    try {
      const feeBps = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'marketplaceFeeBps',
      });
      return Number(feeBps);
    } catch (error) {
      console.error('Error fetching marketplace fee:', error);
      return this.config.marketplaceFeeBps || 250;
    }
  }

  /**
   * Set marketplace fee rate (admin only)
   */
  async setMarketplaceFee(feeBps: number): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    if (feeBps > 1000) {
      throw new Error('Marketplace fee cannot exceed 10% (1000 basis points)');
    }

    // Verify caller is admin
    const admin = await this.publicClient.readContract({
      address: this.config.contractAddress,
      abi: FEE_COLLECTION_ABI,
      functionName: 'admin',
    });

    const callerAddress = this.walletClient.account?.address;
    if (callerAddress?.toLowerCase() !== (admin as Address).toLowerCase()) {
      throw new Error('Only admin can set marketplace fee');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'setMarketplaceFee',
        args: [BigInt(feeBps)],
      });

      // Update local config
      this.config.marketplaceFeeBps = feeBps;

      return hash;
    } catch (error) {
      console.error('Error setting marketplace fee:', error);
      throw error;
    }
  }

  /**
   * Get the admin address from the contract
   */
  async getAdminAddress(): Promise<Address | null> {
    if (!this.publicClient) {
      return null;
    }

    // Check if contract is configured
    if (this.config.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('FeeCollection contract not deployed. Set VITE_FEE_COLLECTION_ADDRESS environment variable.');
      return null;
    }

    try {
      const admin = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'admin',
      });
      return admin as Address;
    } catch (error) {
      console.error('Error getting admin address:', error);
      return null;
    }
  }

  /**
   * Check if address is admin
   */
  async isAdmin(address: Address): Promise<boolean> {
    if (!this.publicClient) {
      return false;
    }

    // Check if contract is configured
    if (this.config.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('FeeCollection contract not deployed. Set VITE_FEE_COLLECTION_ADDRESS environment variable.');
      return false;
    }

    try {
      const admin = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'admin',
      });
      return address.toLowerCase() === (admin as Address).toLowerCase();
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Pay marketplace fee (records fee payment after Seaport order fulfillment)
   * Note: In Seaport orders, the fee is already sent to the contract via consideration items.
   * Use recordMarketplaceFee() instead when the fee was already collected via Seaport.
   * 
   * @param seller The address selling the item
   * @param buyer The address buying the item
   * @param tokenAddress The token contract address
   * @param tokenId The token ID
   * @param salePrice The total sale price in wei
   */
  async payMarketplaceFee(
    seller: Address,
    buyer: Address,
    tokenAddress: Address,
    tokenId: bigint,
    salePrice: bigint
  ): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    // Calculate the fee amount
    const feeAmount = this.calculateMarketplaceFee(salePrice);

    // Check if contract is deployed
    if (this.config.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('FeeCollection contract not deployed, skipping marketplace fee recording');
      return '0x';
    }

    // Check buyer balance
    const balance = await this.publicClient.getBalance({
      address: buyer,
    });

    if (balance < feeAmount) {
      throw new Error(`Insufficient balance for marketplace fee. Required: ${formatEther(feeAmount)} ETH, Available: ${formatEther(balance)} ETH`);
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'payMarketplaceFee',
        args: [seller, buyer, tokenAddress, tokenId, salePrice],
        value: feeAmount,
      });

      return hash;
    } catch (error) {
      console.error('Error paying marketplace fee:', error);
      throw error;
    }
  }

  /**
   * Record marketplace fee that was already received via Seaport consideration items
   * This is the preferred method for recording fees from Seaport orders since the fee
   * is already in the contract and we just need to update the tracking counters.
   * 
   * @param seller The address selling the item
   * @param buyer The address buying the item
   * @param tokenAddress The token contract address
   * @param tokenId The token ID
   * @param salePrice The total sale price in wei
   */
  async recordMarketplaceFee(
    seller: Address,
    buyer: Address,
    tokenAddress: Address,
    tokenId: bigint,
    salePrice: bigint
  ): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    // Calculate the fee amount
    const feeAmount = this.calculateMarketplaceFee(salePrice);

    // Check if contract is deployed
    if (this.config.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('FeeCollection contract not deployed, skipping marketplace fee recording');
      return '0x';
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.contractAddress,
        abi: FEE_COLLECTION_ABI,
        functionName: 'recordMarketplaceFee',
        args: [seller, buyer, tokenAddress, tokenId, salePrice, feeAmount],
      });

      return hash;
    } catch (error) {
      console.error('Error recording marketplace fee:', error);
      throw error;
    }
  }
}

// Helper function to get address from environment or use placeholder
function getAddressFromEnv(envKey: string, defaultValue: string): Address {
  const envValue = import.meta.env[envKey];
  if (envValue && envValue !== '0x0000000000000000000000000000000000000000') {
    return envValue as Address;
  }
  return defaultValue as Address;
}

// Default fee collection service instance
// In production, configure via environment variables:
// VITE_FEE_COLLECTION_ADDRESS - Deployed contract address
// VITE_FEE_COLLECTION_ADMIN - Admin address for fee withdrawal
export const feeCollectionService = new FeeCollectionService({
  contractAddress: getAddressFromEnv(
    'VITE_FEE_COLLECTION_ADDRESS',
    '0x0000000000000000000000000000000000000000'
  ),
  registrationFee: DEFAULT_REGISTRATION_FEE,
  nameRegistrationFee: DEFAULT_NAME_REGISTRATION_FEE,
  subdomainCreationFee: DEFAULT_SUBDOMAIN_CREATION_FEE,
  transferFee: DEFAULT_TRANSFER_FEE,
  marketplaceFeeBps: 250, // 2.5% marketplace fee
  adminAddress: getAddressFromEnv(
    'VITE_FEE_COLLECTION_ADMIN',
    '0x0000000000000000000000000000000000000000'
  ),
});

