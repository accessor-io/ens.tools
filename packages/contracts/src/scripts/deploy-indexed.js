const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying Indexed ENS Management System...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    
    // Deploy IndexedENSManagerFactory
    console.log("\n1. Deploying IndexedENSManagerFactory...");
    const IndexedENSManagerFactory = await ethers.getContractFactory("IndexedENSManagerFactory");
    const factory = await IndexedENSManagerFactory.deploy();
    await factory.waitForDeployment();
    console.log("IndexedENSManagerFactory deployed to:", await factory.getAddress());
    
    // Create a project
    console.log("\n2. Creating project 'example-project'...");
    const projectName = "example-project";
    const tx = await factory.createProject(projectName);
    const receipt = await tx.wait();
    console.log("Project created, gas used:", receipt.gasUsed.toString());
    
    // Get project details
    const project = await factory.getProject(projectName);
    console.log("Manager deployed to:", project.manager);
    console.log("Resolver deployed to:", project.resolver);
    
    // Deploy example contract
    console.log("\n3. Deploying IndexedENSExample...");
    const IndexedENSExample = await ethers.getContractFactory("IndexedENSExample");
    const example = await IndexedENSExample.deploy(await factory.getAddress());
    await example.waitForDeployment();
    console.log("IndexedENSExample deployed to:", await example.getAddress());
    
    // Initialize the example
    console.log("\n4. Initializing example project...");
    const initTx = await example.initializeProject();
    await initTx.wait();
    console.log("Project initialized");
    
    // Register top-level domains
    console.log("\n5. Registering top-level domains...");
    const registerTx = await example.registerTopLevelDomains();
    await registerTx.wait();
    console.log("Top-level domains registered");
    
    // Register subdomains
    console.log("\n6. Registering subdomains...");
    const subdomainTx = await example.registerSubdomains();
    await subdomainTx.wait();
    console.log("Subdomains registered");
    
    // Configure delegates (using deployer as example addresses)
    console.log("\n7. Configuring delegates...");
    const delegateTx = await example.configureDelegates(
        deployer.address, // treasury
        deployer.address, // dev team
        deployer.address, // api team
        deployer.address, // marketing team
        deployer.address  // admin
    );
    await delegateTx.wait();
    console.log("Delegates configured");
    
    // Get project statistics
    console.log("\n8. Project Statistics:");
    const stats = await example.getProjectStats();
    console.log("Total domains:", stats.totalDomains.toString());
    console.log("Total subdomains:", stats.totalSubdomains.toString());
    console.log("Total delegates:", stats.totalDelegates.toString());
    console.log("Manager address:", stats.managerAddress);
    console.log("Resolver address:", stats.resolverAddress);
    
    // Demonstrate permission checking
    console.log("\n9. Testing permission system:");
    const whatDomainIndex = await example.whatDomainIndex();
    const whoDomainIndex = await example.whoDomainIndex();
    
    console.log("what.eth domain index:", whatDomainIndex.toString());
    console.log("who.eth domain index:", whoDomainIndex.toString());
    
    // Check if deployer has SET_ADDR_RECORD permission on what.eth
    const hasAddrPermission = await example.checkPermission(
        deployer.address,
        whatDomainIndex,
        2 // SET_ADDR_RECORD
    );
    console.log("Deployer has SET_ADDR_RECORD on what.eth:", hasAddrPermission);
    
    // Check if deployer has MANAGE_SUBDOMAINS permission on who.eth
    const hasSubdomainPermission = await example.checkPermission(
        deployer.address,
        whoDomainIndex,
        1 // MANAGE_SUBDOMAINS
    );
    console.log("Deployer has MANAGE_SUBDOMAINS on who.eth:", hasSubdomainPermission);
    
    // Get all delegates for what.eth
    const [delegates, permissions] = await example.getDomainDelegates(whatDomainIndex);
    console.log("\nDelegates for what.eth:");
    for (let i = 0; i < delegates.length; i++) {
        console.log(`  ${delegates[i]}: 0x${permissions[i].toString(16)}`);
    }
    
    // Get all delegates for who.eth
    const [whoDelegates, whoPermissions] = await example.getDomainDelegates(whoDomainIndex);
    console.log("\nDelegates for who.eth:");
    for (let i = 0; i < whoDelegates.length; i++) {
        console.log(`  ${whoDelegates[i]}: 0x${whoPermissions[i].toString(16)}`);
    }
    
    console.log("\n✅ Indexed ENS Management System deployed and configured successfully!");
    console.log("\nContract Addresses:");
    console.log("Factory:", await factory.getAddress());
    console.log("Example:", await example.getAddress());
    console.log("Manager:", project.manager);
    console.log("Resolver:", project.resolver);
    
    console.log("\nUsage Examples:");
    console.log("1. Check permissions: example.checkPermission(delegate, domainIndex, permission)");
    console.log("2. Get domain delegates: example.getDomainDelegates(domainIndex)");
    console.log("3. Find subdomain: example.findSubdomainByLabel(domainIndex, 'label')");
    console.log("4. Get project stats: example.getProjectStats()");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
