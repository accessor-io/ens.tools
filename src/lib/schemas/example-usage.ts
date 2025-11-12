/**
 * Example Usage of ENS Console Schema System
 * 
 * This file demonstrates how to use the schema system for various ENS operations
 */

import {
  // Schema definitions
  ENS_CONSOLE_SCHEMA,
  getActionSchema,
  getAllActions,
  
  // Parsing
  parseAction,
  parseAndValidateAction,
  parseActions,
  
  // Templates
  getTemplate,
  generateProfilesFromTemplate,
  createTemplateFromActions,
  
  // Export
  exportProfiles,
  buildCustomSchema,
  exportDataPoint,
  
  // Patterns
  ACTION_PATTERNS,
  createActionFromPattern,
} from './index';

// ========== Example 1: Parse Single Action ==========
export function example1_ParseSingleAction() {
  const actionString = '+mintSubdomain: [app]@subname@[example.eth]@parent';
  
  // Parse without validation
  const parsed = parseAction(actionString);
  console.log('Parsed action:', parsed);
  // Output:
  // {
  //   action: 'mintSubdomain',
  //   operator: '+',
  //   parameters: { subname: 'app', parent: 'example.eth' },
  //   raw: '+mintSubdomain: [app]@subname@[example.eth]@parent'
  // }
  
  // Parse with validation
  const validated = parseAndValidateAction(actionString);
  console.log('Validated action:', validated);
  // Includes schema information
}

// ========== Example 2: Parse Multiple Actions ==========
export function example2_ParseMultipleActions() {
  const actionsString = `
+mintSubdomain: [app]@subname@[example.eth]@parent = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@owner
setText: [example.eth]@domain@[description]@key = [My awesome domain]@value
setText: [example.eth]@domain@[url]@key = [https://example.com]@value
+delegateTo: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate@[7]@permissions
  `;
  
  const actions = parseActions(actionsString);
  console.log(`Parsed ${actions.length} actions`);
}

// ========== Example 3: Use Templates ==========
export function example3_UseTemplates() {
  // Get a template
  const template = getTemplate('setup-new-domain');
  if (!template) {
    console.error('Template not found');
    return;
  }
  
  // Generate profiles for multiple domains
  const profiles = generateProfilesFromTemplate(
    template,
    ['example1.eth', 'example2.eth', 'example3.eth'],
    {
      'example1.eth': {
        address: '0x1234567890123456789012345678901234567890',
        description: 'First example domain',
        url: 'https://example1.com',
      },
      'example2.eth': {
        address: '0x0987654321098765432109876543210987654321',
        description: 'Second example domain',
        url: 'https://example2.com',
      },
    }
  );
  
  console.log(`Generated ${profiles.length} profiles`);
  return profiles;
}

// ========== Example 4: Export to Custom Schema ==========
export function example4_ExportToSchema() {
  const profiles = example3_UseTemplates();
  if (!profiles) return;
  
  // Export to bracket notation
  const bracketExport = exportProfiles(profiles, { format: 'bracket' });
  console.log('Bracket notation:', bracketExport.content);
  
  // Export to JSON
  const jsonExport = exportProfiles(profiles, {
    format: 'json',
    includeMetadata: true,
  });
  console.log('JSON export:', jsonExport.content);
  
  // Export to YAML
  const yamlExport = exportProfiles(profiles, { format: 'yaml' });
  console.log('YAML export:', yamlExport.content);
}

// ========== Example 5: Create Custom Template ==========
export function example5_CreateCustomTemplate() {
  const actions = [
    parseAction('setText: [example.eth]@domain@[description]@key = [My domain]@value'),
    parseAction('setText: [example.eth]@domain@[url]@key = [https://example.com]@value'),
    parseAction('setText: [example.eth]@domain@[com.twitter]@key = [@example]@value'),
  ];
  
  const template = createTemplateFromActions(
    'social-media-setup',
    'Social Media Setup',
    'Set up social media links for a domain',
    'metadata',
    actions
  );
  
  console.log('Created template:', template);
  return template;
}

