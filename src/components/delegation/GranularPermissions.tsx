/**
 * Granular Permissions Management Component
 * UI for managing granular ENS permissions using ENSNamingDelegateGranular
 */

import { useState, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { Address, Hex } from 'viem';
import { namehash } from '../../lib/ens/ens-helpers';
import {
  granularPermissionService,
  GRANULAR_PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  type DelegateInfo,
} from '../../lib/services/granular-permission-service';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Lock, Unlock, Trash2, Edit, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';

interface GranularPermissionsProps {
  domainName: string;
  contractAddress?: Address; // ENSNamingDelegateGranular contract address
}

export function GranularPermissions({ domainName, contractAddress }: GranularPermissionsProps) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [node, setNode] = useState<Hex | null>(null);
  const [delegates, setDelegates] = useState<DelegateInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<Address | null>(null);
  const [newDelegate, setNewDelegate] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expirationDate, setExpirationDate] = useState('');
  const [emergencyPaused, setEmergencyPaused] = useState(false);

  useEffect(() => {
    if (domainName && publicClient) {
      const nodeHash = namehash(domainName);
      setNode(nodeHash as Hex);
      loadDelegates(nodeHash as Hex);
      checkEmergencyPause(nodeHash as Hex);
    }
  }, [domainName, publicClient]);

  useEffect(() => {
    if (publicClient && walletClient) {
      granularPermissionService.setClients(publicClient, walletClient);
    } else if (publicClient) {
      granularPermissionService.setClients(publicClient);
    }
  }, [publicClient, walletClient]);

  useEffect(() => {
    if (contractAddress) {
      granularPermissionService['contractAddress'] = contractAddress;
    }
  }, [contractAddress]);

  const loadDelegates = async (nodeHash: Hex) => {
    // Note: The contract doesn't have a getAllDelegates function that returns all delegates
    // This would need to be implemented via events or a different approach
    // For now, we'll show a placeholder
    setDelegates([]);
  };

  const checkEmergencyPause = async (nodeHash: Hex) => {
    try {
      const paused = await granularPermissionService.isEmergencyPaused(nodeHash);
      setEmergencyPaused(paused);
    } catch (error) {
      console.error('Error checking emergency pause:', error);
    }
  };

  const handleAddDelegate = async () => {
    if (!node || !newDelegate || selectedPermissions.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(newDelegate)) {
      toast.error('Invalid address format');
      return;
    }

    setLoading(true);
    try {
      const permissions = granularPermissionService.buildPermissions(selectedPermissions);
      const expiresAt = expirationDate
        ? BigInt(Math.floor(new Date(expirationDate).getTime() / 1000))
        : 0n;

      const hash = await granularPermissionService.addDelegate({
        node,
        delegate: newDelegate as Address,
        operations: permissions,
        expiresAt,
      });

      toast.success('Delegate added successfully', {
        description: `Transaction: ${hash.slice(0, 10)}...`,
      });

      setIsAddDialogOpen(false);
      setNewDelegate('');
      setSelectedPermissions([]);
      setExpirationDate('');
      await loadDelegates(node);
    } catch (error: any) {
      toast.error('Failed to add delegate', {
        description: error.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDelegate = async (delegate: Address) => {
    if (!node) return;

    if (!confirm(`Are you sure you want to remove delegate ${delegate}?`)) {
      return;
    }

    setLoading(true);
    try {
      const hash = await granularPermissionService.removeDelegate(node, delegate);
      toast.success('Delegate removed successfully');
      await loadDelegates(node);
    } catch (error: any) {
      toast.error('Failed to remove delegate', {
        description: error.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (delegate: Address, locked: boolean) => {
    if (!node) return;

    setLoading(true);
    try {
      if (locked) {
        await granularPermissionService.unlockDelegate(node, delegate);
        toast.success('Delegate unlocked');
      } else {
        await granularPermissionService.lockDelegate(node, delegate);
        toast.success('Delegate locked');
      }
      await loadDelegates(node);
    } catch (error: any) {
      toast.error('Failed to toggle lock', {
        description: error.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnable = async (delegate: Address, enabled: boolean) => {
    if (!node) return;

    setLoading(true);
    try {
      if (enabled) {
        await granularPermissionService.disableDelegate(node, delegate);
        toast.success('Delegate disabled');
      } else {
        await granularPermissionService.enableDelegate(node, delegate);
        toast.success('Delegate enabled');
      }
      await loadDelegates(node);
    } catch (error: any) {
      toast.error('Failed to toggle enable', {
        description: error.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyPause = async () => {
    if (!node) return;

    if (!confirm('Are you sure you want to emergency pause this node? This will revoke all delegations.')) {
      return;
    }

    setLoading(true);
    try {
      const hash = await granularPermissionService.emergencyPause(node, !emergencyPaused);
      toast.success(`Node ${emergencyPaused ? 'unpaused' : 'paused'}`);
      await checkEmergencyPause(node);
    } catch (error: any) {
      toast.error('Failed to toggle emergency pause', {
        description: error.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const allPermissions = granularPermissionService.getAllPermissions();

  if (!node) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Invalid domain name</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Granular Permissions</CardTitle>
              <CardDescription>
                Manage fine-grained permissions for {domainName} using ENSIP GNA
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {emergencyPaused && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Emergency Paused
                </Badge>
              )}
              <Button
                variant={emergencyPaused ? 'default' : 'destructive'}
                size="sm"
                onClick={handleEmergencyPause}
                disabled={loading}
              >
                {emergencyPaused ? 'Unpause' : 'Emergency Pause'}
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Delegate
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Delegate</DialogTitle>
                    <DialogDescription>
                      Grant specific permissions to an address for managing this domain
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="delegate-address">Delegate Address</Label>
                      <Input
                        id="delegate-address"
                        placeholder="0x..."
                        value={newDelegate}
                        onChange={(e) => setNewDelegate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Permissions</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {allPermissions.map((perm) => (
                          <div key={perm.name} className="flex items-start space-x-2">
                            <Checkbox
                              id={`perm-${perm.name}`}
                              checked={selectedPermissions.includes(perm.name)}
                              onCheckedChange={() => togglePermission(perm.name)}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={`perm-${perm.name}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {perm.label}
                              </Label>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="expiration">Expiration Date (Optional)</Label>
                      <Input
                        id="expiration"
                        type="datetime-local"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty for no expiration (not recommended)
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddDelegate} disabled={loading}>
                      {loading ? 'Adding...' : 'Add Delegate'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {delegates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No delegates configured</p>
              <p className="text-sm mt-2">Add a delegate to grant granular permissions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {delegates.map((delegate) => (
                <Card key={delegate.address} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm">{delegate.address}</code>
                        {delegate.permission.locked && (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Locked
                          </Badge>
                        )}
                        {!delegate.permission.enabled && (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                        {delegate.permission.expiresAt > 0n &&
                          Number(delegate.permission.expiresAt) * 1000 < Date.now() && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {delegate.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {PERMISSION_LABELS[perm] || perm}
                          </Badge>
                        ))}
                      </div>
                      {delegate.permission.expiresAt > 0n && (
                        <p className="text-xs text-muted-foreground">
                          Expires:{' '}
                          {formatDistanceToNow(
                            new Date(Number(delegate.permission.expiresAt) * 1000),
                            { addSuffix: true }
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleLock(delegate.address, delegate.permission.locked)}
                        disabled={loading}
                      >
                        {delegate.permission.locked ? (
                          <Unlock className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleEnable(delegate.address, delegate.permission.enabled)}
                        disabled={loading}
                      >
                        {delegate.permission.enabled ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDelegate(delegate.address)}
                        disabled={loading || delegate.permission.locked}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Permissions</CardTitle>
          <CardDescription>Permission types available in the ENSIP GNA specification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allPermissions.map((perm) => (
              <div key={perm.name} className="p-3 border rounded-lg">
                <div className="font-medium text-sm">{perm.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{perm.description}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Value: {perm.value.toString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

