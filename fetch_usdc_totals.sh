#!/bin/bash

# Script to fetch USDC transaction totals
# Note: Requires API keys for full functionality

TARGET_ADDR="0x721fc93037515aABA593480f608E58ee593bcDf1"
ARB_USDC="0xaf88d065e77c8cc2239327c5edb3a432268e5831"
BASE_USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
SEPT_1_2024=1725148800

echo "========================================="
echo "USDC Transaction Totals for accessor.eth"
echo "========================================="
echo ""
echo "Target Address: $TARGET_ADDR"
echo "Date Range: September 1, 2024 - Present"
echo ""
echo "To get actual totals, you need API keys."
echo ""
echo "ARBITRUM API URL:"
echo "https://api.arbiscan.io/api?module=account&action=tokentx&contractaddress=$ARB_USDC&address=$TARGET_ADDR&startblock=0&endblock=99999999&sort=desc&apikey=YOUR_API_KEY"
echo ""
echo "BASE API URL:"
echo "https://api.basescan.org/api?module=account&action=tokentx&contractaddress=$BASE_USDC&address=$TARGET_ADDR&startblock=0&endblock=99999999&sort=desc&apikey=YOUR_API_KEY"
echo ""
echo "After fetching, filter for:"
echo "- to address = $TARGET_ADDR"
echo "- timestamp >= $SEPT_1_2024"
echo "- Sum amounts (divide by 1e6 for USDC decimals)"
echo ""
echo "Or manually check:"
echo "ARBITRUM: https://arbiscan.io/address/$TARGET_ADDR#tokentxnsErc20"
echo "BASE: https://basescan.org/address/$TARGET_ADDR#tokentxnsErc20"
