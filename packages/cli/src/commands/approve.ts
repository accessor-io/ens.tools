import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getPublicClient, getWalletClient } from '../config';
import { validateAddress, waitForTransaction, displaySuccess, displayInfo } from '../utils/helpers';
import { NAME_WRAPPER_ABI, CONTRACTS } from '../abis';

export function approveCommands(program: Command) {
  const approve = program
    .command('approve')
    .description('Approve delegate contracts for ENS operations');

  approve
    .command('set-approval')
    .description('Set approval for a delegate contract')
    .argument('<delegate>', 'Delegate contract address')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (delegate: string, options: any) => {
      const spinner = ora('Setting approval...').start();
      
      try {
        const delegateAddress = validateAddress(delegate);
        const publicClient = getPublicClient();
        const walletClient = getWalletClient();
        
        if (!walletClient.account) {
          spinner.fail('No wallet account available');
          process.exit(1);
        }

        if (!options.yes) {
          spinner.stop();
          console.log(chalk.yellow('WARNING: This will grant full naming permissions to the delegate contract'));
          console.log(chalk.yellow(`WARNING: Delegate: ${delegateAddress}`));
          console.log(chalk.yellow('WARNING: Type "yes" to continue or Ctrl+C to cancel'));
          // In production, use inquirer for confirmation
        }

        spinner.start('Sending transaction...');
        
        const hash = await walletClient.writeContract({
          address: CONTRACTS.NAME_WRAPPER,
          abi: NAME_WRAPPER_ABI,
          functionName: 'setApprovalForAll',
          args: [delegateAddress, true],
        });

        spinner.text = 'Waiting for confirmation...';
        await waitForTransaction(hash);

        spinner.succeed('Approval set successfully');
        displaySuccess(`Delegate ${delegateAddress} can now act on your behalf`);
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  approve
    .command('check')
    .description('Check if delegate is approved')
    .argument('<delegate>', 'Delegate contract address')
    .action(async (delegate: string) => {
      const spinner = ora('Checking approval...').start();
      
      try {
        const delegateAddress = validateAddress(delegate);
        const publicClient = getPublicClient();
        const walletClient = getWalletClient();
        
        if (!walletClient.account) {
          spinner.fail('No wallet account available');
          process.exit(1);
        }

        const isApproved = await publicClient.readContract({
          address: CONTRACTS.NAME_WRAPPER,
          abi: NAME_WRAPPER_ABI,
          functionName: 'isApprovedForAll',
          args: [walletClient.account.address, delegateAddress],
        });

        spinner.succeed('Approval check complete');
        
        if (isApproved) {
          console.log(chalk.green(`SUCCESS: Delegate ${delegateAddress} is approved`));
        } else {
          console.log(chalk.red(`ERROR: Delegate ${delegateAddress} is NOT approved`));
          console.log(chalk.yellow('Run: approve set-approval <delegate-address>'));
        }
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });
}


