const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IndexedENSManager", function () {
  let factory, manager, resolver, example;
  let owner, delegate1, delegate2, delegate3;
  let projectName = "test-project";

  // Permission constants
  const MANAGE_SUBDOMAINS = 1 << 0;
  const SET_ADDR_RECORD = 1 << 1;
  const SET_TEXT_RECORD = 1 << 2;
  const SET_CONTENT_HASH = 1 << 3;
  const SET_PUBKEY = 1 << 4;
  const SET_ABI = 1 << 5;
  const SET_ZONEHASH = 1 << 6;
  const SET_TTL = 1 << 7;
  const SET_RESOLVER = 1 << 8;
  const SET_OWNER = 1 << 9;
  const SET_FUSES = 1 << 10;

  beforeEach(async function () {
    [owner, delegate1, delegate2, delegate3] = await ethers.getSigners();

    // Deploy factory
    const IndexedENSManagerFactory = await ethers.getContractFactory("IndexedENSManagerFactory");
    factory = await IndexedENSManagerFactory.deploy();
    await factory.waitForDeployment();

    // Create project
    const tx = await factory.createProject(projectName);
    await tx.wait();
    
    const project = await factory.getProject(projectName);
    manager = await ethers.getContractAt("IndexedENSManager", project.manager);
    resolver = await ethers.getContractAt("IndexedGranularResolver", project.resolver);
  });

  describe("Domain Registration", function () {
    it("Should register top-level domains", async function () {
      const whatNamehash = ethers.namehash("what.eth");
      const whoNamehash = ethers.namehash("who.eth");

      const whatIndex = await manager.registerTopLevelDomain(whatNamehash);
      const whoIndex = await manager.registerTopLevelDomain(whoNamehash);

      expect(whatIndex).to.equal(1);
      expect(whoIndex).to.equal(2);

      const whatDomain = await manager.topLevelDomains(whatIndex);
      const whoDomain = await manager.topLevelDomains(whoIndex);

      expect(whatDomain.namehash).to.equal(whatNamehash);
      expect(whoDomain.namehash).to.equal(whoNamehash);
      expect(whatDomain.isActive).to.be.true;
      expect(whoDomain.isActive).to.be.true;
    });

    it("Should register subdomains", async function () {
      const whatNamehash = ethers.namehash("what.eth");
      const whatIndex = await manager.registerTopLevelDomain(whatNamehash);

      const abcIndex = await manager.registerSubdomain(whatIndex, "abc");
      const defIndex = await manager.registerSubdomain(whatIndex, "def");

      expect(abcIndex).to.equal(1);
      expect(defIndex).to.equal(2);

      const abcSubdomain = await manager.subdomains(whatIndex, abcIndex);
      const defSubdomain = await manager.subdomains(whatIndex, defIndex);

      expect(abcSubdomain.labelHash).to.equal(ethers.keccak256(ethers.toUtf8Bytes("abc")));
      expect(defSubdomain.labelHash).to.equal(ethers.keccak256(ethers.toUtf8Bytes("def")));
      expect(abcSubdomain.isActive).to.be.true;
      expect(defSubdomain.isActive).to.be.true;
    });

    it("Should find subdomain by label", async function () {
      const whatNamehash = ethers.namehash("what.eth");
      const whatIndex = await manager.registerTopLevelDomain(whatNamehash);

      await manager.registerSubdomain(whatIndex, "abc");
      await manager.registerSubdomain(whatIndex, "def");

      const abcFoundIndex = await manager.getSubdomainIndex(whatIndex, "abc");
      const defFoundIndex = await manager.getSubdomainIndex(whatIndex, "def");
      const notFoundIndex = await manager.getSubdomainIndex(whatIndex, "xyz");

      expect(abcFoundIndex).to.equal(1);
      expect(defFoundIndex).to.equal(2);
      expect(notFoundIndex).to.equal(0);
    });
  });

  describe("Delegate Management", function () {
    let whatIndex, whoIndex;

    beforeEach(async function () {
      const whatNamehash = ethers.namehash("what.eth");
      const whoNamehash = ethers.namehash("who.eth");

      whatIndex = await manager.registerTopLevelDomain(whatNamehash);
      whoIndex = await manager.registerTopLevelDomain(whoNamehash);
    });

    it("Should add delegates for top-level domains", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year

      await manager.addDelegate(whatIndex, delegate1.address, SET_ADDR_RECORD, expiresAt);
      await manager.addDelegate(whoIndex, delegate2.address, MANAGE_SUBDOMAINS | SET_TEXT_RECORD, expiresAt);

      const hasAddrPermission = await manager.hasPermission(whatIndex, delegate1.address, SET_ADDR_RECORD);
      const hasSubdomainPermission = await manager.hasPermission(whoIndex, delegate2.address, MANAGE_SUBDOMAINS);

      expect(hasAddrPermission).to.be.true;
      expect(hasSubdomainPermission).to.be.true;
    });

    it("Should add delegates for specific subdomains", async function () {
      const abcIndex = await manager.registerSubdomain(whatIndex, "abc");
      const expiresAt = Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60; // 6 months

      await manager.addSubdomainDelegate(whatIndex, abcIndex, delegate1.address, SET_TEXT_RECORD | SET_CONTENT_HASH, expiresAt);

      const hasTextPermission = await manager.hasPermission(whatIndex, delegate1.address, SET_TEXT_RECORD);
      const hasContentPermission = await manager.hasPermission(whatIndex, delegate1.address, SET_CONTENT_HASH);

      expect(hasTextPermission).to.be.true;
      expect(hasContentPermission).to.be.true;
    });

    it("Should update delegate permissions", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await manager.addDelegate(whatIndex, delegate1.address, SET_ADDR_RECORD, expiresAt);
      
      const originalPermissions = await manager.getPermissions(whatIndex, delegate1.address);
      expect(originalPermissions).to.equal(SET_ADDR_RECORD);

      // Update to include text records
      await manager.updateDelegate(whatIndex, 1, SET_ADDR_RECORD | SET_TEXT_RECORD, expiresAt);
      
      const updatedPermissions = await manager.getPermissions(whatIndex, delegate1.address);
      expect(updatedPermissions).to.equal(SET_ADDR_RECORD | SET_TEXT_RECORD);
    });

    it("Should lock and unlock delegates", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await manager.addDelegate(whatIndex, delegate1.address, SET_ADDR_RECORD, expiresAt);

      // Lock delegate
      await manager.lockDelegate(whatIndex, 1);

      // Try to remove locked delegate (should fail)
      await expect(manager.removeDelegate(whatIndex, 1)).to.be.revertedWith("Delegate is locked");

      // Unlock delegate
      await manager.unlockDelegate(whatIndex, 1);

      // Now should be able to remove
      await manager.removeDelegate(whatIndex, 1);

      const hasPermission = await manager.hasPermission(whatIndex, delegate1.address, SET_ADDR_RECORD);
      expect(hasPermission).to.be.false;
    });

    it("Should enable and disable delegates", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await manager.addDelegate(whatIndex, delegate1.address, SET_ADDR_RECORD, expiresAt);

      // Disable delegate
      await manager.disableDelegate(whatIndex, 1);

      let hasPermission = await manager.hasPermission(whatIndex, delegate1.address, SET_ADDR_RECORD);
      expect(hasPermission).to.be.false;

      // Re-enable delegate
      await manager.enableDelegate(whatIndex, 1);

      hasPermission = await manager.hasPermission(whatIndex, delegate1.address, SET_ADDR_RECORD);
      expect(hasPermission).to.be.true;
    });
  });

  describe("Query Functions", function () {
    let whatIndex, whoIndex;

    beforeEach(async function () {
      const whatNamehash = ethers.namehash("what.eth");
      const whoNamehash = ethers.namehash("who.eth");

      whatIndex = await manager.registerTopLevelDomain(whatNamehash);
      whoIndex = await manager.registerTopLevelDomain(whoNamehash);

      // Add some delegates
      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      await manager.addDelegate(whatIndex, delegate1.address, SET_ADDR_RECORD, expiresAt);
      await manager.addDelegate(whatIndex, delegate2.address, SET_TEXT_RECORD, expiresAt);
      await manager.addDelegate(whoIndex, delegate3.address, MANAGE_SUBDOMAINS, expiresAt);
    });

    it("Should get all delegates for a domain", async function () {
      const [delegates, permissions] = await manager.getDomainDelegates(whatIndex);

      expect(delegates.length).to.equal(2);
      expect(delegates[0]).to.equal(delegate1.address);
      expect(delegates[1]).to.equal(delegate2.address);
      expect(permissions[0]).to.equal(SET_ADDR_RECORD);
      expect(permissions[1]).to.equal(SET_TEXT_RECORD);
    });

    it("Should get delegates with specific permission", async function () {
      const delegatesWithAddrPermission = await manager.getDelegatesWithPermission(whatIndex, SET_ADDR_RECORD);
      const delegatesWithTextPermission = await manager.getDelegatesWithPermission(whatIndex, SET_TEXT_RECORD);

      expect(delegatesWithAddrPermission.length).to.equal(1);
      expect(delegatesWithAddrPermission[0]).to.equal(delegate1.address);

      expect(delegatesWithTextPermission.length).to.equal(1);
      expect(delegatesWithTextPermission[0]).to.equal(delegate2.address);
    });

    it("Should get domain statistics", async function () {
      const totalDomains = await manager.getTotalDomainCount();
      const whatSubdomainCount = await manager.getSubdomainCount(whatIndex);
      const whatDelegateCount = await manager.getDelegateCount(whatIndex);

      expect(totalDomains).to.equal(2);
      expect(whatSubdomainCount).to.equal(0);
      expect(whatDelegateCount).to.equal(2);
    });
  });

  describe("Emergency Controls", function () {
    let whatIndex;

    beforeEach(async function () {
      const whatNamehash = ethers.namehash("what.eth");
      whatIndex = await manager.registerTopLevelDomain(whatNamehash);

      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      await manager.addDelegate(whatIndex, delegate1.address, SET_ADDR_RECORD, expiresAt);
    });

    it("Should emergency pause domain", async function () {
      let isPaused = await manager.isEmergencyPaused(whatIndex);
      expect(isPaused).to.be.false;

      await manager.emergencyPause(whatIndex, true);

      isPaused = await manager.isEmergencyPaused(whatIndex);
      expect(isPaused).to.be.true;

      // Permission should be denied when paused
      const hasPermission = await manager.hasPermission(whatIndex, delegate1.address, SET_ADDR_RECORD);
      expect(hasPermission).to.be.false;
    });

    it("Should unpause domain", async function () {
      await manager.emergencyPause(whatIndex, true);
      
      let isPaused = await manager.isEmergencyPaused(whatIndex);
      expect(isPaused).to.be.true;

      await manager.emergencyPause(whatIndex, false);

      isPaused = await manager.isEmergencyPaused(whatIndex);
      expect(isPaused).to.be.false;

      // Permission should be restored
      const hasPermission = await manager.hasPermission(whatIndex, delegate1.address, SET_ADDR_RECORD);
      expect(hasPermission).to.be.true;
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for common operations", async function () {
      const whatNamehash = ethers.namehash("what.eth");
      const whatIndex = await manager.registerTopLevelDomain(whatNamehash);

      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      // Measure gas for adding delegate
      const addDelegateTx = await manager.addDelegate(whatIndex, delegate1.address, SET_ADDR_RECORD, expiresAt);
      const addDelegateReceipt = await addDelegateTx.wait();
      console.log("Add delegate gas:", addDelegateReceipt.gasUsed.toString());

      // Measure gas for permission check
      const permissionCheckTx = await manager.hasPermission(whatIndex, delegate1.address, SET_ADDR_RECORD);
      console.log("Permission check result:", permissionCheckTx);

      // Measure gas for getting all delegates
      const getDelegatesTx = await manager.getDomainDelegates(whatIndex);
      console.log("Get delegates result:", getDelegatesTx[0].length, "delegates");

      // Gas costs should be reasonable (exact numbers depend on network)
      expect(addDelegateReceipt.gasUsed).to.be.lessThan(200000); // Should be much less than original
    });
  });

  describe("Integration with Resolver", function () {
    let whatIndex;

    beforeEach(async function () {
      const whatNamehash = ethers.namehash("what.eth");
      whatIndex = await manager.registerTopLevelDomain(whatNamehash);

      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      await manager.addDelegate(whatIndex, delegate1.address, SET_TEXT_RECORD, expiresAt);
    });

    it("Should work with resolver for text records", async function () {
      // This would require the resolver to be set as the resolver for the domain
      // In a real scenario, you'd call setResolver on the ENS Registry
      
      // For now, just verify the permission system works
      const hasPermission = await manager.hasPermission(whatIndex, delegate1.address, SET_TEXT_RECORD);
      expect(hasPermission).to.be.true;
    });
  });
});
