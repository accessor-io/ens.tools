/**
 * Admin Panel Component
 * Requires Ethereum address authentication
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Shield,
  Lock,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useWeb3 } from '../../lib/services/web3-provider';
import { signMessage } from 'viem';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface AdminUser {
  id: string;
  address: string;
  ensName?: string;
  role: 'admin' | 'super_admin';
  permissions?: any;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface Statistics {
  totalUsers: number;
  totalAuditLogs: number;
  recentActivity: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
}

export function AdminPanel() {
  const { address, walletClient, isConnected } = useWeb3();
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [adminInfo, setAdminInfo] = useState<AdminUser | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Check for existing session
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_session_token');
    if (storedToken) {
      validateSession(storedToken);
    }
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (authenticated && sessionToken) {
      loadData();
    }
  }, [authenticated, sessionToken]);

  const validateSession = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/me`, {
        headers: {
          'x-admin-session': token,
        },
      });

      if (response.ok) {
        const admin = await response.json();
        setAdminInfo(admin);
        setSessionToken(token);
        setAuthenticated(true);
      } else {
        localStorage.removeItem('admin_session_token');
      }
    } catch (error) {
      console.error('Error validating session:', error);
      localStorage.removeItem('admin_session_token');
    }
  };

  const handleLogin = async () => {
    if (!isConnected || !address || !walletClient) {
      toast.error('Please connect your wallet first');
      return;
    }

    setAuthenticating(true);
    try {
      // Create authentication message
      const message = `Sign this message to authenticate as admin for ENS Tools.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;

      // Request signature
      const signature = await walletClient.signMessage({
        message,
      });

      // Create auth payload
      const authPayload = {
        address,
        message,
        signature,
      };

      // Encode payload
      const token = Buffer.from(JSON.stringify(authPayload)).toString('base64');

      // Authenticate with server
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const data = await response.json();
      setSessionToken(data.sessionToken);
      setAdminInfo(data.admin);
      setAuthenticated(true);
      localStorage.setItem('admin_session_token', data.sessionToken);
      toast.success('Admin authentication successful');
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await fetch(`${API_URL}/admin/logout`, {
          method: 'POST',
          headers: {
            'x-admin-session': sessionToken,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthenticated(false);
      setSessionToken(null);
      setAdminInfo(null);
      localStorage.removeItem('admin_session_token');
      toast.success('Logged out successfully');
    }
  };

  const loadData = async () => {
    if (!sessionToken) return;

    setLoading(true);
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/admin/statistics`, {
          headers: { 'x-admin-session': sessionToken },
        }),
        fetch(`${API_URL}/admin/users?limit=50`, {
          headers: { 'x-admin-session': sessionToken },
        }),
        fetch(`${API_URL}/admin/audit-logs?limit=50`, {
          headers: { 'x-admin-session': sessionToken },
        }),
      ]);

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setStatistics(stats);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      if (logsRes.ok) {
        const logs = await logsRes.json();
        setAuditLogs(logs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-slate-600" />
              <CardTitle>Admin Authentication</CardTitle>
            </div>
            <CardDescription>
              Sign a message with your Ethereum wallet to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isConnected ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please connect your wallet to continue
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-2">Connected Address:</p>
                  <p className="font-mono text-sm">{address}</p>
                </div>
                <Button
                  onClick={handleLogin}
                  disabled={authenticating}
                  className="w-full"
                >
                  {authenticating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Sign Message to Authenticate
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Admin Panel
          </h1>
          <p className="text-slate-600 mt-2">
            Welcome, {adminInfo?.address.slice(0, 6)}...{adminInfo?.address.slice(-4)}
            {adminInfo?.role === 'super_admin' && (
              <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-800">
                Super Admin
              </Badge>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {statistics.totalUsers.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {statistics.totalAuditLogs.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Recent Activity (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.recentActivity.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {Object.keys(statistics.byAction).length}
              </div>
              <p className="text-xs text-slate-500 mt-1">Unique action types</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>All registered users</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm">{user.address}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(user.updatedAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>Recent system activity</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.userAddress ? (
                        <span>
                          {log.userAddress.slice(0, 6)}...{log.userAddress.slice(-4)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {log.status === 'success' && (
                        <Badge className="bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Success
                        </Badge>
                      )}
                      {log.status === 'failed' && (
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                      {log.status !== 'success' && log.status !== 'failed' && (
                        <Badge variant="outline">{log.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{log.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

