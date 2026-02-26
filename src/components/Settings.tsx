import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { 
  Wallet, 
  Bell, 
  Shield, 
  Zap,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationService, NotificationConfig } from '../lib/services/notification-service';
import { addressDisplayService, AddressDisplayConfig, AddressDisplayFormat } from '../lib/services/address-display-service';
import { userConfigService, UserConfig } from '../lib/services/user-config-service';
import { useWeb3 } from '../lib/services';
import { auditLogService } from '../lib/security';
import { AIConfiguration } from './ai/AIConfiguration';
import { WalletConnectRainbow } from './WalletConnectRainbow';
import { BannerCustomization } from './BannerCustomization';

// Custom Toggle Button Component
function ToggleButton({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex gap-2 px-6">
      <button
        type="button"
        onClick={() => onCheckedChange(true)}
        className={`
          relative inline-flex items-center px-16 py-3 rounded-lg transition-all duration-200 font-medium text-sm shadow-sm border-2 border-black min-w-[200px] justify-center
          ${checked 
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
            : 'bg-white hover:bg-slate-50 text-slate-600'
          }
        `}
      >
        I want this
      </button>
      <button
        type="button"
        onClick={() => onCheckedChange(false)}
        className={`
          relative inline-flex items-center px-16 py-3 rounded-lg transition-all duration-200 font-medium text-sm shadow-sm border-2 border-black min-w-[200px] justify-center
          ${!checked 
            ? 'bg-red-100 hover:bg-red-200 text-red-700' 
            : 'bg-white hover:bg-slate-50 text-slate-600'
          }
        `}
      >
        I don't want this
      </button>
    </div>
  );
}

