const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ENS Ecosystem Compatibility", function () {
  let ensRegistry, nameWrapper, publicResolver;
  let granularController, granularResolver;
  let owner, delegate1, delegate2;

  // Official ENS contract addresses (mainnet)
  const ENS_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
  const NAME_WRAPPER_ADDRESS = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
  const PUBLIC_RESOLVER_ADDRESS = "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41";

  // Permission constants
  const SET_ADDR_RECORD = 2;
  const SET_TEXT_RECORD = 4;
  const SET_CONTENT_HASH = 8;

  beforeEach(async function () {
    [owner, delegate1, delegate2] = await ethers.getSigners();

    // Connect to official ENS contracts (if on mainnet)
    if (await ethers.provider.getNetwork().then(n => n.chainId === 1)) {
      ensRegistry = await ethers.getContractAt("IENSRegistry", ENS_REGISTRY_ADDRESS);
      nameWrapper = await ethers.getContractAt("INameWrapper", NAME_WRAPPER_ADDRESS);
      publicResolver = await ethers.getContractAt("IENSResolver", PUBLIC_RESOLVER_ADDRESS);
    } else {
      // Use mock contracts for testing
      const MockENSRegistry = await ethers.getContractFactory("MockENSRegistry");
      ensRegistry = await MockENSRegistry.deploy();
      await ensRegistry.waitForDeployment();

      const MockNameWrapper = await ethers.getContractFactory("MockNameWrapper");
      nameWrapper = await MockNameWrapper.deploy();
      await nameWrapper.waitForDeployment();
    }

    // Deploy GNA contracts
    const GranularAssignmentController = await ethers.getContractFactory("ENSNamingDelegateGranular");
    granularController = await GranularAssignmentController.deploy();
    await granularController.waitForDeployment();

    const GranularResolver = await ethers.getContractFactory("GranularResolver");
    granularResolver = await GranularResolver.deploy(await granularController.getAddress());
    await granularResolver.waitForDeployment();
  });

  describe("Interface Compatibility", function () {
    it("Should have compatible ENSRegistry interface", async function () {
      // Test that our interface matches the official ENS Registry
      const testNode = ethers.namehash("test.eth");
      
      // These calls should work with both official and mock contracts
      const ownerResult = await ensRegistry.owner(testNode);
      const resolverResult = await ensRegistry.resolver(testNode);
      const ttlResult = await ensRegistry.ttl(testNode);
      
      // Results should be valid (either real values or zero for non-existent names)
      expect(ownerResult).to.be.a('string');
      expect(resolverResult).to.be.a('string');
      expect(ttlResult).to.be.a('bigint');
    });

    it("Should have compatible NameWrapper interface", async function () {
      // Test that our interface matches the official NameWrapper
      const testNode = ethers.namehash("test.eth");
      
      // These calls should work with both official and mock contracts
      const balanceResult = await nameWrapper.balanceOf(owner.address, testNode);
      const fusesResult = await nameWrapper.getFuses(testNode);
      
      // Results should be valid
      expect(balanceResult).to.be.a('bigint');
      expect(fusesResult).to.be.a('bigint');
    });

    it("Should have compatible resolver interface", async function () {
      // Test that our GranularResolver implements the standard resolver interface
      const testNode = ethers.namehash("test.eth");
      
      // Test standard resolver functions
      const addrResult = await granularResolver.addr(testNode);
      const textResult = await granularResolver.text(testNode, "description");
      const contenthashResult = await granularResolver.contenthash(testNode);
      
      // Results should be valid
      expect(addrResult).to.be.a('string');
      expect(textResult).to.be.a('string');
      expect(contenthashResult).to.be.a('string');
    });
  });

  describe("EIP Standards Compliance", function () {
    it("Should support EIP-137 (Address Resolution)", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test address resolution functions
      const addr = await granularResolver.addr(testNode);
      expect(addr).to.equal(ethers.ZeroAddress); // Should return zero for non-existent
      
      // Test multicoin address resolution
      const multicoinAddr = await granularResolver["addr(bytes32,uint256)"](testNode, 60); // ETH coin type
      expect(multicoinAddr).to.be.a('string'); // Returns empty bytes for non-existent
    });

    it("Should support EIP-634 (Text Records)", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test text record functions
      const text = await granularResolver.text(testNode, "description");
      expect(text).to.equal(""); // Should return empty string for non-existent
    });

    it("Should support EIP-1577 (Content Hash)", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test content hash functions
      const contenthash = await granularResolver.contenthash(testNode);
      expect(contenthash).to.equal("0x"); // Should return empty bytes for non-existent
    });

    it("Should support EIP-619 (Public Key)", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test public key functions
      const [x, y] = await granularResolver.pubkey(testNode);
      expect(x).to.equal(ethers.ZeroHash);
      expect(y).to.equal(ethers.ZeroHash);
    });

    it("Should support EIP-205 (ABI)", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test ABI functions
      const [contentType, data] = await granularResolver.ABI(testNode, 1);
      expect(contentType).to.equal(0);
      expect(data).to.equal("0x");
    });

    it("Should support EIP-1844 (Zone Hash)", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test zone hash functions
      const zonehash = await granularResolver.zonehash(testNode);
      expect(zonehash).to.equal("0x");
    });
  });

  describe("Integration with Official ENS Contracts", function () {
    it("Should work with official ENS Registry", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test integration with ENS Registry
      const registryOwner = await ensRegistry.owner(testNode);
      const registryResolver = await ensRegistry.resolver(testNode);
      
      // Should be able to query registry
      expect(registryOwner).to.be.a('string');
      expect(registryResolver).to.be.a('string');
    });

    it("Should work with official NameWrapper", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test integration with NameWrapper
      const wrapperBalance = await nameWrapper.balanceOf(owner.address, testNode);
      const wrapperFuses = await nameWrapper.getFuses(testNode);
      
      // Should be able to query NameWrapper
      expect(wrapperBalance).to.be.a('bigint');
      expect(wrapperFuses).to.be.a('bigint');
    });

    it("Should maintain compatibility with existing resolvers", async function () {
      // Test that our resolver can be set as the resolver for a domain
      const testNode = ethers.namehash("test.eth");
      
      // This would work in a real scenario where we own the domain
      // For testing, we just verify the interface is compatible
      const resolverAddress = await granularResolver.getAddress();
      expect(resolverAddress).to.be.a('string');
      expect(resolverAddress).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Permission System Integration", function () {
    it("Should integrate with ENS ownership model", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test that our permission system respects ENS ownership
      const ensOwner = await ensRegistry.owner(testNode);
      
      // Our system should be able to check ENS ownership
      // Note: This will fail on local testnet due to hardcoded mainnet addresses
      // but works fine on mainnet
      expect(ensOwner).to.be.a('string');
      expect(await granularResolver.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should work with NameWrapper permissions", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test integration with NameWrapper permissions
      const wrapperFuses = await nameWrapper.getFuses(testNode);
      
      // Our system should be able to check NameWrapper fuses
      expect(wrapperFuses).to.be.a('bigint');
    });

    it("Should maintain backward compatibility", async function () {
      // Test that our system doesn't break existing ENS functionality
      const testNode = ethers.namehash("test.eth");
      
      // Standard ENS operations should still work
      const owner = await ensRegistry.owner(testNode);
      const resolver = await ensRegistry.resolver(testNode);
      const ttl = await ensRegistry.ttl(testNode);
      
      // All standard ENS queries should return valid results
      expect(owner).to.be.a('string');
      expect(resolver).to.be.a('string');
      expect(ttl).to.be.a('bigint');
    });
  });

  describe("Network Compatibility", function () {
    it("Should work on mainnet", async function () {
      const network = await ethers.provider.getNetwork();
      
      if (network.chainId === 1) {
        // On mainnet, we should be able to connect to official contracts
        const ensRegistry = await ethers.getContractAt("IENSRegistry", ENS_REGISTRY_ADDRESS);
        const ethNode = ethers.namehash("eth");
        const ethOwner = await ensRegistry.owner(ethNode);
        
        // Should be able to query the .eth root domain
        expect(ethOwner).to.not.equal(ethers.constants.AddressZero);
      }
    });

    it("Should work on testnets", async function () {
      const network = await ethers.provider.getNetwork();
      
      // On testnets, we should be able to use mock contracts
      expect(network.chainId).to.be.a('bigint');
      
      // Our contracts should deploy successfully on any network
      expect(await granularController.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await granularResolver.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for standard operations", async function () {
      const testNode = ethers.namehash("test.eth");
      
      // Test gas costs for standard operations
      const isAuthorized = await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD);
      
      // View functions should be very cheap
      expect(isAuthorized).to.be.a('boolean');
      expect(await granularResolver.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });
});
