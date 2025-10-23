/**
 * Etherscan API Service
 * Fetches transaction details, gas costs, and other on-chain data
 */

import { Address } from 'viem';

const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || 'IPBRSM3CCP2GKYECIPMZQZTDNPM1FJTHTX';
const ETHERSCAN_URL = 'https://api.etherscan.io/api';

interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  confirmations: string;
}

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

class EtherscanService {
  /**
   * Get transaction details by hash
   */
  async getTransaction(txHash: string): Promise<EtherscanTransaction | null> {
    try {
      const response = await fetch(
        `${ETHERSCAN_URL}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const result = await response.json();
      
      if (result.status === '1' && result.result) {
        return result.result;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching transaction from Etherscan:', error);
      return null;
    }
  }

  /**
   * Get transaction receipt with gas details
   */
  async getTransactionReceipt(txHash: string): Promise<any | null> {
    try {
      console.log(`Fetching transaction receipt for ${txHash}`);
      const response = await fetch(
        `${ETHERSCAN_URL}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const result = await response.json();
      console.log('Etherscan receipt response:', result);
      
      if (result.status === '1' && result.result) {
        const receipt = result.result;
        console.log('Transaction receipt:', receipt);
        return {
          gasUsed: receipt.gasUsed ? receipt.gasUsed : null,
          effectiveGasPrice: receipt.effectiveGasPrice ? receipt.effectiveGasPrice : null,
          gasPrice: receipt.gasPrice ? receipt.gasPrice : null,
          blockNumber: receipt.blockNumber ? receipt.blockNumber : null,
          from: receipt.from,
          to: receipt.to,
          status: receipt.status,
          contractAddress: receipt.contractAddress,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching transaction receipt from Etherscan:', error);
      return null;
    }
  }

  /**
   * Get normal transactions for an address
   */
  async getNormalTransactions(address: string, startBlock = 0, endBlock = 99999999): Promise<EtherscanTransaction[]> {
    try {
      const response = await fetch(
        `${ETHERSCAN_URL}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&sort=desc&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const result: EtherscanResponse<EtherscanTransaction[]> = await response.json();
      
      if (result.status === '1' && result.result) {
        return result.result;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching transactions from Etherscan:', error);
      return [];
    }
  }

  /**
   * Get internal transactions for an address
   */
  async getInternalTransactions(address: string, startBlock = 0, endBlock = 99999999): Promise<any[]> {
    try {
      const response = await fetch(
        `${ETHERSCAN_URL}?module=account&action=txlistinternal&address=${address}&startblock=${startBlock}&endblock=${endBlock}&sort=desc&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const result = await response.json();
      
      if (result.status === '1' && result.result) {
        return result.result;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching internal transactions from Etherscan:', error);
      return [];
    }
  }

  /**
   * Get token transfers for an address
   */
  async getTokenTransfers(address: string, startBlock = 0, endBlock = 99999999): Promise<any[]> {
    try {
      const response = await fetch(
        `${ETHERSCAN_URL}?module=account&action=tokentx&address=${address}&startblock=${startBlock}&endblock=${endBlock}&sort=desc&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const result = await response.json();
      
      if (result.status === '1' && result.result) {
        return result.result;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching token transfers from Etherscan:', error);
      return [];
    }
  }

  /**
   * Get block timestamp
   */
  async getBlockTimestamp(blockNumber: string): Promise<number | null> {
    try {
      const response = await fetch(
        `${ETHERSCAN_URL}?module=block&action=getblockreward&blockno=${blockNumber}&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const result = await response.json();
      
      if (result.status === '1' && result.result && result.result.timeStamp) {
        return parseInt(result.result.timeStamp);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching block timestamp from Etherscan:', error);
      return null;
    }
  }

  /**
   * Get gas price estimate
   */
  async getGasPrice(): Promise<string | null> {
    try {
      const response = await fetch(
        `${ETHERSCAN_URL}?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const result = await response.json();
      
      if (result.status === '1' && result.result) {
        return result.result.ProposeGasPrice;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching gas price from Etherscan:', error);
      return null;
    }
  }

  /**
   * Convert Wei to Ether
   */
  weiToEther(wei: string): string {
    return (parseInt(wei) / 1e18).toFixed(6);
  }

  /**
   * Calculate transaction cost in ETH
   */
  calculateTxCost(gasUsed: string, gasPrice: string): string {
    const cost = BigInt(gasUsed) * BigInt(gasPrice);
    return (Number(cost) / 1e18).toFixed(6);
  }
}

export const etherscanService = new EtherscanService();

