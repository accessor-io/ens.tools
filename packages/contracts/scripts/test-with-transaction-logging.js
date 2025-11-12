// Test runner that captures all transaction data
const { run } = require("hardhat");

// Transaction logger
const transactions = [];

// Intercept transactions
const originalSend = async function(...args) {
  const result = await this.constructor.prototype.send.apply(this, args);
  
  if (result && result.hash) {
    const receipt = await result.wait();
    transactions.push({
      hash: result.hash,
      from: result.from,
      to: result.to,
      value: result.value?.toString(),
      gasLimit: result.gasLimit?.toString(),
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString(),
      functionName: args[0]?.name || 'unknown'
    });
  }
  
  return result;
};

async function main() {
  console.log("Running tests with transaction logging...");
  
  // Run tests
  await run("test", {
    testFiles: process.argv.slice(2) || ["test/FullControllerAutomated.test.js"]
  });
  
  // Save transactions
  const fs = require("fs");
  const path = require("path");
  
  const reportsDir = path.join(__dirname, "../reports/test-results");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const txFile = path.join(reportsDir, `transactions-${Date.now()}.json`);
  fs.writeFileSync(txFile, JSON.stringify(transactions, null, 2));
  
  console.log(`\n✓ Captured ${transactions.length} transactions`);
  console.log(`✓ Saved to: ${txFile}`);
  
  // Summary
  if (transactions.length > 0) {
    const totalGas = transactions.reduce((sum, tx) => sum + BigInt(tx.gasUsed), 0n);
    console.log(`\nTransaction Summary:`);
    console.log(`  Total transactions: ${transactions.length}`);
    console.log(`  Total gas used: ${totalGas.toString()}`);
    console.log(`  Average gas per tx: ${(totalGas / BigInt(transactions.length)).toString()}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




