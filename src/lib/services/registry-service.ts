export interface Contract {
  id: string;
  name: string;
  ensName: string;
  address: string;
  chain: string;
  type: string;
  status: 'active' | 'deprecated' | 'archived';
  security: 'critical' | 'high' | 'medium' | 'low';
  version: string;
  owner: string;
  multisig: boolean;
  upgradeable: boolean;
  verified: boolean;
  deployed: string;
  interactions24h: number;
  tvl?: string;
}

export interface DAO {
  id: string;
  name: string;
  ensName: string;
  description: string;
  category: string;
  chain: string;
  governanceToken: string;
  treasury: string;
  members: number;
  proposals: number;
  status: 'active' | 'inactive' | 'archived';
  verified: boolean;
  website: string;
  social: {
    twitter?: string;
    discord?: string;
    github?: string;
  };
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'active' | 'deprecated' | 'archived';
  address?: string;
  endpoint?: string;
  chain: string;
  ensName?: string;
  version: string;
  calls24h: number;
  uptime: string;
  verified: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function apiRequest(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
      }

class RegistryService {
  async getContracts(): Promise<Contract[]> {
    try {
      return await apiRequest('/contracts');
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    return [];
  }
  }

  async getDAOs(): Promise<DAO[]> {
    try {
      return await apiRequest('/daos');
    } catch (error) {
      console.error('Failed to fetch DAOs:', error);
      return [];
    }
  }

  async getIntegrations(): Promise<Integration[]> {
    try {
      return await apiRequest('/integrations');
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      return [];
  }
  }

  async addContract(contract: Omit<Contract, 'id'>): Promise<Contract> {
    return await apiRequest('/contracts', {
      method: 'POST',
      body: JSON.stringify(contract),
    });
  }

  async addDAO(dao: Omit<DAO, 'id'>): Promise<DAO> {
    return await apiRequest('/daos', {
      method: 'POST',
      body: JSON.stringify(dao),
    });
  }

  async addIntegration(integration: Omit<Integration, 'id'>): Promise<Integration> {
    return await apiRequest('/integrations', {
      method: 'POST',
      body: JSON.stringify(integration),
    });
  }

  async updateContract(id: string, updates: Partial<Contract>): Promise<Contract | null> {
    try {
      return await apiRequest(`/contracts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update contract:', error);
      return null;
    }
  }

  async updateDAO(id: string, updates: Partial<DAO>): Promise<DAO | null> {
    try {
      return await apiRequest(`/daos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update DAO:', error);
      return null;
    }
  }

  async updateIntegration(id: string, updates: Partial<Integration>): Promise<Integration | null> {
    try {
      return await apiRequest(`/integrations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update integration:', error);
      return null;
    }
  }

  async deleteContract(id: string): Promise<boolean> {
    try {
      await apiRequest(`/contracts/${id}`, { method: 'DELETE' });
    return true;
    } catch (error) {
      console.error('Failed to delete contract:', error);
      return false;
    }
  }

  async deleteDAO(id: string): Promise<boolean> {
    try {
      await apiRequest(`/daos/${id}`, { method: 'DELETE' });
    return true;
    } catch (error) {
      console.error('Failed to delete DAO:', error);
      return false;
    }
  }

  async deleteIntegration(id: string): Promise<boolean> {
    try {
      await apiRequest(`/integrations/${id}`, { method: 'DELETE' });
    return true;
    } catch (error) {
      console.error('Failed to delete integration:', error);
      return false;
    }
  }

  /**
   * Clear all registry data (contracts, DAOs, and integrations).
   * 
   * NOTE: This method requires backend API implementation.
   * Currently not implemented as it would require:
   * - DELETE /api/contracts (bulk delete)
   * - DELETE /api/daos (bulk delete)
   * - DELETE /api/integrations (bulk delete)
   * 
   * For now, use individual delete methods:
   * - deleteContract(id)
   * - deleteDAO(id)
   * - deleteIntegration(id)
   * 
   * @throws {Error} Always throws an error indicating this method is not implemented
   */
  async clearAll(): Promise<void> {
    throw new Error(
      'clearAll() is not implemented. This operation requires backend API support for bulk deletion. ' +
      'Use individual delete methods (deleteContract, deleteDAO, deleteIntegration) instead.'
    );
  }
}

export const registryService = new RegistryService();




