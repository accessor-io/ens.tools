import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CheckCircle2, AlertTriangle, FileCode, Settings, Lock, Users, Layers } from 'lucide-react';

interface BestPracticesProps {
  searchQuery: string;
}

export function BestPractices({ searchQuery }: BestPracticesProps) {
  const sections = [
    {
      id: 'naming',
      icon: FileCode,
      title: 'I. Contract Naming Best Practices',
      description: 'Clear, predictable domain structure for smart contracts',
      practices: [
        {
          category: 'Subdomain Hierarchy',
          importance: 'critical',
          items: [
            {
              practice: 'Primary Entry Point',
              example: 'app.project.eth',
              rationale: 'Always use a standard prefix for the main application router or user-facing contract.'
            },
            {
              practice: 'Governance/DAO',
              example: 'dao.project.eth',
              rationale: 'Clearly separates governance logic and treasury management from application logic.'
            },
            {
              practice: 'Core Functions',
              example: 'registry.project.eth, vault.project.eth',
              rationale: 'Designate specific, critical contracts with descriptive names.'
            },
            {
              practice: 'Development Stages',
              example: 'dev.project.eth, staging.project.eth',
              rationale: 'If you use ENS names in your deployment pipeline, ensure they are clearly labeled to prevent accidental production deployments.'
            },
            {
              practice: 'Token Addresses',
              example: 'usdc.token.eth',
              rationale: '(If you are managing another token\'s subname): Standardize the use of a .token or .asset structure.'
            }
          ]
        },
        {
          category: 'Immutability and Security',
          importance: 'critical',
          items: [
            {
              practice: 'Security Ownership',
              example: 'Use Gnosis Safe multisig',
              rationale: 'The owner of critical contract names (e.g., dao.project.eth) should be a multisig wallet or a governance contract, not a single external account (EOA).'
            },
            {
              practice: 'Use Name Wrapper Fuses',
              example: 'Burn CANNOT_SET_RESOLVER, CANNOT_TRANSFER',
              rationale: 'For critical contract subdomains, after setting the initial Resolver and Owner, burn key fuses to prevent accidental or malicious changes.'
            }
          ]
        }
      ]
    },
    {
      id: 'metadata',
      icon: Settings,
      title: 'II. Metadata Best Practices',
      description: 'Critical records for interoperability, security auditing, and user trust',
      practices: [
        {
          category: 'Address Records',
          importance: 'critical',
          items: [
            {
              practice: 'Point to the Proxy, Not the Implementation',
              example: 'Use proxy address for upgradeable contracts',
              rationale: 'If your contract is upgradeable (using UUPS or Transparent Proxy patterns), the ENS record must always resolve to the proxy address, not the underlying logic contract. Ensures that upgrades occur seamlessly without requiring a transaction to update the ENS record.'
            },
            {
              practice: 'Configure Multi-Coin Addresses',
              example: 'Set Polygon, Arbitrum, Optimism addresses',
              rationale: 'If your contract operates on L2s or other chains, configure the relevant Multi-Coin addresses. Allows users to easily find the contract address across your entire ecosystem using a single ENS name.'
            },
            {
              practice: 'Verify Deployment',
              example: 'Double-check on blockchain explorer',
              rationale: 'Verify that the address entered is the final, verified address on the blockchain explorer before locking any fuses. Prevents permanent redirection to an incorrect or intermediate address.'
            }
          ]
        },
        {
          category: 'ABI Records (EIP-1617)',
          importance: 'high',
          items: [
            {
              practice: 'Always Include the ABI',
              example: 'Set ABI record for public-facing contracts',
              rationale: 'For public-facing contracts, always set the ABI record so DApps and wallets know how to interact with the contract.'
            },
            {
              practice: 'Handling Large ABIs',
              example: 'Host on IPFS/Arweave, set Content Hash',
              rationale: 'If the contract ABI is too large to store on-chain effectively (due to gas limits), host the ABI JSON file on decentralized storage and set the ENS Content Hash record to the CID.'
            }
          ]
        },
        {
          category: 'Text Records',
          importance: 'medium',
          records: [
            {
              key: 'url',
              value: 'Link to official documentation or main dApp page',
              rationale: 'Primary resource for users and integrators.'
            },
            {
              key: 'description',
              value: 'Concise summary of contract function',
              rationale: 'Helps users understand the contract purpose at a glance.'
            },
            {
              key: 'notice',
              value: 'Contract is upgradeable via DAO vote. Next scheduled upgrade: Q4 2024.',
              rationale: 'Critical for security; informs users about upgradeability risks and maintenance schedules.'
            },
            {
              key: 'org.auditor',
              value: 'Name of auditing firm and link to report',
              rationale: 'Instills trust and provides immediate security provenance.'
            },
            {
              key: 'project.version',
              value: 'v3.1.0 or Upgrade 2024-05',
              rationale: 'Tracks the current version of the contract implementation.'
            }
          ]
        }
      ]
    },
    {
      id: 'management',
      icon: Lock,
      title: 'III. Management and Security',
      description: 'How you manage the names is as important as the data',
      practices: [
        {
          category: 'Resolver Selection',
          importance: 'high',
          items: [
            {
              practice: 'Default to the Public Resolver',
              example: 'Use ENS Public Resolver',
              rationale: 'Unless you have a specific need for dynamic, off-chain data (via CCIP-Read), use the Public Resolver provided by the ENS team. It is audited, battle-tested, and significantly reduces the maintenance burden and security surface area.'
            },
            {
              practice: 'Use Custom Resolvers ONLY for Dynamic Data',
              example: 'CCIP-Read for L2 data',
              rationale: 'If you must use CCIP-Read to pull data from a layer 2 or an off-chain API, deploy your own custom Resolver that is heavily audited and limited in scope.'
            }
          ]
        },
        {
          category: 'Separation of Duties',
          importance: 'critical',
          items: [
            {
              practice: 'Owner (Multisig Safe)',
              example: 'Cold wallet holds ERC-721 NFT',
              rationale: 'Holds the ERC-721 NFT for the top-level name (project.eth) and critical subdomains. Only used for annual renewal and transferring ownership (rarely).'
            },
            {
              practice: 'Controller (Operational Wallet/Script)',
              example: 'Hot wallet for record updates',
              rationale: 'The address configured to update the actual records (addresses, text, content hash). This should be a segregated, hot wallet used only for maintenance or automated scripts.'
            }
          ]
        },
        {
          category: 'Change Control and Auditing',
          importance: 'critical',
          items: [
            {
              practice: 'Monitoring',
              example: 'Use Tenderly or Forta',
              rationale: 'Use block explorers and monitoring services to track transactions originating from the Controller address that target the ENS registry or resolver contracts. Alert on any record modification.'
            },
            {
              practice: 'Governance Approval',
              example: 'DAO vote → execution',
              rationale: 'For DAO-governed projects, all ENS record updates (especially address changes) must be initiated and executed through the DAO governance process.'
            },
            {
              practice: 'TTL (Time-to-Live)',
              example: 'Set to 600 seconds (10 minutes)',
              rationale: 'Set a reasonable TTL. While instant propagation is ideal, a small TTL allows clients to cache the results, reducing lookup frequency. For mission-critical records, ensure the TTL is low enough that any accidental change can be quickly corrected.'
            }
          ]
        }
      ]
    },
    {
      id: 'permissions',
      icon: Users,
      title: 'IV. Granular Permissions (ENSIP GNA)',
      description: 'Fine-grained, time-bound delegation for secure domain management',
      practices: [
        {
          category: 'Permission Delegation',
          importance: 'critical',
          items: [
            {
              practice: 'Use Granular Permissions Instead of Full Transfer',
              example: 'Grant SET_TEXT_RECORD only, not full ownership',
              rationale: 'Granular permissions allow you to delegate specific operations (like updating text records) without transferring full domain ownership. This maintains security while enabling operational flexibility.'
            },
            {
              practice: 'Always Set Expiration Dates',
              example: 'Set expiration to 90 days or less',
              rationale: 'Time-bound delegations automatically expire, preventing forgotten permissions from becoming security risks. Even for trusted delegates, set reasonable expiration dates.'
            },
            {
              practice: 'Grant Minimum Required Permissions',
              example: 'If delegate only needs to update text records, grant only SET_TEXT_RECORD',
              rationale: 'Follow the principle of least privilege. Only grant the specific permissions needed for the task. This limits the impact if a delegate is compromised.'
            },
            {
              practice: 'Lock Critical Delegates',
              example: 'Lock delegates managing production domains',
              rationale: 'Locking prevents accidental removal of critical delegates. Use this for production systems where continuity is essential.'
            }
          ]
        },
        {
          category: 'Permission Types',
          importance: 'high',
          items: [
            {
              practice: 'Subdomain Management',
              example: 'Grant MANAGE_SUBDOMAINS for automated subdomain creation',
              rationale: 'Use this for services that need to create subdomains programmatically. Separate from other permissions to limit scope.'
            },
            {
              practice: 'Record Updates',
              example: 'Grant SET_TEXT_RECORD and SET_ADDR_RECORD for metadata management',
              rationale: 'Common permissions for content managers or automated systems that update domain metadata without needing full control.'
            },
            {
              practice: 'Resolver Management',
              example: 'Grant SET_RESOLVER only when migrating resolvers',
              rationale: 'A rare permission that should only be granted temporarily during resolver migrations. Revoke immediately after migration.'
            },
            {
              practice: 'Owner Operations',
              example: 'Grant SET_OWNER only for emergency transfers',
              rationale: 'The most powerful permission. Only grant to highly trusted parties and always with short expiration dates.'
            }
          ]
        },
        {
          category: 'Security and Monitoring',
          importance: 'critical',
          items: [
            {
              practice: 'Monitor Delegate Activity',
              example: 'Set up alerts for delegate-initiated transactions',
              rationale: 'Track all operations performed by delegates. Use blockchain monitoring tools to detect unusual activity patterns.'
            },
            {
              practice: 'Use Emergency Pause',
              example: 'Pause node if suspicious activity detected',
              rationale: 'The emergency pause function immediately revokes all delegations. Use this as a first response to security incidents.'
            },
            {
              practice: 'Regular Permission Audits',
              example: 'Review all active delegates monthly',
              rationale: 'Periodically review all active delegates and their permissions. Remove expired or unnecessary delegations. Verify expiration dates are appropriate.'
            },
            {
              practice: 'Whitelist/Blacklist Management',
              example: 'Use whitelist for known-good addresses, blacklist for blocked addresses',
              rationale: 'Whitelist and blacklist provide additional layers of access control. Use whitelist mode for maximum security, blacklist for blocking specific addresses.'
            }
          ]
        },
        {
          category: 'Best Practices for Common Scenarios',
          importance: 'high',
          items: [
            {
              practice: 'Content Management Systems',
              example: 'Grant SET_TEXT_RECORD only, 30-day expiration',
              rationale: 'For systems that update metadata, grant only text record permissions with short expiration. Renew as needed.'
            },
            {
              practice: 'Automated Subdomain Creation',
              example: 'Grant MANAGE_SUBDOMAINS, 90-day expiration, locked',
              rationale: 'For services that create subdomains automatically, grant subdomain management permission with longer expiration and lock the delegate.'
            },
            {
              practice: 'Multi-Signature Wallets',
              example: 'Grant permissions to Safe wallet addresses',
              rationale: 'When delegating to multisig wallets, ensure the wallet itself is properly configured with appropriate thresholds.'
            },
            {
              practice: 'Temporary Access',
              example: 'Grant specific permissions with 7-day expiration for contractors',
              rationale: 'For temporary access needs, use short expiration dates. The granular system makes it easy to grant and automatically revoke access.'
            }
          ]
        }
      ]
    },
    {
      id: 'action-schema',
      icon: Layers,
      title: 'V. Action Schema System',
      description: 'Batch operations and custom action management using bracket notation',
      practices: [
        {
          category: 'Action File Organization',
          importance: 'high',
          items: [
            {
              practice: 'Use Clear File Naming',
              example: 'complete-domain-setup.txt, batch-metadata-update-2024-01.txt',
              rationale: 'Descriptive file names make it easy to identify action files and track changes over time. Include dates or version numbers for important files.'
            },
            {
              practice: 'Organize Actions Logically',
              example: 'Group domain setup, then metadata, then subdomains',
              rationale: 'Grouping related actions together makes files easier to read and maintain. Use comments to separate logical sections.'
            },
            {
              practice: 'Use Comments Liberally',
              example: '# Domain Setup section, # Permission bitmask explanation',
              rationale: 'Comments help explain complex operations and document the purpose of action sequences. They are especially important for delegation permissions.'
            }
          ]
        },
        {
          category: 'Syntax Best Practices',
          importance: 'critical',
          items: [
            {
              practice: 'Always Use Brackets for Values',
              example: 'setText: [example.eth]@domain@[description]@key = [My domain]@value',
              rationale: 'Brackets are required for the parser to correctly identify values. Missing brackets will cause parsing errors.'
            },
            {
              practice: 'Validate Addresses Before Use',
              example: 'Verify addresses on Etherscan before including in action files',
              rationale: 'Incorrect addresses can cause irreversible mistakes. Always verify addresses are correct and checksummed when possible.'
            },
            {
              practice: 'Use Full Domain Names',
              example: 'example.eth not just example',
              rationale: 'Always include the full domain name including the TLD (.eth). This prevents confusion and ensures correct resolution.'
            }
          ]
        },
        {
          category: 'Security Considerations',
          importance: 'critical',
          items: [
            {
              practice: 'Review Actions Before Execution',
              example: 'Check all domain names, addresses, and parameter values',
              rationale: 'Always review parsed actions before executing. Verify domain ownership, address validity, and permission settings. The audit log will show what was executed.'
            },
            {
              practice: 'Test with Small Batches First',
              example: 'Start with 2-3 actions, then scale up',
              rationale: 'Testing with small batches helps identify issues before executing large operations. Once confirmed working, you can scale up to larger batches.'
            },
            {
              practice: 'Use Templates for Repetitive Operations',
              example: 'Use pre-built templates or create custom ones',
              rationale: 'Templates reduce errors from manual entry and ensure consistency across operations. They also serve as documentation for common workflows.'
            },
            {
              practice: 'Verify Permissions Before Delegating',
              example: 'Check you have permission to delegate, verify delegate address, confirm permission levels',
              rationale: 'Delegation grants significant permissions. Always verify delegate addresses are correct and permission levels are appropriate for the task.'
            }
          ]
        },
        {
          category: 'Gas Optimization',
          importance: 'high',
          items: [
            {
              practice: 'Batch Related Operations',
              example: 'Group all metadata updates in one batch transaction',
              rationale: 'Batching multiple operations into a single transaction saves significant gas. Each additional action saves ~21,000 gas compared to individual transactions.'
            },
            {
              practice: 'Order Actions by Gas Cost',
              example: 'Text records first, then address records, then complex operations',
              rationale: 'While batching saves gas overall, ordering can help with gas estimation. Lower gas operations first can help identify issues early.'
            },
            {
              practice: 'Avoid Redundant Operations',
              example: 'Don\'t set the same value twice in one batch',
              rationale: 'Redundant operations waste gas and can cause confusion. Review your action file to ensure each operation is necessary.'
            }
          ]
        },
        {
          category: 'Template Usage',
          importance: 'high',
          items: [
            {
              practice: 'Start with Pre-built Templates',
              example: 'Use complete-domain-setup.txt, subdomain-structure.txt, etc.',
              rationale: 'Pre-built templates provide proven patterns for common operations. They are tested and follow best practices.'
            },
            {
              practice: 'Customize Templates for Your Needs',
              example: 'Copy template, replace variables, add/remove actions',
              rationale: 'Templates are starting points. Customize them to match your specific requirements while maintaining the underlying structure.'
            },
            {
              practice: 'Create Your Own Templates',
              example: 'Save frequently used action sequences as templates',
              rationale: 'For repetitive tasks specific to your project, create custom templates. This saves time and ensures consistency.'
            }
          ]
        },
        {
          category: 'Version Control',
          importance: 'medium',
          items: [
            {
              practice: 'Track Action Files in Version Control',
              example: 'Git commit action files with descriptive messages',
              rationale: 'Version control provides history, rollback capability, and documentation of changes. It is essential for production workflows.'
            },
            {
              practice: 'Document Changes',
              example: 'Include changelog comments in action files',
              rationale: 'Documenting changes helps track what was modified and why. This is especially important for complex action sequences.'
            },
            {
              practice: 'Backup Before Major Changes',
              example: 'Export current state, backup action files, document expected outcomes',
              rationale: 'Before executing major changes, create backups. This allows recovery if something goes wrong and provides a reference point.'
            }
          ]
        }
      ]
    }
  ];

  const filterSection = (section: typeof sections[0]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.practices.some(practice =>
        practice.category.toLowerCase().includes(query) ||
        practice.items?.some(item =>
          item.practice.toLowerCase().includes(query) ||
          item.example.toLowerCase().includes(query) ||
          item.rationale.toLowerCase().includes(query)
        ) ||
        practice.records?.some(record =>
          record.key.toLowerCase().includes(query) ||
          record.value.toLowerCase().includes(query) ||
          record.rationale.toLowerCase().includes(query)
        )
      )
    );
  };

  const filteredSections = sections.filter(filterSection);

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Critical Information</AlertTitle>
        <AlertDescription className="text-blue-800">
          Using ENS for contract naming is a security and usability best practice, but it must be done with meticulous attention to detail. Any misconfiguration can result in denial-of-service vulnerabilities or massive security risks.
        </AlertDescription>
      </Alert>

      {filteredSections.map((section) => (
        <Card key={section.id} className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <section.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-3">
              {section.practices.map((practice, practiceIndex) => (
                <AccordionItem
                  key={practiceIndex}
                  value={`practice-${section.id}-${practiceIndex}`}
                  className="border rounded-lg px-4 bg-white"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 w-full">
                      <span>{practice.category}</span>
                      <Badge
                        variant={practice.importance === 'critical' ? 'destructive' : practice.importance === 'high' ? 'default' : 'secondary'}
                        className="ml-auto"
                      >
                        {practice.importance}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    {practice.items?.map((item, itemIndex) => (
                      <div key={itemIndex} className="border-l-4 border-emerald-500 pl-4 py-2 space-y-2">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="space-y-2 flex-1">
                            <p className="text-slate-900">{item.practice}</p>
                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                              <p className="text-slate-700">
                                <span className="text-slate-500">Example:</span> {item.example}
                              </p>
                            </div>
                            <p className="text-slate-600">{item.rationale}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {practice.records && (
                      <div className="space-y-2">
                        <p className="text-slate-700">Recommended Text Records:</p>
                        {practice.records.map((record, recordIndex) => (
                          <div key={recordIndex} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-white">
                                {record.key}
                              </Badge>
                              <span className="text-slate-600">{record.value}</span>
                            </div>
                            <p className="text-slate-500 pl-2">{record.rationale}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}

      {filteredSections.length === 0 && searchQuery && (
        <Alert>
          <AlertDescription>
            No best practices found matching "{searchQuery}". Try a different search term.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
