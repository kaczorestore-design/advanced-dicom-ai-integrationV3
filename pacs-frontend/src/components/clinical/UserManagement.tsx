import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Download,
  Lock,
  Unlock,
  AlertCircle,
  Activity,
  LogOut,
  UserCheck,
  UserX,
  Crown,
  Plus,
} from 'lucide-react';

// Types
interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  role: UserRole;
  department: string;
  title: string;
  licenseNumber?: string;
  specialties: string[];
  phone?: string;
  address?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
  preferences: UserPreferences;
  statistics: UserStatistics;
  sessions: UserSession[];
}

interface UserRole {
  id: string;
  name: string;
  description: string;
  level: number; // 1-10, higher = more privileges
  permissions: Permission[];
  isSystem: boolean;
  color: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string; // CREATE, READ, UPDATE, DELETE, EXECUTE
  conditions?: PermissionCondition[];
}

interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in';
  value: unknown;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  defaultLayout: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    desktop: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowDirectMessages: boolean;
    shareActivity: boolean;
  };
}

interface UserStatistics {
  totalLogins: number;
  totalStudiesViewed: number;
  totalReportsGenerated: number;
  totalTimeSpent: number; // minutes
  averageSessionDuration: number; // minutes
  lastActivityDate: string;
  favoriteModalities: string[];
  productivityScore: number; // 0-100
}

