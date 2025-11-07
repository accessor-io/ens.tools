// Script to get USDC transaction totals using direct API calls
// Note: This requires API keys for full functionality, but we'll document the manual steps

const TARGET_ADDRESS = '0x721fc93037515aABA593480f608E58ee593bcDf1';
const ARB_USDC = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const SEPT_1_2024_TS = Math.floor(new Date('2024-09-01').getTime() / 1000);

console.log('USDC Transaction Totals for accessor.eth');
console.log('Address:', TARGET_ADDRESS);
console.log('Date Range: September 1, 2024 - Present');
console.log('\n=== DIRECT LINKS ===');
console.log('\nARBITRUM:');
console.log('https://arbiscan.io/address/' + TARGET_ADDRESS + '#tokentxnsErc20');
console.log('Filter by USDC token: ' + ARB_USDC);
console.log('\nBASE:');
console.log('https://basescan.org/address/' + TARGET_ADDRESS + '#tokentxnsErc20');
console.log('Filter by USDC token: ' + BASE_USDC);
console.log('\n=== INSTRUCTIONS ===');
console.log('1. Click on "Token Transfers (ERC-20)" tab');
console.log('2. Filter by USDC token contract address');
console.log('3. Filter by date: From September 1, 2024');
console.log('4. Filter direction: IN (incoming only)');
console.log('5. Sum all amounts (USDC has 6 decimals)');
