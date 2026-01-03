/**
 * Utilities for parsing proposal data from Discourse
 * Extracts addresses, amounts, EP numbers, and other structured data
 */

export interface ParsedProposalData {
  epNumber: string | null;
  addresses: string[];
  amounts: Array<{ value: number; currency: string; text: string }>;
  transactionHashes: string[];
  workingGroup: string | null;
  budgetItems: Array<{ category: string; amount: number; currency: string }>;
  executionDate: Date | null;
  executionTxHash: string | null;
}

/**
 * Extract EP number from text
 */
export function extractEPNumber(text: string): string | null {
  const patterns = [
    /EP\s*(\d+\.\d+)/i,
    /EP-(\d+\.\d+)/i,
    /EP(\d+\.\d+)/i,
    /Executable\s*Proposal\s*(\d+\.\d+)/i,
    /proposal\s*(\d+\.\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract Ethereum addresses from text
 */
export function extractAddresses(text: string): string[] {
  const addressRegex = /0x[a-fA-F0-9]{40}/g;
  const matches = text.match(addressRegex);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extract transaction hashes from text
 */
export function extractTransactionHashes(text: string): string[] {
  const patterns = [
    // Etherscan links
    /etherscan\.io\/tx\/(0x[a-fA-F0-9]{64})/gi,
    // Direct hash mentions
    /(?:^|\s|"|')(0x[a-fA-F0-9]{64})(?:\s|$|"|')/g,
    // Hash in markdown links
    /\[.*?\]\(.*?\/tx\/(0x[a-fA-F0-9]{64})/gi,
  ];

  const hashes = new Set<string>();
  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) hashes.add(match[1].toLowerCase());
    }
  });

  return Array.from(hashes);
}

/**
 * Extract monetary amounts from text
 */
export function extractAmounts(text: string): Array<{ value: number; currency: string; text: string }> {
  const amounts: Array<{ value: number; currency: string; text: string }> = [];
  
  // Patterns for different formats
  const patterns = [
    // $100,000 or $100,000.50
    /\$([\d,]+(?:\.\d+)?)\s*(?:USD|USDC)?/gi,
    // 100,000 USDC or 100,000.50 USDC
    /([\d,]+(?:\.\d+)?)\s*USDC/gi,
    // 100,000 USD or 100,000.50 USD
    /([\d,]+(?:\.\d+)?)\s*USD/gi,
    // 50 ETH or 50.5 ETH
    /([\d,]+(?:\.\d+)?)\s*ETH/gi,
    // 100K, 1.5M format
    /([\d,]+(?:\.\d+)?)\s*([KMkm])\s*(?:USD|USDC)?/gi,
  ];

  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      let currency = 'USD';
      
      // Handle K/M suffixes
      if (match[2]) {
        const suffix = match[2].toUpperCase();
        if (suffix === 'K') value *= 1000;
        if (suffix === 'M') value *= 1000000;
      }
      
      // Determine currency
      const fullMatch = match[0].toUpperCase();
      if (fullMatch.includes('ETH')) currency = 'ETH';
      else if (fullMatch.includes('USDC')) currency = 'USDC';
      else if (fullMatch.includes('USD')) currency = 'USD';
      
      amounts.push({
        value,
        currency,
        text: match[0],
      });
    }
  });

  // Remove duplicates and sort by value
  const unique = new Map<string, { value: number; currency: string; text: string }>();
  amounts.forEach(amt => {
    const key = `${amt.value}_${amt.currency}`;
    if (!unique.has(key) || unique.get(key)!.text.length < amt.text.length) {
      unique.set(key, amt);
    }
  });

  return Array.from(unique.values()).sort((a, b) => b.value - a.value);
}

/**
 * Extract working group from text
 */
export function extractWorkingGroup(text: string): string | null {
  const workingGroups = [
    'Ecosystem',
    'Public Goods',
    'Meta-Governance',
    'Meta Governance',
  ];

  const lowerText = text.toLowerCase();
  for (const wg of workingGroups) {
    if (lowerText.includes(wg.toLowerCase())) {
      return wg === 'Meta Governance' ? 'Meta-Governance' : wg;
    }
  }

  return null;
}

/**
 * Extract budget line items from structured text (tables, lists)
 */
