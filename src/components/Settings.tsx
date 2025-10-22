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
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationService, NotificationConfig } from '../lib/notification-service';
import { addressDisplayService, AddressDisplayConfig, AddressDisplayFormat } from '../lib/address-display-service';

export function Settings() {
  const [alertConfig, setAlertConfig] = useState<NotificationConfig>(notificationService.getConfig());
  const [addressConfig, setAddressConfig] = useState<AddressDisplayConfig>(addressDisplayService.getConfig());

  useEffect(() => {
    setAlertConfig(notificationService.getConfig());
    setAddressConfig(addressDisplayService.getConfig());
  }, []);

  const handleSaveSettings = () => {
    notificationService.saveConfig(alertConfig);
    addressDisplayService.saveConfig(addressConfig);
    toast.success('Settings saved successfully');
  };

  const updateAlertConfig = (updates: Partial<NotificationConfig>) => {
    setAlertConfig({ ...alertConfig, ...updates });
  };

  const updateAddressConfig = (updates: Partial<AddressDisplayConfig>) => {
    setAddressConfig({ ...addressConfig, ...updates });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Settings</h2>
          <p className="text-slate-600">Configure system preferences and security options</p>
        </div>
        <Button onClick={handleSaveSettings}>
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="wallets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="wallets">Wallets & Access</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        {/* Wallets & Access */}
        <TabsContent value="wallets" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Connected Wallets</CardTitle>
              <CardDescription>Manage wallet access and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-slate-900">Primary Wallet</p>
                      <p className="text-slate-600 font-mono">0x742d...35a3</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                    <Button variant="outline" size="sm">Disconnect</Button>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
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

              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Best Practice: Use separate wallets for Owner (cold storage) and Controller (hot wallet) roles
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Multisig Configuration</CardTitle>
              <CardDescription>Configure Gnosis Safe integration for critical operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="multisig-address">Multisig Safe Address</Label>
                <Input 
                  id="multisig-address" 
                  placeholder="0x..."
                  defaultValue="0x742d35Cc6634C0532925a3b844Bc9e7595f35a3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Signature Threshold</Label>
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
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Require multisig for resolver changes</p>
                  <p className="text-slate-600">Resolver updates must be approved by multisig</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Choose how to receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Enable email notifications</p>
                  <p className="text-slate-600">Send alerts via email</p>
                </div>
                <Switch 
                  checked={alertConfig.emailEnabled}
                  onCheckedChange={(checked) => updateAlertConfig({ emailEnabled: checked })}
                />
              </div>

              {alertConfig.emailEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
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
                <Switch 
                  checked={alertConfig.webhookEnabled}
                  onCheckedChange={(checked) => updateAlertConfig({ webhookEnabled: checked })}
                />
              </div>

              {alertConfig.webhookEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="webhook">Webhook URL</Label>
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
                <Switch 
                  checked={alertConfig.enabled}
                  onCheckedChange={(checked) => updateAlertConfig({ enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Alert Display Settings</CardTitle>
              <CardDescription>Configure how alerts appear in the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alert-duration">Alert Duration (seconds)</Label>
                <Input 
                  id="alert-duration" 
                  type="number"
                  placeholder="15"
                  value={alertConfig.alertDuration / 1000}
                  onChange={(e) => updateAlertConfig({ alertDuration: Number(e.target.value) * 1000 })}
                />
                <p className="text-slate-600">How long alerts remain visible</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-alerts">Maximum Visible Alerts</Label>
                <Input 
                  id="max-alerts" 
                  type="number"
                  placeholder="5"
                  value={alertConfig.maxVisibleAlerts}
                  onChange={(e) => updateAlertConfig({ maxVisibleAlerts: Number(e.target.value) })}
                />
                <p className="text-slate-600">Maximum number of alerts stacked on screen</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-position">Alert Position</Label>
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

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Alert Preferences</CardTitle>
              <CardDescription>Configure which events trigger notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Domain expiration warnings</p>
                  <p className="text-slate-600">Alert 90, 30, and 7 days before expiration</p>
                </div>
                <Switch 
                  checked={alertConfig.notifyOnExpiration}
                  onCheckedChange={(checked) => updateAlertConfig({ notifyOnExpiration: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Security events</p>
                  <p className="text-slate-600">Notify on resolver changes, fuse burns, transfers</p>
                </div>
                <Switch 
                  checked={alertConfig.notifyOnSecurityEvents}
                  onCheckedChange={(checked) => updateAlertConfig({ notifyOnSecurityEvents: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Metadata changes</p>
                  <p className="text-slate-600">Notify when records are updated</p>
                </div>
                <Switch 
                  checked={alertConfig.notifyOnMetadataChanges}
                  onCheckedChange={(checked) => updateAlertConfig({ notifyOnMetadataChanges: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Failed transactions</p>
                  <p className="text-slate-600">Alert when transactions fail or revert</p>
                </div>
                <Switch 
                  checked={alertConfig.notifyOnFailedTransactions}
                  onCheckedChange={(checked) => updateAlertConfig({ notifyOnFailedTransactions: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display */}
        <TabsContent value="display" className="space-y-6">
          <Card className="border-2">
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
                <Switch 
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
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-2">
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
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Anomaly detection</p>
                  <p className="text-slate-600">Flag unusual patterns and unauthorized changes</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Require DAO approval for critical changes</p>
                  <p className="text-slate-600">Address changes must go through governance</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Security monitoring uses third-party services (Tenderly, Forta) which may incur additional costs
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Change Control</CardTitle>
              <CardDescription>TTL and caching configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
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
                <Switch />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">Audit all record changes</p>
                  <p className="text-slate-600">Log every metadata update to audit trail</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation */}
        <TabsContent value="automation" className="space-y-6">
          <Card className="border-2">
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
                <Switch defaultChecked />
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

          <Card className="border-2">
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
                  <Switch defaultChecked />
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
                  <Switch defaultChecked />
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
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
