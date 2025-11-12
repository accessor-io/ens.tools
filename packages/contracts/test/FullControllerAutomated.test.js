const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const txLogger = require("./TransactionLogger");

describe("Full Automated Controller Test Suite", function () {
  this.timeout(120000); // Increase timeout for fork tests (2 minutes)
  
  let ensRegistry, nameWrapper;
  let granularController, testableResolver;
  let owner, delegate1, delegate2, delegate3, unauthorized;
  let testNode, parentNode;
  
  // Detect if we're forking mainnet
  let isForking = false;
  const ENS_REGISTRY_MAINNET = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
  const NAME_WRAPPER_MAINNET = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";

  // Permission constants
  const MANAGE_SUBDOMAINS = 1 << 0;      // 1
  const SET_ADDR_RECORD = 1 << 1;       // 2
  const SET_TEXT_RECORD = 1 << 2;       // 4
  const SET_CONTENT_HASH = 1 << 3;      // 8
  const SET_PUBKEY = 1 << 4;            // 16
  const SET_ABI = 1 << 5;               // 32
  const SET_ZONEHASH = 1 << 6;          // 64
  const SET_TTL = 1 << 7;               // 128
  const SET_RESOLVER = 1 << 8;          // 256
  const SET_OWNER = 1 << 9;             // 512
  const SET_FUSES = 1 << 10;            // 1024

  // Legacy operation constants
  const OP_CREATE_SUBDOMAIN = MANAGE_SUBDOMAINS;
  const OP_SET_RECORDS = SET_ADDR_RECORD | SET_TEXT_RECORD | SET_CONTENT_HASH | SET_PUBKEY | SET_ABI | SET_ZONEHASH;
  const OP_TRANSFER = SET_OWNER;
  const OP_SET_FUSES = SET_FUSES;

  beforeEach(async function () {
    [owner, delegate1, delegate2, delegate3, unauthorized] = await ethers.getSigners();
    
    // Check if we're forking mainnet - use environment variable first for faster detection
    if (process.env.FORK_MAINNET === "true") {
      isForking = true;
    } else {
      // Fallback: Check if the ENS Registry exists at mainnet address
      try {
        const code = await ethers.provider.getCode(ENS_REGISTRY_MAINNET);
        isForking = code !== "0x" && code.length > 2;
      } catch (e) {
        isForking = false;
      }
    }
    
    if (isForking) {
      // When forking, use real ENS contracts
      console.log("✓ Detected mainnet fork - using real ENS contracts");
      ensRegistry = await ethers.getContractAt("IENSRegistry", ENS_REGISTRY_MAINNET);
      nameWrapper = await ethers.getContractAt("INameWrapper", NAME_WRAPPER_MAINNET);
      
      // For forking tests, we need a domain we can control
      // Option 1: Use impersonateAccount if you have a domain owner address
      // Option 2: Use a domain you own on mainnet
      // For now, we'll try to use a common test pattern - this may require setup
      const testDomainName = process.env.TEST_DOMAIN || "test-controller-fork.eth";
      testNode = ethers.namehash(testDomainName);
      
      // If TEST_DOMAIN_OWNER is set, impersonate that account to control the domain
      if (process.env.TEST_DOMAIN_OWNER) {
        const { impersonateAccount } = require("@nomicfoundation/hardhat-network-helpers");
        const domainOwner = process.env.TEST_DOMAIN_OWNER;
        await impersonateAccount(domainOwner);
        const domainOwnerSigner = await ethers.getSigner(domainOwner);
        
        // Fund the impersonated account
        await ethers.provider.send("hardhat_setBalance", [
          domainOwner,
          "0x1000000000000000000", // 1 ETH
        ]);
        
        // Set resolver for the test domain
        await ensRegistry.connect(domainOwnerSigner).setResolver(testNode, await testableResolver.getAddress());
        console.log(`✓ Impersonating domain owner: ${domainOwner}`);
      }
    } else {
      // Use mock contracts for local testing
      const ENSRegistry = await ethers.getContractFactory("MockENSRegistry");
      ensRegistry = await ENSRegistry.deploy();
      await ensRegistry.waitForDeployment();

      const NameWrapper = await ethers.getContractFactory("MockNameWrapper");
      nameWrapper = await NameWrapper.deploy();
      await nameWrapper.waitForDeployment();

      testNode = ethers.namehash("test.eth");
    }

    // Deploy GranularAssignmentController (uses hardcoded mainnet addresses)
    const GranularAssignmentController = await ethers.getContractFactory("ENSNamingDelegateGranular");
    granularController = await GranularAssignmentController.deploy();
    await granularController.waitForDeployment();

    // Deploy resolver - use real registry when forking, mock otherwise
    const resolverRegistry = isForking ? ENS_REGISTRY_MAINNET : await ensRegistry.getAddress();
    const TestableGranularResolver = await ethers.getContractFactory("TestableGranularResolver");
    testableResolver = await TestableGranularResolver.deploy(
      resolverRegistry,
      await granularController.getAddress()
    );
    await testableResolver.waitForDeployment();

    parentNode = ethers.namehash("eth");
    
    // Set owner in registry (only works with mocks)
    if (!isForking) {
      await ensRegistry.setOwner(testNode, owner.address);
      await ensRegistry.setResolver(testNode, await testableResolver.getAddress());
    }
  });

  describe("Complete Controller Lifecycle", function () {
    it("Should complete full delegation workflow", async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400; // 24 hours
      
      // Step 1: Add delegate with permissions
      await expect(
        granularController.addDelegate(
          testNode,
          delegate1.address,
          SET_ADDR_RECORD | SET_TEXT_RECORD,
          expiresAt
        )
      ).to.emit(granularController, "DelegateAdded");

      // Step 2: Verify delegate permissions
      const isAuthorized = await granularController.isAuthorizedDelegate(
        testNode,
        delegate1.address,
        SET_ADDR_RECORD
      );
      expect(isAuthorized).to.be.true;

      // Step 3: Update delegate permissions
      await expect(
        granularController.updateDelegate(
          testNode,
          delegate1.address,
          SET_ADDR_RECORD | SET_TEXT_RECORD | SET_CONTENT_HASH,
          expiresAt + 86400
        )
      ).to.emit(granularController, "DelegateUpdated");

      // Step 4: Verify updated permissions
      const delegateInfo = await granularController.getDelegateInfo(testNode, delegate1.address);
      expect(delegateInfo.allowedOperations).to.equal(SET_ADDR_RECORD | SET_TEXT_RECORD | SET_CONTENT_HASH);

      // Step 5: Remove delegate
      await expect(
        granularController.removeDelegate(testNode, delegate1.address)
      ).to.emit(granularController, "DelegateRemoved");

      // Step 6: Verify removal
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.false;
    });

    it("Should handle multiple delegates simultaneously", async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      
      // Add multiple delegates with different permissions
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, expiresAt);
      await granularController.addDelegate(testNode, delegate2.address, SET_TEXT_RECORD, expiresAt);
      await granularController.addDelegate(testNode, delegate3.address, SET_CONTENT_HASH, expiresAt);

      // Verify each delegate has their specific permissions
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate2.address, SET_TEXT_RECORD))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate3.address, SET_CONTENT_HASH))
        .to.be.true;

      // Verify delegates don't have each other's permissions
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_TEXT_RECORD))
        .to.be.false;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate2.address, SET_CONTENT_HASH))
        .to.be.false;
    });
  });

  describe("All Permission Types", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      
      // Add delegate with all permissions
      await granularController.addDelegate(
        testNode,
        delegate1.address,
        MANAGE_SUBDOMAINS | SET_ADDR_RECORD | SET_TEXT_RECORD | SET_CONTENT_HASH | 
        SET_PUBKEY | SET_ABI | SET_ZONEHASH | SET_TTL | SET_RESOLVER | SET_OWNER | SET_FUSES,
        expiresAt
      );
    });

    it("Should authorize MANAGE_SUBDOMAINS permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, MANAGE_SUBDOMAINS))
        .to.be.true;
    });

    it("Should authorize SET_ADDR_RECORD permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
    });

    it("Should authorize SET_TEXT_RECORD permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_TEXT_RECORD))
        .to.be.true;
    });

    it("Should authorize SET_CONTENT_HASH permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_CONTENT_HASH))
        .to.be.true;
    });

    it("Should authorize SET_PUBKEY permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_PUBKEY))
        .to.be.true;
    });

    it("Should authorize SET_ABI permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ABI))
        .to.be.true;
    });

    it("Should authorize SET_ZONEHASH permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ZONEHASH))
        .to.be.true;
    });

    it("Should authorize SET_TTL permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_TTL))
        .to.be.true;
    });

    it("Should authorize SET_RESOLVER permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_RESOLVER))
        .to.be.true;
    });

    it("Should authorize SET_OWNER permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_OWNER))
        .to.be.true;
    });

    it("Should authorize SET_FUSES permission", async function () {
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_FUSES))
        .to.be.true;
    });
  });

  describe("Resolver Operations Through Controller", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD | SET_TEXT_RECORD, expiresAt);
      await granularController.addDelegate(testNode, delegate2.address, SET_CONTENT_HASH | SET_PUBKEY, expiresAt);
      await granularController.addDelegate(testNode, delegate3.address, SET_ABI | SET_ZONEHASH | SET_TTL, expiresAt);
    });

    it("Should allow delegate to set address record", async function () {
      const testAddress = delegate1.address;
      
      await expect(
        testableResolver.connect(delegate1).setAddr(testNode, testAddress)
      ).to.emit(testableResolver, "RecordSet");

      const result = await testableResolver.addr(testNode);
      expect(result).to.equal(testAddress);
    });

    it("Should allow delegate to set text record", async function () {
      await expect(
        testableResolver.connect(delegate1).setText(testNode, "description", "Test Description")
      ).to.emit(testableResolver, "RecordSet");

      const result = await testableResolver.text(testNode, "description");
      expect(result).to.equal("Test Description");
    });

    it("Should allow delegate to set content hash", async function () {
      const contentHash = "0x1234";
      
      await expect(
        testableResolver.connect(delegate2).setContenthash(testNode, contentHash)
      ).to.emit(testableResolver, "RecordSet");

      const result = await testableResolver.contenthash(testNode);
      expect(result).to.equal(contentHash);
    });

    it("Should allow delegate to set public key", async function () {
      const x = ethers.randomBytes(32);
      const y = ethers.randomBytes(32);
      
      await expect(
        testableResolver.connect(delegate2).setPubkey(testNode, x, y)
      ).to.emit(testableResolver, "RecordSet");

      const [resultX, resultY] = await testableResolver.pubkey(testNode);
      expect(resultX).to.equal(ethers.hexlify(x));
      expect(resultY).to.equal(ethers.hexlify(y));
    });

    it("Should allow delegate to set ABI", async function () {
      const abiData = "0x12345678";
      
      await expect(
        testableResolver.connect(delegate3).setABI(testNode, 1, abiData)
      ).to.emit(testableResolver, "RecordSet");

      const [, result] = await testableResolver.ABI(testNode, 1);
      expect(result).to.equal(abiData);
    });

    it("Should allow delegate to set zone hash", async function () {
      const zoneHash = "0xabcd";
      
      await expect(
        testableResolver.connect(delegate3).setZonehash(testNode, zoneHash)
      ).to.emit(testableResolver, "RecordSet");

      const result = await testableResolver.zonehash(testNode);
      expect(result).to.equal(zoneHash);
    });

    it("Should allow delegate to set TTL", async function () {
      const ttl = 3600;
      
      await expect(
        testableResolver.connect(delegate3).setTTL(testNode, ttl)
      ).to.emit(testableResolver, "RecordSet");

      const result = await testableResolver.ttl(testNode);
      expect(result).to.equal(ttl);
    });

    it("Should reject unauthorized delegate", async function () {
      await expect(
        testableResolver.connect(unauthorized).setAddr(testNode, delegate1.address)
      ).to.be.revertedWith("TestableGranularResolver: Not authorized for this operation");
    });

    it("Should reject delegate with wrong permission", async function () {
      await expect(
        testableResolver.connect(delegate1).setContenthash(testNode, "0x1234")
      ).to.be.revertedWith("TestableGranularResolver: Not authorized for this operation");
    });
  });

  describe("Subdomain Operations", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      await granularController.addDelegate(testNode, delegate1.address, OP_CREATE_SUBDOMAIN, expiresAt);
      await granularController.addDelegate(testNode, delegate2.address, OP_TRANSFER, expiresAt);
    });

    (process.env.FORK_MAINNET === "true" ? it : it.skip)("Should allow delegate to create subdomain", async function () {
      // Only runs when forking mainnet - requires real ENS contracts
      const label = "subdomain";
      const subdomainOwner = delegate1.address;
      const resolver = await testableResolver.getAddress();
      const ttl = 3600;

      await expect(
        granularController.connect(delegate1).createSubdomain(
          testNode,
          label,
          subdomainOwner,
          resolver,
          ttl
        )
      ).to.emit(granularController, "SubdomainCreated");

      const subnode = ethers.namehash(`${label}.test.eth`);
      const owner = await ensRegistry.owner(subnode);
      expect(owner).to.equal(subdomainOwner);
    });

    (process.env.FORK_MAINNET === "true" ? it : it.skip)("Should allow delegate to transfer subdomain", async function () {
      // Only runs when forking mainnet - requires real ENS contracts
      // First create a subdomain
      const label = "subdomain";
      const resolver = await testableResolver.getAddress();
      await granularController.connect(delegate1).createSubdomain(
        testNode,
        label,
        delegate1.address,
        resolver,
        3600
      );

      // Then transfer it
      await expect(
        granularController.connect(delegate2).transferSubdomain(
          testNode,
          label,
          delegate2.address
        )
      ).to.emit(granularController, "SubdomainTransferred");

      const subnode = ethers.namehash(`subdomain.test.eth`);
      const owner = await ensRegistry.owner(subnode);
      expect(owner).to.equal(delegate2.address);
    });

    (process.env.FORK_MAINNET === "true" ? it : it.skip)("Should reject unauthorized subdomain creation", async function () {
      // Only runs when forking mainnet - requires real ENS contracts
      await expect(
        granularController.connect(unauthorized).createSubdomain(
          testNode,
          "test",
          unauthorized.address,
          await testableResolver.getAddress(),
          3600
        )
      ).to.be.revertedWith("Not authorized for this operation");
    });
  });

  describe("Delegation Locking Mechanism", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, expiresAt);
    });

    it("Should lock delegate and prevent removal", async function () {
      await expect(
        granularController.lockDelegate(testNode, delegate1.address)
      ).to.emit(granularController, "DelegateLocked");

      await expect(
        granularController.removeDelegate(testNode, delegate1.address)
      ).to.be.revertedWith("Delegate is locked");
    });

    it("Should unlock delegate and allow removal", async function () {
      await granularController.lockDelegate(testNode, delegate1.address);
      
      await expect(
        granularController.unlockDelegate(testNode, delegate1.address)
      ).to.emit(granularController, "DelegateUnlocked");

      await expect(
        granularController.removeDelegate(testNode, delegate1.address)
      ).to.emit(granularController, "DelegateRemoved");
    });

    it("Should allow permission updates while locked", async function () {
      await granularController.lockDelegate(testNode, delegate1.address);
      
      const newExpiresAt = Math.floor(Date.now() / 1000) + 172800;
      await expect(
        granularController.updateDelegate(
          testNode,
          delegate1.address,
          SET_ADDR_RECORD | SET_TEXT_RECORD,
          newExpiresAt
        )
      ).to.emit(granularController, "DelegateUpdated");
    });
  });

  describe("Enable/Disable Delegates", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, expiresAt);
    });

    it("Should disable delegate and revoke access", async function () {
      await expect(
        granularController.disableDelegate(testNode, delegate1.address)
      ).to.emit(granularController, "DelegateDisabled");

      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.false;
    });

    it("Should enable delegate and restore access", async function () {
      await granularController.disableDelegate(testNode, delegate1.address);
      
      await expect(
        granularController.enableDelegate(testNode, delegate1.address)
      ).to.emit(granularController, "DelegateEnabled");

      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
    });
  });

  describe("Whitelist and Blacklist", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, expiresAt);
      await granularController.addDelegate(testNode, delegate2.address, SET_TEXT_RECORD, expiresAt);
    });

    it("Should enforce whitelist when enabled", async function () {
      await granularController.toggleWhitelist(testNode, true);
      await granularController.updateWhitelist(testNode, delegate1.address, true);
      
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate2.address, SET_TEXT_RECORD))
        .to.be.false;
    });

    it("Should enforce blacklist when enabled", async function () {
      await granularController.toggleBlacklist(testNode, true);
      await granularController.updateBlacklist(testNode, delegate1.address, true);
      
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.false;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate2.address, SET_TEXT_RECORD))
        .to.be.true;
    });

    it("Should toggle whitelist on/off", async function () {
      await granularController.toggleWhitelist(testNode, true);
      await granularController.updateWhitelist(testNode, delegate1.address, true);
      
      await granularController.toggleWhitelist(testNode, false);
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate2.address, SET_TEXT_RECORD))
        .to.be.true;
    });
  });

  describe("Expiration Handling", function () {
    it("Should reject expired delegations", async function () {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      
      await expect(
        granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, pastTime)
      ).to.be.revertedWith("Invalid expiration");
    });

    it("Should reject delegation after expiration", async function () {
      const currentTime = await time.latest();
      const futureTime = currentTime + 3600;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, futureTime);
      
      // Fast forward time
      await time.increase(3700);
      
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.false;
    });

    it("Should allow no expiration (0)", async function () {
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, 0);
      
      // Fast forward time significantly
      await time.increase(86400 * 365);
      
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
    });

    it("Should enforce maximum delegation duration", async function () {
      const maxDuration = 3600; // 1 hour
      await granularController.setMaxDelegationDuration(testNode, maxDuration);
      
      const currentTime = await time.latest();
      const tooLongExpiry = currentTime + 7200; // 2 hours
      await expect(
        granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, tooLongExpiry)
      ).to.be.revertedWith("Delegation duration exceeds maximum");
      
      const validExpiry = currentTime + 1800; // 30 minutes
      await expect(
        granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, validExpiry)
      ).to.emit(granularController, "DelegateAdded");
    });
  });

  describe("Emergency Controls", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, expiresAt);
      await granularController.addDelegate(testNode, delegate2.address, SET_TEXT_RECORD, expiresAt);
    });

    it("Should emergency pause node and revoke all access", async function () {
      await expect(
        granularController.emergencyPause(testNode, true)
      ).to.emit(granularController, "EmergencyPause");

      expect(await granularController.isEmergencyPaused(testNode)).to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.false;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate2.address, SET_TEXT_RECORD))
        .to.be.false;
    });

    it("Should emergency unpause node and restore access", async function () {
      await granularController.emergencyPause(testNode, true);
      await granularController.emergencyPause(testNode, false);
      
      expect(await granularController.isEmergencyPaused(testNode)).to.be.false;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
    });

    it("Should emergency revoke all delegations", async function () {
      await expect(
        granularController.emergencyRevokeAll(testNode)
      ).to.emit(granularController, "EmergencyRevokeAll");

      expect(await granularController.isEmergencyPaused(testNode)).to.be.true;
    });

    it("Should trigger security alert", async function () {
      await expect(
        granularController.triggerSecurityAlert(testNode, delegate1.address, "Suspicious activity detected")
      ).to.emit(granularController, "SecurityAlert")
        .withArgs(testNode, delegate1.address, "Suspicious activity detected");
    });
  });

  describe("Contract-Level Pause", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, expiresAt);
    });

    it("Should pause contract and prevent operations", async function () {
      await testableResolver.pause();
      
      await expect(
        testableResolver.connect(delegate1).setAddr(testNode, delegate1.address)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should unpause contract and restore operations", async function () {
      await testableResolver.pause();
      await testableResolver.unpause();
      
      await expect(
        testableResolver.connect(delegate1).setAddr(testNode, delegate1.address)
      ).to.emit(testableResolver, "RecordSet");
    });
  });

  describe("Permission Combinations", function () {
    it("Should handle combined permissions correctly", async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      const combinedPermissions = SET_ADDR_RECORD | SET_TEXT_RECORD | SET_CONTENT_HASH;
      
      await granularController.addDelegate(testNode, delegate1.address, combinedPermissions, expiresAt);
      
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_TEXT_RECORD))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_CONTENT_HASH))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_PUBKEY))
        .to.be.false;
    });

    it("Should support legacy operation constants", async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      
      await granularController.addDelegate(testNode, delegate1.address, OP_SET_RECORDS, expiresAt);
      
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_TEXT_RECORD))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_CONTENT_HASH))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_PUBKEY))
        .to.be.true;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD | SET_TEXT_RECORD, expiresAt);
    });

    it("Should return correct delegate info", async function () {
      const info = await granularController.getDelegateInfo(testNode, delegate1.address);
      
      expect(info.allowedOperations).to.equal(SET_ADDR_RECORD | SET_TEXT_RECORD);
      expect(info.enabled).to.be.true;
      expect(info.locked).to.be.false;
      expect(info.createdBy).to.equal(owner.address);
    });

    it("Should return correct permissions", async function () {
      const permissions = await granularController.getPermissions(testNode, delegate1.address);
      expect(permissions).to.equal(SET_ADDR_RECORD | SET_TEXT_RECORD);
    });

    it("Should return zero permissions for non-existent delegate", async function () {
      const permissions = await granularController.getPermissions(testNode, unauthorized.address);
      expect(permissions).to.equal(0);
    });

    it("Should return false for hasPermission when not authorized", async function () {
      const hasPermission = await granularController.hasPermission(testNode, delegate1.address, SET_PUBKEY);
      expect(hasPermission).to.be.false;
    });

    it("Should return true for hasPermission when authorized", async function () {
      const hasPermission = await granularController.hasPermission(testNode, delegate1.address, SET_ADDR_RECORD);
      expect(hasPermission).to.be.true;
    });
  });

  describe("Error Handling", function () {
    it("Should reject adding delegate with zero address", async function () {
      await expect(
        granularController.addDelegate(testNode, ethers.ZeroAddress, SET_ADDR_RECORD, 0)
      ).to.be.revertedWith("Delegate cannot be zero");
    });

    it("Should reject adding delegate with zero operations", async function () {
      await expect(
        granularController.addDelegate(testNode, delegate1.address, 0, 0)
      ).to.be.revertedWith("Operations must be specified");
    });

    it("Should reject adding duplicate delegate", async function () {
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, 0);
      
      await expect(
        granularController.addDelegate(testNode, delegate1.address, SET_TEXT_RECORD, 0)
      ).to.be.revertedWith("Delegate already exists");
    });

    it("Should reject removing non-existent delegate", async function () {
      await expect(
        granularController.removeDelegate(testNode, delegate1.address)
      ).to.be.revertedWith("Delegate does not exist");
    });

    it("Should reject updating non-existent delegate", async function () {
      await expect(
        granularController.updateDelegate(testNode, delegate1.address, SET_ADDR_RECORD, 0)
      ).to.be.revertedWith("Delegate does not exist");
    });

    it("Should reject operations when node is emergency paused", async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, expiresAt);
      await granularController.emergencyPause(testNode, true);
      
      await expect(
        testableResolver.connect(delegate1).setAddr(testNode, delegate1.address)
      ).to.be.revertedWith("TestableGranularResolver: Not authorized for this operation");
      
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.false;
    });

    it("Should reject adding delegate when node is emergency paused", async function () {
      await granularController.emergencyPause(testNode, true);
      
      await expect(
        granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, 0)
      ).to.be.revertedWith("Node is emergency paused");
    });
  });

  describe("Owner Override in Resolver", function () {
    it("Should allow owner to bypass GNA when override enabled", async function () {
      // Owner should be able to set records directly
      await expect(
        testableResolver.connect(owner).setAddr(testNode, owner.address)
      ).to.emit(testableResolver, "RecordSet");

      const addr = await testableResolver.addr(testNode);
      expect(addr).to.equal(owner.address);
    });

    it("Should prevent owner bypass when override disabled", async function () {
      await testableResolver.connect(owner).toggleOwnerOverride(testNode, true);
      
      await expect(
        testableResolver.connect(owner).setAddr(testNode, owner.address)
      ).to.be.revertedWith("TestableGranularResolver: Not authorized for this operation");
    });

    it("Should allow owner to toggle override", async function () {
      await expect(
        testableResolver.connect(owner).toggleOwnerOverride(testNode, true)
      ).to.emit(testableResolver, "OwnerOverrideToggled");

      await expect(
        testableResolver.connect(owner).toggleOwnerOverride(testNode, false)
      ).to.emit(testableResolver, "OwnerOverrideToggled");
    });

    it("Should reject non-owner from toggling override", async function () {
      await expect(
        testableResolver.connect(delegate1).toggleOwnerOverride(testNode, true)
      ).to.be.revertedWith("TestableGranularResolver: Only ENS owner can toggle override");
    });
  });

  describe("Multi-Coin Address Support", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD, expiresAt);
    });

    it("Should allow delegate to set multi-coin address", async function () {
      const coinType = 60; // ETH
      const address = ethers.hexlify(ethers.randomBytes(20));
      
      await expect(
        testableResolver.connect(delegate1)["setAddr(bytes32,uint256,bytes)"](testNode, coinType, address)
      ).to.emit(testableResolver, "RecordSet");

      const result = await testableResolver["addr(bytes32,uint256)"](testNode, coinType);
      expect(result).to.equal(address);
    });
  });

  describe("Complex Scenarios", function () {
    it("Should handle complete workflow: delegate, operate, expire, remove", async function () {
      // Step 1: Add delegate
      const currentTime = await time.latest();
      const expiresAt = currentTime + 3600;
      await granularController.addDelegate(testNode, delegate1.address, SET_ADDR_RECORD | SET_TEXT_RECORD, expiresAt);

      // Step 2: Delegate performs operations
      await testableResolver.connect(delegate1).setAddr(testNode, delegate1.address);
      await testableResolver.connect(delegate1).setText(testNode, "description", "Test");

      // Step 3: Verify operations worked
      expect(await testableResolver.addr(testNode)).to.equal(delegate1.address);
      expect(await testableResolver.text(testNode, "description")).to.equal("Test");

      // Step 4: Time expires
      await time.increase(3700);

      // Step 5: Verify delegate can no longer operate
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.false;
      
      await expect(
        testableResolver.connect(delegate1).setAddr(testNode, delegate2.address)
      ).to.be.revertedWith("TestableGranularResolver: Not authorized for this operation");

      // Step 6: Owner extends delegation
      const extendedTime = await time.latest();
      const newExpiresAt = extendedTime + 3600;
      await granularController.updateDelegate(testNode, delegate1.address, SET_ADDR_RECORD | SET_TEXT_RECORD, newExpiresAt);

      // Step 7: Verify delegate can operate again
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
      
      await testableResolver.connect(delegate1).setAddr(testNode, delegate2.address);
      expect(await testableResolver.addr(testNode)).to.equal(delegate2.address);

      // Step 8: Remove delegate
      await granularController.removeDelegate(testNode, delegate1.address);
      expect(await granularController.isAuthorizedDelegate(testNode, delegate1.address, SET_ADDR_RECORD))
        .to.be.false;
    });

    it("Should handle multiple nodes independently", async function () {
      const node1 = ethers.namehash("node1.eth");
      const node2 = ethers.namehash("node2.eth");
      
      await ensRegistry.setOwner(node1, owner.address);
      await ensRegistry.setOwner(node2, owner.address);

      const currentTime = await time.latest();
      const expiresAt = currentTime + 86400;
      
      await granularController.addDelegate(node1, delegate1.address, SET_ADDR_RECORD, expiresAt);
      await granularController.addDelegate(node2, delegate2.address, SET_ADDR_RECORD, expiresAt);

      expect(await granularController.isAuthorizedDelegate(node1, delegate1.address, SET_ADDR_RECORD))
        .to.be.true;
      expect(await granularController.isAuthorizedDelegate(node2, delegate2.address, SET_ADDR_RECORD))
        .to.be.true;

      await granularController.emergencyPause(node1, true);
      
      expect(await granularController.isEmergencyPaused(node1)).to.be.true;
      expect(await granularController.isEmergencyPaused(node2)).to.be.false;
      expect(await granularController.isAuthorizedDelegate(node2, delegate2.address, SET_ADDR_RECORD))
        .to.be.true;
    });
  });

  // Save all transactions after all tests complete
  after(async function () {
    if (txLogger.transactions.length > 0) {
      const { filepath, csvFilepath, summary } = await txLogger.save();
      console.log(`\n✓ Captured ${summary.totalTransactions} transactions`);
      console.log(`✓ Total gas used: ${summary.totalGasUsed}`);
      console.log(`✓ Transactions saved to: ${filepath}`);
      console.log(`✓ CSV saved to: ${csvFilepath}`);
    }
  });
});