// ========== Example 6: Use Action Patterns ==========
export function example6_UseActionPatterns() {
  // Create action from pattern
  const action = createActionFromPattern(ACTION_PATTERNS.setText, {
    domain: 'example.eth',
    key: 'description',
    value: 'My awesome domain',
  });
  
  console.log('Generated action:', action);
  // Output: setText: [example.eth]@domain@[description]@key = [My awesome domain]@value
  
  // Parse it
  const parsed = parseAction(action);
  console.log('Parsed:', parsed);
}

// ========== Example 7: Export Data Point ==========
export function example7_ExportDataPoint() {
  const exported = exportDataPoint(
    'example.eth',
    'setText',
    {
      domain: 'example.eth',
      key: 'description',
      value: 'My domain description',
    },
    '='
  );
  
  console.log('Exported data point:', exported);
}

// ========== Example 8: Batch Operations ==========
export function example8_BatchOperations() {
  const domains = ['domain1.eth', 'domain2.eth', 'domain3.eth'];
  const actions: string[] = [];
  
  // Generate same actions for all domains
  for (const domain of domains) {
    actions.push(
      createActionFromPattern(ACTION_PATTERNS.setText, {
        domain,
        key: 'description',
        value: `Description for ${domain}`,
      })
    );
    actions.push(
      createActionFromPattern(ACTION_PATTERNS.setAddress, {
        domain,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      })
    );
  }
  
  // Parse all actions
  const parsedActions = parseActions(actions.join('\n'));
  
  // Build custom schema
  const schema = buildCustomSchema(parsedActions, true);
  console.log('Custom schema:', schema.schema);
}

// ========== Example 9: Delegation with Permissions ==========
export function example9_Delegation() {
  // Using permission keys
  const delegateAction = `
delegateAuthSelect: [example.eth]@domain@[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate = [MANAGE_SUBDOMAINS,SET_TEXT_RECORD]@permissionKeys
  `;
  
  const parsed = parseAndValidateAction(delegateAction.trim());
  console.log('Delegation action:', parsed);
  
  // Using permission bitmask
  const delegateAction2 = `
+delegateTo: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate@[7]@permissions
  `;
  
  const parsed2 = parseAndValidateAction(delegateAction2.trim());
  console.log('Delegation with bitmask:', parsed2);
}

// ========== Example 10: Complete Workflow ==========
export function example10_CompleteWorkflow() {
  // 1. Define actions for a domain
  const actionsString = `
+wrap: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@owner
setResolver: [example.eth]@domain = [0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63]@resolver
setAddr: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@address
setText: [example.eth]@domain@[description]@key = [My domain]@value
setText: [example.eth]@domain@[url]@key = [https://example.com]@value
+mintSubdomain: [app]@subname@[example.eth]@parent = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@owner
+delegateTo: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate@[7]@permissions
  `;
  
  // 2. Parse and validate
  const actions = parseActions(actionsString);
  console.log(`Parsed ${actions.length} actions`);
  
  // 3. Create profile
  const profile = {
    domain: 'example.eth',
    actions,
    metadata: {
      created: new Date().toISOString(),
      purpose: 'Complete domain setup',
    },
  };
  
  // 4. Export to schema
  const exported = exportProfiles([profile], {
    format: 'json',
    includeMetadata: true,
  });
  
  console.log('Exported schema:', exported.content);
  
  return { profile, exported };
}

// Run examples (uncomment to test)
// example1_ParseSingleAction();
// example2_ParseMultipleActions();
// example3_UseTemplates();
// example4_ExportToSchema();
// example5_CreateCustomTemplate();
// example6_UseActionPatterns();
// example7_ExportDataPoint();
// example8_BatchOperations();
// example9_Delegation();
// example10_CompleteWorkflow();