interface UserSession {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  location: string;
  startTime: string;
  lastActivity: string;
  isActive: boolean;
  userAgent: string;
}

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [_editingUser, _setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [_showUserDialog, _setShowUserDialog] = useState(false);
  const [_showRoleDialog, _setShowRoleDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to load users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load roles
  const loadRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/roles');
      if (!response.ok) throw new Error('Failed to load roles');
      const data = await response.json();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    }
  }, []);

  // Load permissions
  const loadPermissions = useCallback(async () => {
    try {
      const response = await fetch('/api/permissions');
      if (!response.ok) throw new Error('Failed to load permissions');
      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    }
  }, []);

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/audit-logs');
      if (!response.ok) throw new Error('Failed to load audit logs');
      const data = await response.json();
      setAuditLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    }
  }, []);

  // Create or update user (unused but kept for future functionality)
  // @ts-expect-error - Intentionally unused, kept for future functionality
  const _saveUser = async (user: Partial<User>) => {
    try {
      const method = user.id ? 'PUT' : 'POST';
      const url = user.id ? `/api/users/${user.id}` : '/api/users';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      
      if (!response.ok) throw new Error('Failed to save user');
      
      const savedUser = await response.json();
      
      if (user.id) {
        setUsers(prev => prev.map(u => u.id === user.id ? savedUser : u));
      } else {
        setUsers(prev => [...prev, savedUser]);
      }
      
      _setShowUserDialog(false);
      _setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete user');
      
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // Toggle user status
  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      
      if (!response.ok) throw new Error('Failed to update user status');
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isActive } : u
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  // Reset user password
  const resetPassword = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to reset password');
      
      const result = await response.json();
      alert(`Password reset. Temporary password: ${result.temporaryPassword}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  // Terminate user sessions
  const terminateSessions = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/terminate-sessions`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to terminate sessions');
      
      // Refresh user data
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate sessions');
    }
  };

  // Bulk operations
  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;
    
    try {
      const response = await fetch('/api/users/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers, action })
      });
      
      if (!response.ok) throw new Error('Bulk action failed');
      
      loadUsers();
      setSelectedUsers([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    }
  };

  // Export users
  const exportUsers = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const response = await fetch(`/api/users/export?format=${format}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // Load data on mount
  useEffect(() => {
    loadUsers();
    loadRoles();
    loadPermissions();
    loadAuditLogs();
  }, [loadUsers, loadRoles, loadPermissions, loadAuditLogs]);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !filterRole || user.role.id === filterRole;
    const matchesDepartment = !filterDepartment || user.department === filterDepartment;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive) ||
      (filterStatus === 'verified' && user.isVerified) ||
      (filterStatus === 'unverified' && !user.isVerified);
    
    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  // Get role badge color
  const getRoleBadgeColor = (role: UserRole) => {
    return role.color || 'bg-gray-100 text-gray-800';
  };

  // Get status badge
  const getStatusBadge = (user: User) => {
    if (!user.isActive) {
      return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
    }
    if (!user.isVerified) {
      return <Badge className="bg-yellow-100 text-yellow-800">Unverified</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportUsers('csv')} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadUsers} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => { _setEditingUser(null); _setShowUserDialog(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Online Now</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.sessions.some(s => s.isActive)).length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Roles</p>
                <p className="text-2xl font-bold">{roles.length}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    <SelectItem value="Radiology">Radiology</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Oncology">Oncology</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedUsers.length} user(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button onClick={() => handleBulkAction('activate')} size="sm">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Activate
                    </Button>
                    <Button onClick={() => handleBulkAction('deactivate')} size="sm" variant="outline">
                      <UserX className="w-4 h-4 mr-2" />
                      Deactivate
                    </Button>
                    <Button onClick={() => handleBulkAction('reset-password')} size="sm" variant="outline">
                      <Key className="w-4 h-4 mr-2" />
                      Reset Passwords
                    </Button>
                    <Button onClick={() => handleBulkAction('delete')} size="sm" variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(filteredUsers.map(u => u.id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(prev => [...prev, user.id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>
                                {user.firstName[0]}{user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.fullName}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role.name}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.department}</TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell>
                          {user.lastLogin ? (
                            <div className="text-sm">
                              {new Date(user.lastLogin).toLocaleDateString()}
                              <br />
                              {new Date(user.lastLogin).toLocaleTimeString()}
                            </div>
                          ) : (
                            <span className="text-gray-400">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => setSelectedUser(user)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => { _setEditingUser(user); _setShowUserDialog(true); }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit User</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => toggleUserStatus(user.id, !user.isActive)}
                                  >
                                    {user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {user.isActive ? 'Deactivate' : 'Activate'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <Select onValueChange={(action) => {
                              switch (action) {
                                case 'reset-password':
                                  resetPassword(user.id);
                                  break;
                                case 'terminate-sessions':
                                  terminateSessions(user.id);
                                  break;
                                case 'delete':
                                  deleteUser(user.id);
                                  break;
                              }
                            }}>
                              <SelectTrigger className="w-8 h-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="reset-password">Reset Password</SelectItem>
                                <SelectItem value="terminate-sessions">End Sessions</SelectItem>
                                <SelectItem value="delete">Delete User</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Roles */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Roles</CardTitle>
                  <Button onClick={() => _setShowRoleDialog(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roles.map((role) => (
                    <Card key={role.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{role.name}</h3>
                              <Badge className={role.color}>
                                Level {role.level}
                              </Badge>
                              {role.isSystem && (
                                <Badge variant="outline">
                                  <Crown className="w-3 h-3 mr-1" />
                                  System
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                            <p className="text-xs text-gray-500">
                              {role.permissions.length} permissions
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!role.isSystem && (
                              <Button size="sm" variant="ghost">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card>
              <CardHeader>
                <CardTitle>Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    permissions.reduce((acc, permission) => {
                      if (!acc[permission.category]) {
                        acc[permission.category] = [];
                      }
                      acc[permission.category].push(permission);
                      return acc;
                    }, {} as Record<string, Permission[]>)
                  ).map(([category, categoryPermissions]) => (
                    <div key={category}>
                      <h4 className="font-medium mb-2">{category}</h4>
                      <div className="space-y-1">
                        {categoryPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <span className="text-sm font-medium">{permission.name}</span>
                              <p className="text-xs text-gray-500">{permission.description}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {permission.action}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.userName}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.resource}</TableCell>
                      <TableCell>
                        <Badge className={`${
                          log.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          log.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          log.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">Force all users to enable 2FA</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Password Complexity</Label>
                    <p className="text-sm text-gray-500">Enforce strong password requirements</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                  </div>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Log User Actions</Label>
                    <p className="text-sm text-gray-500">Track all user activities</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Log Data Access</Label>
                    <p className="text-sm text-gray-500">Track DICOM data access</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Retention Period</Label>
                    <p className="text-sm text-gray-500">How long to keep audit logs</p>
                  </div>
                  <Select defaultValue="365">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="1095">3 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback className="text-lg">
                    {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{selectedUser.fullName}</h2>
                  <p className="text-gray-600">{selectedUser.title}</p>
                  <p className="text-sm text-gray-500">{selectedUser.department}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getRoleBadgeColor(selectedUser.role)}>
                      {selectedUser.role.name}
                    </Badge>
                    {getStatusBadge(selectedUser)}
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold">{selectedUser.statistics.totalLogins}</div>
                  <div className="text-sm text-gray-600">Total Logins</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold">{selectedUser.statistics.totalStudiesViewed}</div>
                  <div className="text-sm text-gray-600">Studies Viewed</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold">{selectedUser.statistics.totalReportsGenerated}</div>
                  <div className="text-sm text-gray-600">Reports Generated</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold">{selectedUser.statistics.productivityScore}</div>
                  <div className="text-sm text-gray-600">Productivity Score</div>
                </div>
              </div>

              {/* Active Sessions */}
              <div>
                <h3 className="font-semibold mb-3">Active Sessions</h3>
                <div className="space-y-2">
                  {selectedUser.sessions.filter(s => s.isActive).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{session.deviceInfo}</div>
                        <div className="text-sm text-gray-600">
                          {session.location} • {session.ipAddress}
                        </div>
                        <div className="text-xs text-gray-500">
                          Started: {new Date(session.startTime).toLocaleString()}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <LogOut className="w-4 h-4 mr-2" />
                        Terminate
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserManagement;
export type { User, UserRole, Permission, UserPreferences, UserStatistics, UserSession, AuditLog };