export function Settings() {
  const { address } = useWeb3();
  const [alertConfig, setAlertConfig] = useState<NotificationConfig>(notificationService.getConfig());
  const [addressConfig, setAddressConfig] = useState<AddressDisplayConfig>(addressDisplayService.getConfig());
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    setIsLoadingProfile(true);
    setAlertConfig(notificationService.getConfig());
    setAddressConfig(addressDisplayService.getConfig());
    if (address) {
      const config = userConfigService.getUserConfig(address);
      setUserConfig(config);
    } else {
      setUserConfig(null);
    }
    setIsLoadingProfile(false);
  }, [address]);

  const handleSaveSettings = () => {
    const oldAlertConfig = notificationService.getConfig();
    const oldAddressConfig = addressDisplayService.getConfig();
    const oldUserConfig = address ? userConfigService.getUserConfig(address) : null;

    // Track what changed
    const changes: string[] = [];
    if (JSON.stringify(oldAlertConfig) !== JSON.stringify(alertConfig)) {
      changes.push('notification settings');
    }
    if (JSON.stringify(oldAddressConfig) !== JSON.stringify(addressConfig)) {
      changes.push('address display settings');
    }
    if (oldUserConfig && userConfig && JSON.stringify(oldUserConfig) !== JSON.stringify(userConfig)) {
      changes.push('user configuration');
    }

    notificationService.saveConfig(alertConfig);
    addressDisplayService.saveConfig(addressConfig);
    if (address && userConfig) {
      userConfigService.setUserConfig(address, userConfig);
    }

    // Log settings save
    if (address && changes.length > 0) {
      auditLogService.trackAction('settings_saved', `Settings saved: ${changes.join(', ')}`, {
        actor: address,
        status: 'success',
        metadata: {
          changes,
          alertConfig,
          addressConfig,
          userConfig: userConfig ? {
            displayOptions: userConfig.displayOptions,
            auditLogEnabled: userConfig.auditLogEnabled,
            auditLogMaxEntries: userConfig.auditLogMaxEntries,
            notifications: userConfig.notifications,
          } : undefined,
        },
      });
    }

    toast.success('Settings saved successfully');
  };

  const updateAlertConfig = (updates: Partial<NotificationConfig>) => {
    setAlertConfig({ ...alertConfig, ...updates });
  };

  const updateAddressConfig = (updates: Partial<AddressDisplayConfig>) => {
    setAddressConfig({ ...addressConfig, ...updates });
  };

  const updateUserConfig = (updates: Partial<UserConfig>) => {
    if (userConfig) {
      setUserConfig({ ...userConfig, ...updates });
    }
  };

  const updateDisplayOptions = (updates: Partial<UserConfig['displayOptions']>) => {
    if (userConfig) {
      setUserConfig({
        ...userConfig,
        displayOptions: { ...userConfig.displayOptions, ...updates },
      });
    }
  };

  const handleExportData = (format: 'json' | 'csv') => {
    if (!address) {
      toast.error('Please connect a wallet to export data');
      return;
    }

    try {
      // Collect all data for the connected address
      const userConfigData = userConfigService.getUserConfig(address);
      const auditLogEntries = auditLogService.getEntries().filter(
        entry => entry.actor?.toLowerCase() === address.toLowerCase()
      );
      const notificationConfig = notificationService.getConfig();
      const addressDisplayConfig = addressDisplayService.getConfig();

      const exportData = {
        exportedAt: new Date().toISOString(),
        address: address,
        userConfiguration: userConfigData,
        auditLog: {
          entries: auditLogEntries,
          totalEntries: auditLogEntries.length,
        },
        notificationSettings: notificationConfig,
        addressDisplaySettings: addressDisplayConfig,
      };

      if (format === 'json') {
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ens-tools-export-${address.slice(0, 10)}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Data exported successfully as JSON');
      } else {
        // CSV format
        const csvLines: string[] = [];
        
        // CSV Header
        csvLines.push('Section,Field,Value');
        
        // User Configuration
        csvLines.push(`User Configuration,Address,"${address}"`);
        csvLines.push(`User Configuration,Theme,"${userConfigData.displayOptions.theme}"`);
        csvLines.push(`User Configuration,Compact Mode,"${userConfigData.displayOptions.compactMode}"`);
        csvLines.push(`User Configuration,Show Advanced,"${userConfigData.displayOptions.showAdvanced}"`);
        csvLines.push(`User Configuration,Refresh Interval,"${userConfigData.displayOptions.refreshInterval}"`);
        csvLines.push(`User Configuration,Audit Log Enabled,"${userConfigData.auditLogEnabled}"`);
        csvLines.push(`User Configuration,Audit Log Max Entries,"${userConfigData.auditLogMaxEntries}"`);
        
        // Domain Groups
        userConfigData.domainGroups.forEach((group, index) => {
          csvLines.push(`Domain Groups,Group ${index + 1},"${group.name} (${group.color})"`);
        });
        
        // Domain Assignments
        userConfigData.domainAssignments.forEach((assignment) => {
          csvLines.push(`Domain Assignments,"${assignment.domainName}","Group: ${assignment.groupId || 'None'}, Project: ${assignment.project || 'None'}"`);
        });
        
        // Notification Settings
        csvLines.push(`Notifications,Enabled,"${notificationConfig.enabled}"`);
        csvLines.push(`Notifications,Email Enabled,"${notificationConfig.emailEnabled}"`);
        csvLines.push(`Notifications,Webhook Enabled,"${notificationConfig.webhookEnabled}"`);
        csvLines.push(`Notifications,On Expiration,"${notificationConfig.notifyOnExpiration}"`);
        csvLines.push(`Notifications,On Security Events,"${notificationConfig.notifyOnSecurityEvents}"`);
        csvLines.push(`Notifications,On Metadata Changes,"${notificationConfig.notifyOnMetadataChanges}"`);
        csvLines.push(`Notifications,On Failed Transactions,"${notificationConfig.notifyOnFailedTransactions}"`);
        
        // Address Display Settings
        csvLines.push(`Address Display,Format,"${addressDisplayConfig.format}"`);
        csvLines.push(`Address Display,Resolve ENS,"${addressDisplayConfig.resolveENS}"`);
        
        // Audit Log Entries
        csvLines.push(`Audit Log,Total Entries,"${auditLogEntries.length}"`);
        auditLogEntries.forEach((entry) => {
          csvLines.push(`Audit Log Entry,"${entry.timestamp.toISOString()}","${entry.action} - ${entry.details.replace(/"/g, '""')}"`);
        });

        const csvString = csvLines.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ens-tools-export-${address.slice(0, 10)}-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Data exported successfully as CSV');
      }
      
      // Log the export action
      auditLogService.trackAction('settings_saved', 'Exported all data', {
        actor: address,
        status: 'success',
        metadata: { format, entriesCount: auditLogEntries.length },
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data. Please try again.');
    }
  };

  if (!address) {
    return (
      <div className="space-y-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight">settings</h1>
          <div className="flex items-center justify-between gap-6">
            <p className="text-lg text-gray-600 leading-relaxed">Configure system preferences and security options</p>
            <div className="web3-glow">
              <WalletConnectRainbow />
            </div>
          </div>
        </div>
        <Alert className="border-2 border-amber-200 bg-amber-50 rounded-xl p-6">
          <div className="h-6 w-6 rounded-lg bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <AlertDescription className="text-base text-amber-800 leading-relaxed">
            Please connect a wallet to access user-specific settings. Some settings are available without a wallet connection.
          </AlertDescription>
        </Alert>
        <Tabs defaultValue="display" className="space-y-6">
          <TabsList>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
          </TabsList>
          {/* Show only non-wallet-dependent tabs */}
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight">Settings</h1>
          <p className="text-lg text-gray-600 leading-relaxed">Configure system preferences and security options</p>
        </div>
        <Button onClick={handleSaveSettings} size="lg" className="px-6">
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="wallets" className="w-full">
        <div className="flex gap-6 items-start">
          <div className="flex-shrink-0">
            <TabsList className="flex flex-col h-[calc(100vh-200px)] w-72 bg-white border border-gray-200 rounded-xl p-3 shadow-sm justify-start gap-1">
              <TabsTrigger value="wallets" className="w-full justify-start px-4 py-3 text-base font-medium">Wallets & Access</TabsTrigger>
              <TabsTrigger value="notifications" className="w-full justify-start px-4 py-3 text-base font-medium">Notifications</TabsTrigger>
              <TabsTrigger value="display" className="w-full justify-start px-4 py-3 text-base font-medium">Display</TabsTrigger>
              <TabsTrigger value="ai" className="w-full justify-start px-4 py-3 text-base font-medium">AI Settings</TabsTrigger>
              <TabsTrigger value="preferences" className="w-full justify-start px-4 py-3 text-base font-medium">Preferences</TabsTrigger>
              <TabsTrigger value="security" className="w-full justify-start px-4 py-3 text-base font-medium">Security</TabsTrigger>
              <TabsTrigger value="automation" className="w-full justify-start px-4 py-3 text-base font-medium">Automation</TabsTrigger>
              <TabsTrigger value="ai" className="w-full justify-start px-4 py-3 text-base font-medium">AI Settings</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 flex flex-col space-y-6 ml-4 float-right">

          {/* Wallets & Access */}
          <TabsContent value="wallets" className="space-y-8 mt-0">
          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader className="pb-4 border-b border-gray-100">
              <CardTitle className="text-xl font-bold mb-2">Connected Wallets</CardTitle>
              <CardDescription>Manage wallet access and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="p-6 border-2 border-gray-200 rounded-xl bg-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                      <Wallet className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900 mb-1">Primary Wallet</p>
                      <p className="text-sm text-gray-600 font-mono">0x742d...35a3</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                    <Button variant="outline" size="sm">Disconnect</Button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-2 border-gray-200 rounded-xl bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-300 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-slate-700">Controller Wallet</p>
                      <p className="text-slate-600">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>

              <Alert className="border-2 border-blue-200 bg-blue-50 rounded-xl p-5">
                <div className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <AlertDescription className="text-base text-blue-800 leading-relaxed">
                  Best Practice: Use separate wallets for Owner (cold storage) and Controller (hot wallet) roles
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader className="pb-4 border-b border-gray-100">
              <CardTitle className="text-xl font-bold mb-2">Multisig Configuration</CardTitle>
              <CardDescription className="text-base">Configure Gnosis Safe integration for critical operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <Label htmlFor="multisig-address" className="text-base font-semibold">Multisig Safe Address</Label>
                <Input 
                  id="multisig-address" 
                  placeholder="0x..."
                  defaultValue="0x742d35Cc6634C0532925a3b844Bc9e7595f35a3"
                  className="h-11"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="threshold" className="text-base font-semibold">Signature Threshold</Label>
                <Input 
                  id="threshold" 
                  type="number"
                  placeholder="3"
                  defaultValue="3"
                />
                <p className="text-slate-600">Number of signatures required (e.g., 3 of 5)</p>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Require multisig for fuse burning</p>
                  <p className="text-slate-600">All fuse operations must be approved by multisig</p>
                </div>
                <ToggleButton checked={true} onCheckedChange={() => {}} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Require multisig for resolver changes</p>
                  <p className="text-slate-600">Resolver updates must be approved by multisig</p>
                </div>
                <ToggleButton checked={true} onCheckedChange={() => {}} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6 mt-0">
          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader className="pb-4 border-b border-gray-100">
              <CardTitle className="text-xl font-bold mb-2">Notification Channels</CardTitle>
              <CardDescription className="text-base">Choose how to receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Enable email notifications</p>
                  <p className="text-slate-600">Send alerts via email</p>
                </div>
                <ToggleButton 
                  checked={alertConfig.emailEnabled}
                  onCheckedChange={(checked) => updateAlertConfig({ emailEnabled: checked })}
                />
              </div>

                {alertConfig.emailEnabled && (
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-base font-semibold">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="admin@company.com"
                    value={alertConfig.emailAddress || ''}
                    onChange={(e) => updateAlertConfig({ emailAddress: e.target.value })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Enable webhook notifications</p>
                  <p className="text-slate-600">Send alerts to webhook (Slack, Discord, etc.)</p>
                </div>
                <ToggleButton 
                  checked={alertConfig.webhookEnabled}
                  onCheckedChange={(checked) => updateAlertConfig({ webhookEnabled: checked })}
                />
              </div>

              {alertConfig.webhookEnabled && (
                <div className="space-y-3">
                  <Label htmlFor="webhook" className="text-base font-semibold">Webhook URL</Label>
                  <Input 
                    id="webhook" 
                    placeholder="https://hooks.slack.com/..."
                    value={alertConfig.webhookUrl || ''}
                    onChange={(e) => updateAlertConfig({ webhookUrl: e.target.value })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">In-app notifications</p>
                  <p className="text-slate-600">Show alerts in the dashboard</p>
                </div>
                <ToggleButton 
                  checked={alertConfig.enabled}
                  onCheckedChange={(checked) => updateAlertConfig({ enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Alert Display Settings</CardTitle>
              <CardDescription>Configure how alerts appear in the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <Label htmlFor="alert-duration" className="text-base font-semibold">Alert Duration (seconds)</Label>
                <Input 
                  id="alert-duration" 
                  type="number"
                  placeholder="15"
                  value={alertConfig.alertDuration / 1000}
                  onChange={(e) => updateAlertConfig({ alertDuration: Number(e.target.value) * 1000 })}
                />
                <p className="text-slate-600">How long alerts remain visible</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="max-alerts" className="text-base font-semibold">Maximum Visible Alerts</Label>
                <Input 
                  id="max-alerts" 
                  type="number"
                  placeholder="5"
                  value={alertConfig.maxVisibleAlerts}
                  onChange={(e) => updateAlertConfig({ maxVisibleAlerts: Number(e.target.value) })}
                />
                <p className="text-slate-600">Maximum number of alerts stacked on screen</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="alert-position" className="text-base font-semibold">Alert Position</Label>
                <Select 
                  value={alertConfig.alertPosition}
                  onValueChange={(value: any) => updateAlertConfig({ alertPosition: value })}
                >
                  <SelectTrigger id="alert-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-slate-600">Where alerts appear on screen</p>
              </div>
            </CardContent>
          </Card>

          <BannerCustomization />

          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader className="pb-4 border-b border-gray-100">
              <CardTitle className="text-xl font-bold mb-2">Alert Preferences</CardTitle>
              <CardDescription className="text-base">Configure which events trigger notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Domain expiration warnings</p>
                  <p className="text-slate-600">Alert 90, 30, and 7 days before expiration</p>
                </div>
                <ToggleButton 
                  checked={alertConfig.notifyOnExpiration}
                  onCheckedChange={(checked) => updateAlertConfig({ notifyOnExpiration: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Security events</p>
                  <p className="text-slate-600">Notify on resolver changes, fuse burns, transfers</p>
                </div>
                <ToggleButton 
                  checked={alertConfig.notifyOnSecurityEvents}
                  onCheckedChange={(checked) => updateAlertConfig({ notifyOnSecurityEvents: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Metadata changes</p>
                  <p className="text-slate-600">Notify when records are updated</p>
                </div>
                <ToggleButton 
                  checked={alertConfig.notifyOnMetadataChanges}
                  onCheckedChange={(checked) => updateAlertConfig({ notifyOnMetadataChanges: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Failed transactions</p>
                  <p className="text-slate-600">Alert when transactions fail or revert</p>
                </div>
                <ToggleButton 
                  checked={alertConfig.notifyOnFailedTransactions}
                  onCheckedChange={(checked) => updateAlertConfig({ notifyOnFailedTransactions: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Display */}
          <TabsContent value="display" className="space-y-6 mt-0">
          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Address Display Settings</CardTitle>
              <CardDescription>Configure how Ethereum addresses are displayed throughout the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Address Display Format</Label>
                <RadioGroup 
                  value={addressConfig.format}
                  onValueChange={(value: AddressDisplayFormat) => updateAddressConfig({ format: value })}
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="abbreviated" id="format-abbreviated" />
                    <Label htmlFor="format-abbreviated" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-900">Abbreviated</p>
                          <p className="text-slate-600">Show shortened addresses (0x742d...35a3)</p>
                        </div>
                        <Badge variant="outline">Default</Badge>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="full" id="format-full" />
                    <Label htmlFor="format-full" className="flex-1 cursor-pointer">
                      <div>
                        <p className="text-slate-900">Full Address</p>
                        <p className="text-slate-600">Show complete 42-character addresses</p>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="ens-name" id="format-ens" />
                    <Label htmlFor="format-ens" className="flex-1 cursor-pointer">
                      <div>
                        <p className="text-slate-900">ENS Name</p>
                        <p className="text-slate-600">Show ENS names when available, fallback to abbreviated</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Enable ENS Resolution</p>
                  <p className="text-slate-600">Automatically resolve addresses to ENS names</p>
                </div>
                <ToggleButton 
                  checked={addressConfig.resolveENS}
                  onCheckedChange={(checked) => updateAddressConfig({ resolveENS: checked })}
                />
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <Eye className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Preview: An address will display as <code className="px-1 py-0.5 bg-white rounded">
                    {addressConfig.format === 'full' ? '0x742d35Cc6634C0532925a3b844Bc9e7595f35a3' : 
                     addressConfig.format === 'ens-name' ? 'vitalik.eth' : 
                     '0x742d...35a3'}
                  </code>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Theme & Appearance</CardTitle>
              <CardDescription>Customize the application theme and display preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <Label htmlFor="theme" className="text-base font-semibold">Theme</Label>
                <Select
                  value={userConfig?.displayOptions.theme || 'light'}
                  onValueChange={(value: 'light' | 'dark' | 'auto') => updateDisplayOptions({ theme: value })}
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-slate-600">Choose between light, dark, or system theme</p>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Compact Mode</p>
                  <p className="text-slate-600">Reduce spacing and padding for a denser layout</p>
                </div>
                <ToggleButton
                  checked={userConfig?.displayOptions.compactMode || false}
                  onCheckedChange={(checked) => updateDisplayOptions({ compactMode: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Show Advanced Options</p>
                  <p className="text-slate-600">Display advanced configuration options throughout the app</p>
                </div>
                <ToggleButton
                  checked={userConfig?.displayOptions.showAdvanced || false}
                  onCheckedChange={(checked) => updateDisplayOptions({ showAdvanced: checked })}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="refresh-interval" className="text-base font-semibold">Data Refresh Interval (ms)</Label>
                <Input
                  id="refresh-interval"
                  type="number"
                  placeholder="30000"
                  value={userConfig?.displayOptions.refreshInterval || 30000}
                  onChange={(e) => updateDisplayOptions({ refreshInterval: Number(e.target.value) })}
                />
                <p className="text-sm text-gray-600 leading-relaxed">How often to automatically refresh data (default: 30000ms = 30 seconds)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Console Colors</CardTitle>
              <CardDescription>Customize the color scheme for the developer console</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="console-bg">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="console-bg"
                      type="color"
                      value={userConfig?.consoleColors?.background || '#3a3a3a'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              background: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="h-10 w-20"
                    />
                    <Input
                      type="text"
                      value={userConfig?.consoleColors?.background || '#3a3a3a'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              background: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="flex-1 font-mono text-sm"
                      placeholder="#3a3a3a"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="console-header-bg">Header Background</Label>
                  <div className="flex gap-2">
                    <Input
                      id="console-header-bg"
                      type="color"
                      value={userConfig?.consoleColors?.headerBackground || '#4a4a4a'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              headerBackground: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="h-10 w-20"
                    />
                    <Input
                      type="text"
                      value={userConfig?.consoleColors?.headerBackground || '#4a4a4a'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              headerBackground: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="flex-1 font-mono text-sm"
                      placeholder="#4a4a4a"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="console-border">Border Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="console-border"
                      type="color"
                      value={userConfig?.consoleColors?.border || '#5a5a5a'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              border: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="h-10 w-20"
                    />
                    <Input
                      type="text"
                      value={userConfig?.consoleColors?.border || '#5a5a5a'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              border: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="flex-1 font-mono text-sm"
                      placeholder="#5a5a5a"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="console-text">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="console-text"
                      type="color"
                      value={userConfig?.consoleColors?.text || '#f5f5f5'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              text: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="h-10 w-20"
                    />
                    <Input
                      type="text"
                      value={userConfig?.consoleColors?.text || '#f5f5f5'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              text: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="flex-1 font-mono text-sm"
                      placeholder="#f5f5f5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="console-text-secondary">Secondary Text</Label>
                  <div className="flex gap-2">
                    <Input
                      id="console-text-secondary"
                      type="color"
                      value={userConfig?.consoleColors?.textSecondary || '#d0d0d0'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              textSecondary: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="h-10 w-20"
                    />
                    <Input
                      type="text"
                      value={userConfig?.consoleColors?.textSecondary || '#d0d0d0'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              textSecondary: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="flex-1 font-mono text-sm"
                      placeholder="#d0d0d0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="console-active-tab">Active Tab Background</Label>
                  <div className="flex gap-2">
                    <Input
                      id="console-active-tab"
                      type="color"
                      value={userConfig?.consoleColors?.activeTab || '#3a3a3a'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              activeTab: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="h-10 w-20"
                    />
                    <Input
                      type="text"
                      value={userConfig?.consoleColors?.activeTab || '#3a3a3a'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              activeTab: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="flex-1 font-mono text-sm"
                      placeholder="#3a3a3a"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="console-input-bg">Input Background</Label>
                  <div className="flex gap-2">
                    <Input
                      id="console-input-bg"
                      type="color"
                      value={userConfig?.consoleColors?.inputBackground || '#2d2d2d'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              inputBackground: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="h-10 w-20"
                    />
                    <Input
                      type="text"
                      value={userConfig?.consoleColors?.inputBackground || '#2d2d2d'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              inputBackground: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="flex-1 font-mono text-sm"
                      placeholder="#2d2d2d"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="console-input-border">Input Border</Label>
                  <div className="flex gap-2">
                    <Input
                      id="console-input-border"
                      type="color"
                      value={userConfig?.consoleColors?.inputBorder || '#5a5a5a'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              inputBorder: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="h-10 w-20"
                    />
                    <Input
                      type="text"
                      value={userConfig?.consoleColors?.inputBorder || '#5a5a5a'}
                      onChange={(e) => {
                        if (userConfig) {
                          setUserConfig({
                            ...userConfig,
                            consoleColors: {
                              ...userConfig.consoleColors,
                              inputBorder: e.target.value,
                            } as UserConfig['consoleColors'],
                          });
                        }
                      }}
                      className="flex-1 font-mono text-sm"
                      placeholder="#5a5a5a"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (userConfig) {
                      setUserConfig({
                        ...userConfig,
                        consoleColors: {
                          background: '#3a3a3a',
                          headerBackground: '#4a4a4a',
                          border: '#5a5a5a',
                          text: '#f5f5f5',
                          textSecondary: '#d0d0d0',
                          activeTab: '#3a3a3a',
                          inactiveTab: '#5a5a5a',
                          inputBackground: '#2d2d2d',
                          inputBorder: '#5a5a5a',
                        },
                      });
                    }
                  }}
                >
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences" className="space-y-6 mt-0">
          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Transaction Preferences</CardTitle>
              <CardDescription>Default settings for blockchain transactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <Label htmlFor="default-gas-limit">Default Gas Limit</Label>
                <Input
                  id="default-gas-limit"
                  type="number"
                  placeholder="200000"
                />
                <p className="text-slate-600">Default gas limit for transactions (leave empty to auto-estimate)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gas-price-multiplier">Gas Price Multiplier</Label>
                <Input
                  id="gas-price-multiplier"
                  type="number"
                  step="0.1"
                  placeholder="1.2"
                  defaultValue="1.2"
                />
                <p className="text-slate-600">Multiply estimated gas price by this factor (1.2 = 20% higher)</p>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Require transaction confirmation</p>
                  <p className="text-slate-600">Always show confirmation dialog before submitting transactions</p>
                </div>
                <ToggleButton checked={true} onCheckedChange={() => {}} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Default Resolver</CardTitle>
              <CardDescription>Preferred resolver for new records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <Label htmlFor="default-resolver">Resolver Address</Label>
                <Input
                  id="default-resolver"
                  placeholder="0x..."
                />
                <p className="text-slate-600">Default resolver address to use for new records (leave empty to use ENS default)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Data & Export</CardTitle>
              <CardDescription>Export all your data in JSON or CSV format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline"
                    onClick={() => handleExportData('json')}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export All Data (JSON)
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleExportData('csv')}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export All Data (CSV)
                  </Button>
                </div>
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Export files contain all your configuration data, domain assignments, groups, and audit logs. Private keys are never included.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6 mt-0">
          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Security Monitoring</CardTitle>
              <CardDescription>Configure real-time security scanning and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Continuous monitoring</p>
                  <p className="text-slate-600">Monitor all ENS transactions in real-time</p>
                </div>
                <ToggleButton checked={true} onCheckedChange={() => {}} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Anomaly detection</p>
                  <p className="text-slate-600">Flag unusual patterns and unauthorized changes</p>
                </div>
                <ToggleButton checked={true} onCheckedChange={() => {}} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Require DAO approval for critical changes</p>
                  <p className="text-slate-600">Address changes must go through governance</p>
                </div>
                <ToggleButton checked={true} onCheckedChange={() => {}} />
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Security monitoring uses third-party services (Tenderly, Forta) which may incur additional costs
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Change Control</CardTitle>
              <CardDescription>TTL and caching configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <Label htmlFor="ttl">Default TTL (Time-to-Live)</Label>
                <Input 
                  id="ttl" 
                  type="number"
                  placeholder="600"
                  defaultValue="600"
                />
                <p className="text-slate-600">Seconds (600 = 10 minutes recommended for mission-critical records)</p>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Change request approval workflow</p>
                  <p className="text-slate-600">All changes require explicit approval before execution</p>
                </div>
                <ToggleButton checked={false} onCheckedChange={() => {}} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Audit all record changes</p>
                  <p className="text-slate-600">Log every metadata update to audit trail</p>
                </div>
                <ToggleButton checked={true} onCheckedChange={() => {}} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Audit Log Settings</CardTitle>
              <CardDescription>Configure audit logging behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Enable audit logging</p>
                  <p className="text-slate-600">Track all user actions and system events</p>
                </div>
                <ToggleButton
                  checked={userConfig?.auditLogEnabled !== false}
                  onCheckedChange={(checked) => updateUserConfig({ auditLogEnabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audit-log-max">Maximum Audit Log Entries</Label>
                <Input
                  id="audit-log-max"
                  type="number"
                  placeholder="1000"
                  value={userConfig?.auditLogMaxEntries || 1000}
                  onChange={(e) => updateUserConfig({ auditLogMaxEntries: Number(e.target.value) })}
                />
                <p className="text-slate-600">Maximum number of entries to keep in audit log (older entries are removed)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Audit Log Settings</CardTitle>
              <CardDescription>Configure audit logging behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Enable audit logging</p>
                  <p className="text-slate-600">Track all user actions and system events</p>
                </div>
                <Switch
                  checked={userConfig?.auditLogEnabled !== false}
                  onCheckedChange={(checked: boolean) => updateUserConfig({ auditLogEnabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audit-log-max">Maximum Audit Log Entries</Label>
                <Input
                  id="audit-log-max"
                  type="number"
                  placeholder="1000"
                  value={userConfig?.auditLogMaxEntries || 1000}
                  onChange={(e) => updateUserConfig({ auditLogMaxEntries: Number(e.target.value) })}
                />
                <p className="text-slate-600">Maximum number of entries to keep in audit log (older entries are removed)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Automation */}
          <TabsContent value="automation" className="space-y-6 mt-0">
          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Automated Renewals</CardTitle>
              <CardDescription>Configure gasless renewal automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Enable automatic renewals</p>
                  <p className="text-slate-600">Renew domains automatically before expiration</p>
                </div>
                <ToggleButton checked={true} onCheckedChange={() => {}} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewal-buffer">Renewal Buffer Period</Label>
                <Input 
                  id="renewal-buffer" 
                  type="number"
                  placeholder="30"
                  defaultValue="30"
                />
                <p className="text-slate-600">Days before expiration to trigger renewal</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewal-duration">Default Renewal Duration</Label>
                <Input 
                  id="renewal-duration" 
                  type="number"
                  placeholder="1"
                  defaultValue="1"
                />
                <p className="text-slate-600">Years to renew for</p>
              </div>

              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">
                  Automated renewals use specialized contracts to reduce gas costs through batching
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle>Integration Services</CardTitle>
              <CardDescription>Third-party monitoring and automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-slate-900">Tenderly Monitoring</p>
                      <p className="text-slate-600">Real-time transaction monitoring and alerts</p>
                    </div>
                  </div>
                  <ToggleButton checked={true} onCheckedChange={() => {}} />
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-slate-900">Forta Security Agents</p>
                      <p className="text-slate-600">Automated threat detection</p>
                    </div>
                  </div>
                  <ToggleButton checked={true} onCheckedChange={() => {}} />
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-slate-900">Gelato Network</p>
                      <p className="text-slate-600">Automated renewal execution</p>
                    </div>
                  </div>
                  <ToggleButton checked={false} onCheckedChange={() => {}} />
                </div>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai" className="space-y-6 mt-0">
            <AIConfiguration />
          </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
