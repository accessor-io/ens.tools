// ENS Contract Addresses
const ADDRESSES = {
  // Mainnet
  1: {
    ENS_REGISTRY: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    NAME_WRAPPER: "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401",
    PUBLIC_RESOLVER: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41",
    REVERSE_REGISTRAR: "0x084b1c3C81545d370f3634392De611CaaBFf8148",
    ETH_REGISTRAR: "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85",
    ETH_REGISTRAR_CONTROLLER: "0x253553366Da8546fC250F225fe3d25d0C782303b"
  },
  
  // Goerli (deprecated)
  5: {
    ENS_REGISTRY: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    NAME_WRAPPER: "0x114D4603199df73e7D157787f8778E21fCd13066",
    PUBLIC_RESOLVER: "0xd7a4F6473f32aC2Af804B3686AE8F1932bC35750",
    REVERSE_REGISTRAR: "0x6F628b68b30Dc3c17f345c9dbBb1E483c2b7aE5c",
    ETH_REGISTRAR: "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85",
    ETH_REGISTRAR_CONTROLLER: "0x253553366Da8546fC250F225fe3d25d0C782303b"
  },
  
  // Sepolia
  11155111: {
    ENS_REGISTRY: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    NAME_WRAPPER: "0x0635513f179D50A207757E05759CbD106d7dFcE8",
    PUBLIC_RESOLVER: "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD",
    REVERSE_REGISTRAR: "0x6F628b68b30Dc3c17f345c9dbBb1E483c2b7aE5c",
    ETH_REGISTRAR: "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85",
    ETH_REGISTRAR_CONTROLLER: "0x253553366Da8546fC250F225fe3d25d0C782303b"
  },
  
  // Polygon
  137: {
    ENS_REGISTRY: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    NAME_WRAPPER: "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401",
    PUBLIC_RESOLVER: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41"
  },
  
  // Optimism
  10: {
    ENS_REGISTRY: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    NAME_WRAPPER: "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401",
    PUBLIC_RESOLVER: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41"
  },
  
  // Base
  8453: {
    ENS_REGISTRY: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    NAME_WRAPPER: "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401",
    PUBLIC_RESOLVER: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41"
  }
};

// Permission constants
const PERMISSIONS = {
  MANAGE_SUBDOMAINS: 1,      // 1 << 0
  SET_ADDR_RECORD: 2,        // 1 << 1
  SET_TEXT_RECORD: 4,        // 1 << 2
  SET_CONTENT_HASH: 8,       // 1 << 3
  SET_PUBKEY: 16,            // 1 << 4
  SET_ABI: 32,               // 1 << 5
  SET_ZONEHASH: 64,          // 1 << 6
  SET_TTL: 128,              // 1 << 7
  SET_RESOLVER: 256,         // 1 << 8
  SET_OWNER: 512,            // 1 << 9
  SET_FUSES: 1024            // 1 << 10
};

// Legacy operation constants for backward compatibility
const LEGACY_OPERATIONS = {
  OP_CREATE_SUBDOMAIN: PERMISSIONS.MANAGE_SUBDOMAINS,
  OP_SET_RECORDS: PERMISSIONS.SET_ADDR_RECORD | PERMISSIONS.SET_TEXT_RECORD | 
                  PERMISSIONS.SET_CONTENT_HASH | PERMISSIONS.SET_PUBKEY | 
                  PERMISSIONS.SET_ABI | PERMISSIONS.SET_ZONEHASH,
  OP_TRANSFER: PERMISSIONS.SET_OWNER,
  OP_SET_FUSES: PERMISSIONS.SET_FUSES
};

// Common delegation patterns
const DELEGATION_PATTERNS = {
  // Treasury team - can only set address records
  TREASURY: PERMISSIONS.SET_ADDR_RECORD,
  
  // Marketing team - can only set text records
  MARKETING: PERMISSIONS.SET_TEXT_RECORD,
  
  // DevOps team - can manage subdomains
  DEVOPS: PERMISSIONS.MANAGE_SUBDOMAINS,
  
  // Full record management (excluding ownership)
  RECORD_MANAGER: PERMISSIONS.SET_ADDR_RECORD | PERMISSIONS.SET_TEXT_RECORD | 
                  PERMISSIONS.SET_CONTENT_HASH | PERMISSIONS.SET_PUBKEY | 
                  PERMISSIONS.SET_ABI | PERMISSIONS.SET_ZONEHASH | PERMISSIONS.SET_TTL,
  
  // Full operational control (excluding ownership and resolver changes)
  OPERATIONS: PERMISSIONS.MANAGE_SUBDOMAINS | PERMISSIONS.SET_ADDR_RECORD | 
              PERMISSIONS.SET_TEXT_RECORD | PERMISSIONS.SET_CONTENT_HASH | 
              PERMISSIONS.SET_PUBKEY | PERMISSIONS.SET_ABI | 
              PERMISSIONS.SET_ZONEHASH | PERMISSIONS.SET_TTL,
  
  // Administrative control (including resolver changes)
  ADMIN: PERMISSIONS.MANAGE_SUBDOMAINS | PERMISSIONS.SET_ADDR_RECORD | 
         PERMISSIONS.SET_TEXT_RECORD | PERMISSIONS.SET_CONTENT_HASH | 
         PERMISSIONS.SET_PUBKEY | PERMISSIONS.SET_ABI | 
         PERMISSIONS.SET_ZONEHASH | PERMISSIONS.SET_TTL | PERMISSIONS.SET_RESOLVER
};

// Helper functions
function getAddresses(chainId) {
  return ADDRESSES[chainId] || ADDRESSES[1]; // Default to mainnet
}

function getPermissionName(permission) {
  for (const [name, value] of Object.entries(PERMISSIONS)) {
    if (value === permission) return name;
  }
  return "UNKNOWN";
}

function getPermissionNames(mask) {
  const names = [];
  for (const [name, value] of Object.entries(PERMISSIONS)) {
    if ((mask & value) === value) {
      names.push(name);
    }
  }
  return names;
}

function hasPermission(mask, permission) {
  return (mask & permission) === permission;
}

function addPermission(mask, permission) {
  return mask | permission;
}

function removePermission(mask, permission) {
  return mask & ~permission;
}

module.exports = {
  ADDRESSES,
  PERMISSIONS,
  LEGACY_OPERATIONS,
  DELEGATION_PATTERNS,
  getAddresses,
  getPermissionName,
  getPermissionNames,
  hasPermission,
  addPermission,
  removePermission
};
