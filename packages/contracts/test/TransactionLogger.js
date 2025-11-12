// Transaction Logger for capturing test transactions
const fs = require("fs");
const path = require("path");

class TransactionLogger {
  constructor() {
    this.transactions = [];
    this.reportsDir = path.join(__dirname, "../reports/test-results");
    this.ensureReportsDir();
  }

  ensureReportsDir() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async logTransaction(tx, receipt, metadata = {}) {
    const txData = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || receipt.to,
      value: tx.value?.toString() || "0",
      gasLimit: tx.gasLimit?.toString() || receipt.gasLimit?.toString(),
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status === 1 ? "success" : "failed",
      blockNumber: receipt.blockNumber.toString(),
      blockHash: receipt.blockHash,
      transactionIndex: receipt.index.toString(),
      timestamp: new Date().toISOString(),
      ...metadata
    };

    this.transactions.push(txData);
    return txData;
  }

  async save() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `transactions-${timestamp}.json`;
    const filepath = path.join(this.reportsDir, filename);

    const summary = {
      generated: new Date().toISOString(),
      totalTransactions: this.transactions.length,
      totalGasUsed: this.transactions.reduce(
        (sum, tx) => sum + BigInt(tx.gasUsed || 0),
        0n
      ).toString(),
      transactions: this.transactions
    };

    fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
    
    // Also create a CSV for easier viewing
    const csvFilepath = path.join(this.reportsDir, `transactions-${timestamp}.csv`);
    this.saveCSV(csvFilepath);

    return { filepath, csvFilepath, summary };
  }

  saveCSV(filepath) {
    if (this.transactions.length === 0) return;

    const headers = Object.keys(this.transactions[0]);
    const rows = this.transactions.map(tx => 
      headers.map(header => {
        const value = tx[header] || "";
        return typeof value === "string" && value.includes(",") 
          ? `"${value}"` 
          : value;
      }).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    fs.writeFileSync(filepath, csv);
  }

  getSummary() {
    if (this.transactions.length === 0) {
      return { total: 0, totalGas: "0", averageGas: "0" };
    }

    const totalGas = this.transactions.reduce(
      (sum, tx) => sum + BigInt(tx.gasUsed || 0),
      0n
    );
    const averageGas = totalGas / BigInt(this.transactions.length);

    return {
      total: this.transactions.length,
      totalGas: totalGas.toString(),
      averageGas: averageGas.toString(),
      successful: this.transactions.filter(tx => tx.status === "success").length,
      failed: this.transactions.filter(tx => tx.status === "failed").length
    };
  }

  clear() {
    this.transactions = [];
  }
}

// Export singleton instance
const logger = new TransactionLogger();

module.exports = logger;