export function extractBudgetItems(text: string): Array<{ category: string; amount: number; currency: string }> {
  const items: Array<{ category: string; amount: number; currency: string }> = [];
  
  // Try to parse markdown tables
  const tableRegex = /\|(.+?)\|/g;
  const lines = text.split('\n');
  
  let inTable = false;
  let headers: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      
      if (cells[0] === '' || cells[0].toLowerCase().includes('category') || 
          cells[0].toLowerCase().includes('item')) {
        headers = cells;
        inTable = true;
        continue;
      }
      
      if (inTable && cells.length >= 2) {
        const category = cells[0];
        const amountText = cells.find(c => /\$|USDC|USD|ETH/.test(c)) || cells[1];
        const amounts = extractAmounts(amountText);
        
        if (amounts.length > 0) {
          items.push({
            category,
            amount: amounts[0].value,
            currency: amounts[0].currency,
          });
        }
      }
    } else if (inTable && !line.startsWith('|')) {
      inTable = false;
    }
  }
  
  return items;
}

/**
 * Extract execution information from text
 */
export function extractExecutionInfo(text: string): { date: Date | null; txHash: string | null } {
  let executionDate: Date | null = null;
  let executionTxHash: string | null = null;
  
  // Look for execution date patterns
  const datePatterns = [
    /executed\s+on\s+(\d{4}-\d{2}-\d{2})/i,
    /executed\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
    /execution\s+date[:\s]+(\d{4}-\d{2}-\d{2})/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      executionDate = new Date(match[1]);
      if (isNaN(executionDate.getTime())) executionDate = null;
      break;
    }
  }
  
  // Look for execution transaction hash
  const execTxPatterns = [
    /execution\s+tx[:\s]+(0x[a-fA-F0-9]{64})/i,
    /executed\s+via\s+(0x[a-fA-F0-9]{64})/i,
    /execution\s+transaction[:\s]+(0x[a-fA-F0-9]{64})/i,
  ];
  
  for (const pattern of execTxPatterns) {
    const match = text.match(pattern);
    if (match) {
      executionTxHash = match[1].toLowerCase();
      break;
    }
  }
  
  // If no explicit execution tx, look for tx hashes near "executed" keyword
  if (!executionTxHash) {
    const executedIndex = text.toLowerCase().indexOf('executed');
    if (executedIndex >= 0) {
      const context = text.substring(Math.max(0, executedIndex - 100), executedIndex + 200);
      const hashes = extractTransactionHashes(context);
      if (hashes.length > 0) {
        executionTxHash = hashes[0];
      }
    }
  }
  
  return { date: executionDate, txHash: executionTxHash };
}

/**
 * Parse proposal data from Discourse topic/post content
 */
export function parseProposalData(content: string, title?: string): ParsedProposalData {
  const fullText = title ? `${title}\n${content}` : content;
  
  return {
    epNumber: extractEPNumber(fullText),
    addresses: extractAddresses(fullText),
    amounts: extractAmounts(fullText),
    transactionHashes: extractTransactionHashes(fullText),
    workingGroup: extractWorkingGroup(fullText),
    budgetItems: extractBudgetItems(fullText),
    ...extractExecutionInfo(fullText),
  };
}

/**
 * Match proposal amounts to transactions
 */
export function matchProposalToTransactions(
  proposal: ParsedProposalData,
  transactions: Array<{ hash: string; value: number; date: Date }>
): Array<{ hash: string; confidence: number; reason: string }> {
  const matches: Array<{ hash: string; confidence: number; reason: string }> = [];
  
  // Match by transaction hash
  proposal.transactionHashes.forEach(txHash => {
    const tx = transactions.find(t => t.hash.toLowerCase() === txHash.toLowerCase());
    if (tx) {
      matches.push({
        hash: tx.hash,
        confidence: 1.0,
        reason: 'Explicit transaction hash in proposal',
      });
    }
  });
  
  // Match by amount proximity
  proposal.amounts.forEach(proposalAmount => {
    transactions.forEach(tx => {
      // Skip if already matched
      if (matches.some(m => m.hash === tx.hash)) return;
      
      const difference = Math.abs(tx.value - proposalAmount.value);
      const percentDiff = (difference / proposalAmount.value) * 100;
      
      // Match if within 5% and same currency context
      if (percentDiff < 5 && proposalAmount.value > 1000) {
        matches.push({
          hash: tx.hash,
          confidence: 1 - (percentDiff / 100),
          reason: `Amount match: ${proposalAmount.value} ${proposalAmount.currency} (${percentDiff.toFixed(2)}% difference)`,
        });
      }
    });
  });
  
  // Sort by confidence
  return matches.sort((a, b) => b.confidence - a.confidence);
}







