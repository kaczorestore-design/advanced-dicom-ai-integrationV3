import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';

import { Textarea } from './ui/textarea';
import { 
  Users, 
  UserPlus, 
 
  Shield, 
  Settings, 
 
  Edit, 
  Trash2, 
  Eye, 
 
  Clock, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,

} from 'lucide-react';
import UserManagementSystem, { 
  User, 
  UserRole, 
  Permission, 
  UserSession, 
  AuditLogEntry, 

  UserRegistrationRequest,

} from './UserManagementSystem';

interface UserManagementUIProps {
  userManagementSystem: UserManagementSystem;
  currentUser: User | null;
}

interface UserFormData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
  specialization: string;
  licenseNumber: string;
  roleId: string;
}

interface RoleFormData {
  name: string;
  description: string;
  level: number;
  permissionIds: string[];
}

interface FilterOptions {
  role: string;
  department: string;
  status: string;
  searchTerm: string;
}

export const UserManagementUI: React.FC<UserManagementUIProps> = ({
  userManagementSystem,
  currentUser
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  const [activeTab, setActiveTab] = useState('users');
  
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    department: '',
    specialization: '',
    licenseNumber: '',
    roleId: ''
  });
  
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    level: 4,
    permissionIds: []
  });
  
  const [filters, setFilters] = useState<FilterOptions>({
    role: '',
    department: '',
    status: '',
    searchTerm: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersData, rolesData, permissionsData] = await Promise.all([
        Promise.resolve(userManagementSystem.getUsers()),
        Promise.resolve(userManagementSystem.getRoles()),
        // userManagementSystem.getAllPermissions(), // Method is private
        Promise.resolve([]),
        Promise.resolve(userManagementSystem.getConfig())
      ]);
      
      setUsers(usersData);
      setRoles(rolesData);
      setPermissions(permissionsData);
      // setConfig(configData); // Variable removed
      
      // Load sessions for current user if admin
      if (currentUser && hasPermission('users-read')) {
        // const sessionsData = await userManagementSystem.getAllSessions(); // Method doesn't exist
        const sessionsData: UserSession[] = [];
        setSessions(sessionsData);
      }
      
      // Load audit log if admin
      if (currentUser && hasPermission('audit-read')) {
        const auditData = await userManagementSystem.getAuditLog();
        setAuditLog(auditData.slice(0, 100)); // Limit to recent 100 entries
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [userManagementSystem, currentUser]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!currentUser) return false;
    return userManagementSystem.hasPermission(currentUser.id, permission, 'read');
  }, [currentUser, userManagementSystem]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = users.filter(user => {
    if (filters.searchTerm && 
        !user.username.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
        !user.email.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
        !`${user.firstName} ${user.lastName}`.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }
    if (filters.role && user.role.id !== filters.role) return false;
    if (filters.department && user.department !== filters.department) return false;
    if (filters.status === 'active' && !user.isActive) return false;
    if (filters.status === 'inactive' && user.isActive) return false;
    if (filters.status === 'verified' && !user.isVerified) return false;
    if (filters.status === 'unverified' && user.isVerified) return false;
    return true;
  });

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const request: UserRegistrationRequest = {
        username: userFormData.username,
        email: userFormData.email,
        password: userFormData.password,
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        department: userFormData.department,
        specialization: userFormData.specialization,
        licenseNumber: userFormData.licenseNumber
      };
      
      const newUser = await userManagementSystem.createUser(request);
      if (newUser) {
        // Assign role if specified
        if (userFormData.roleId) {
          const role = roles.find(r => r.id === userFormData.roleId);
          if (role) {
            // await userManagementSystem.assignRole(newUser.id, role.id); // Method doesn't exist
          }
        }
        
        await loadData();
        setShowUserDialog(false);
        resetUserForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await userManagementSystem.deleteUser(userId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const selectedPermissions = permissions.filter(p => roleFormData.permissionIds.includes(p.id));
      
      await userManagementSystem.createRole({
        name: roleFormData.name,
        description: roleFormData.description,
        level: roleFormData.level,
        permissions: selectedPermissions,
        isSystemRole: false
      });
      
      await loadData();
      setShowRoleDialog(false);
      resetRoleForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // await userManagementSystem.terminateSession(sessionId); // Method is private
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate session');
    } finally {
      setLoading(false);
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      department: '',
      specialization: '',
      licenseNumber: '',
      roleId: ''
    });
  };

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      description: '',
      level: 4,
      permissionIds: []
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (user: User) => {
    if (!user.isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (!user.isVerified) {
      return <Badge variant="secondary">Unverified</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      0: 'bg-red-100 text-red-800',
      1: 'bg-orange-100 text-orange-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-green-100 text-green-800',
      4: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={colors[role.level as keyof typeof colors] || colors[4]}>
        {role.name}
      </Badge>
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading user management...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage users, roles, permissions, and system security
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {hasPermission('settings-write') && (
            <Button onClick={() => {}} variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users ({filteredUsers.length})</CardTitle>
                  <CardDescription>
                    Manage user accounts and permissions
                  </CardDescription>
                </div>
                {hasPermission('users-write') && (
                  <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={resetUserForm}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                          Add a new user to the system
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={userFormData.username}
                            onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="Enter username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={userFormData.email}
                            onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Enter email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={userFormData.firstName}
                            onChange={(e) => setUserFormData(prev => ({ ...prev, firstName: e.target.value }))}
                            placeholder="Enter first name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={userFormData.lastName}
                            onChange={(e) => setUserFormData(prev => ({ ...prev, lastName: e.target.value }))}
                            placeholder="Enter last name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={userFormData.password}
                            onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Enter password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="department">Department</Label>
                          <Input
                            id="department"
                            value={userFormData.department}
                            onChange={(e) => setUserFormData(prev => ({ ...prev, department: e.target.value }))}
                            placeholder="Enter department"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="specialization">Specialization</Label>
                          <Input
                            id="specialization"
                            value={userFormData.specialization}
                            onChange={(e) => setUserFormData(prev => ({ ...prev, specialization: e.target.value }))}
                            placeholder="Enter specialization (optional)"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="licenseNumber">License Number</Label>
                          <Input
                            id="licenseNumber"
                            value={userFormData.licenseNumber}
                            onChange={(e) => setUserFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                            placeholder="Enter license number (optional)"
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="role">Role</Label>
                          <Select value={userFormData.roleId} onValueChange={(value) => setUserFormData(prev => ({ ...prev, roleId: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(role => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name} - {role.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateUser} disabled={loading}>
                          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                          Create User
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search users..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="max-w-sm"
                  />
                </div>
                <Select value={filters.role} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}>
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
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-40">
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

              {/* Users Table */}
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            <div className="text-xs text-muted-foreground">@{user.username}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{user.department}</TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell>
                          {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline" onClick={() => {}}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasPermission('users-write') && (
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {hasPermission('users-delete') && user.id !== currentUser?.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {user.firstName} {user.lastName}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Roles ({roles.length})</CardTitle>
                  <CardDescription>
                    Manage user roles and permissions
                  </CardDescription>
                </div>
                {hasPermission('users-write') && (
                  <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={resetRoleForm}>
                        <Shield className="h-4 w-4 mr-2" />
                        Add Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                        <DialogDescription>
                          Define a new role with specific permissions
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="roleName">Role Name</Label>
                            <Input
                              id="roleName"
                              value={roleFormData.name}
                              onChange={(e) => setRoleFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter role name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="roleLevel">Access Level</Label>
                            <Select value={roleFormData.level.toString()} onValueChange={(value) => setRoleFormData(prev => ({ ...prev, level: parseInt(value) }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Administrator (0)</SelectItem>
                                <SelectItem value="1">Supervisor (1)</SelectItem>
                                <SelectItem value="2">Physician (2)</SelectItem>
                                <SelectItem value="3">Technician (3)</SelectItem>
                                <SelectItem value="4">Viewer (4)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="roleDescription">Description</Label>
                          <Textarea
                            id="roleDescription"
                            value={roleFormData.description}
                            onChange={(e) => setRoleFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Enter role description"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Permissions</Label>
                          <ScrollArea className="h-48 border rounded-md p-4">
                            <div className="space-y-2">
                              {permissions.map(permission => (
                                <div key={permission.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={permission.id}
                                    checked={roleFormData.permissionIds.includes(permission.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setRoleFormData(prev => ({
                                          ...prev,
                                          permissionIds: [...prev.permissionIds, permission.id]
                                        }));
                                      } else {
                                        setRoleFormData(prev => ({
                                          ...prev,
                                          permissionIds: prev.permissionIds.filter(id => id !== permission.id)
                                        }));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={permission.id} className="text-sm">
                                    <div className="font-medium">{permission.name}</div>
                                    <div className="text-xs text-muted-foreground">{permission.description}</div>
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateRole} disabled={loading}>
                          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                          Create Role
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map(role => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{role.name}</div>
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>{role.level}</TableCell>
                      <TableCell>{role.permissions.length} permissions</TableCell>
                      <TableCell>
                        {users.filter(u => u.role.id === role.id).length} users
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" onClick={() => {}}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {hasPermission('users-write') && !role.isSystemRole && (
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions ({sessions.filter(s => s.isActive).length})</CardTitle>
              <CardDescription>
                Monitor and manage user sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.filter(s => s.isActive).map(session => {
                    const user = users.find(u => u.id === session.userId);
                    return (
                      <TableRow key={session.id}>
                        <TableCell>
                          {user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{session.deviceInfo.deviceType}</div>
                            <div className="text-xs text-muted-foreground">{session.deviceInfo.ip}</div>
                          </div>
                        </TableCell>
                        <TableCell>{session.deviceInfo.location || 'Unknown'}</TableCell>
                        <TableCell>{formatDate(session.createdAt)}</TableCell>
                        <TableCell>{formatDate(session.lastActivity)}</TableCell>
                        <TableCell>
                          {hasPermission('users-write') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTerminateSession()}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>
                System activity and security events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map(entry => {
                      const user = users.find(u => u.id === entry.userId);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">
                            {formatDate(entry.timestamp)}
                          </TableCell>
                          <TableCell>
                            {user ? `${user.firstName} ${user.lastName}` : 'System'}
                          </TableCell>
                          <TableCell>{entry.action}</TableCell>
                          <TableCell>{entry.resource}</TableCell>
                          <TableCell>
                            {entry.success ? (
                              <Badge variant="default">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Success
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.errorMessage || JSON.stringify(entry.details)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">
                  {users.filter(u => u.isActive).length} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sessions.filter(s => s.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {new Set(sessions.filter(s => s.isActive).map(s => s.userId)).size} users
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Roles</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles.length}</div>
                <p className="text-xs text-muted-foreground">
                  {roles.filter(r => !r.isSystemRole).length} custom
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {auditLog.filter(entry => 
                    new Date(entry.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Events in last 24h
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagementUI;
