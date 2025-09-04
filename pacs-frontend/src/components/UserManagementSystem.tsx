import { EventEmitter } from 'events';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: string;
  specialization?: string;
  licenseNumber?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
  permissions: Permission[];
  sessions: UserSession[];
  auditLog: AuditLogEntry[];
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  level: number; // 0 = admin, 1 = supervisor, 2 = physician, 3 = technician, 4 = viewer
  permissions: Permission[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string; // e.g., 'studies', 'patients', 'reports', 'settings'
  action: string; // e.g., 'read', 'write', 'delete', 'export', 'share'
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  defaultHangingProtocol: string;
  autoSaveInterval: number; // minutes
  enableNotifications: boolean;
  notificationTypes: string[];
  defaultWindowLevel: { center: number; width: number };
  keyboardShortcuts: { [key: string]: string };
  displaySettings: {
    showPatientInfo: boolean;
    showStudyInfo: boolean;
    showSeriesInfo: boolean;
    showMeasurements: boolean;
    showAnnotations: boolean;
  };
  exportSettings: {
    defaultFormat: string;
    includeAnnotations: boolean;
    includeMetadata: boolean;
    compressionLevel: number;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    location?: string;
    deviceType: 'desktop' | 'tablet' | 'mobile';
  };
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: { [key: string]: any };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface AuthenticationConfig {
  enableMFA: boolean;
  mfaMethods: ('totp' | 'sms' | 'email')[];
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // days
    preventReuse: number; // number of previous passwords to check
  };
  sessionConfig: {
    maxDuration: number; // minutes
    inactivityTimeout: number; // minutes
    maxConcurrentSessions: number;
    enableRememberMe: boolean;
    rememberMeDuration: number; // days
  };
  lockoutPolicy: {
    maxFailedAttempts: number;
    lockoutDuration: number; // minutes
    enableProgressiveLockout: boolean;
  };
  enableSSO: boolean;
  ssoProviders: SSOProvider[];
  enableLDAP: boolean;
  ldapConfig?: LDAPConfig;
}

export interface SSOProvider {
  id: string;
  name: string;
  type: 'saml' | 'oauth2' | 'oidc';
  isEnabled: boolean;
  config: { [key: string]: any };
}

export interface LDAPConfig {
  server: string;
  port: number;
  baseDN: string;
  bindDN: string;
  bindPassword: string;
  userSearchBase: string;
  userSearchFilter: string;
  groupSearchBase: string;
  groupSearchFilter: string;
  enableSSL: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
  deviceInfo: {
    userAgent: string;
    ip: string;
    deviceType: 'desktop' | 'tablet' | 'mobile';
  };
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  session?: UserSession;
  requiresMFA?: boolean;
  mfaMethods?: string[];
  error?: string;
  lockoutInfo?: {
    isLockedOut: boolean;
    lockoutExpires?: Date;
    attemptsRemaining?: number;
  };
}

export interface PasswordResetRequest {
  email: string;
  newPassword?: string;
  resetToken?: string;
}

export interface UserRegistrationRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
  specialization?: string;
  licenseNumber?: string;
  invitationToken?: string;
}

export class UserManagementSystem extends EventEmitter {
  private users: Map<string, User> = new Map();
  private roles: Map<string, UserRole> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private config: AuthenticationConfig;
  private currentUser: User | null = null;
  private currentSession: UserSession | null = null;
  private isInitialized = false;
  private sessionCheckInterval: any;
  private auditCleanupInterval: any;

  constructor(config: Partial<AuthenticationConfig> = {}) {
    super();
    
    this.config = {
      enableMFA: false,
      mfaMethods: ['totp'],
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90,
        preventReuse: 5
      },
      sessionConfig: {
        maxDuration: 480, // 8 hours
        inactivityTimeout: 60, // 1 hour
        maxConcurrentSessions: 3,
        enableRememberMe: true,
        rememberMeDuration: 30 // 30 days
      },
      lockoutPolicy: {
        maxFailedAttempts: 5,
        lockoutDuration: 30, // 30 minutes
        enableProgressiveLockout: true
      },
      enableSSO: false,
      ssoProviders: [],
      enableLDAP: false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load saved data
      await this.loadSavedData();
      
      // Initialize default roles
      this.initializeDefaultRoles();
      
      // Initialize default admin user if no users exist
      if (this.users.size === 0) {
        await this.createDefaultAdmin();
      }
      
      // Start background services
      this.startBackgroundServices();
      
      // Restore session if available
      await this.restoreSession();

      this.isInitialized = true;
      console.log('✅ User Management System initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize User Management System:', error);
      throw error;
    }
  }

  private async loadSavedData(): Promise<void> {
    try {
      // Load users
      const savedUsers = localStorage.getItem('dicom_users');
      if (savedUsers) {
        const users = JSON.parse(savedUsers);
        users.forEach((user: any) => {
          user.createdAt = new Date(user.createdAt);
          user.updatedAt = new Date(user.updatedAt);
          user.lastLogin = user.lastLogin ? new Date(user.lastLogin) : undefined;
          this.users.set(user.id, user);
        });
      }

      // Load roles
      const savedRoles = localStorage.getItem('dicom_roles');
      if (savedRoles) {
        const roles = JSON.parse(savedRoles);
        roles.forEach((role: any) => {
          role.createdAt = new Date(role.createdAt);
          role.updatedAt = new Date(role.updatedAt);
          this.roles.set(role.id, role);
        });
      }

      // Load audit log
      const savedAuditLog = localStorage.getItem('dicom_audit_log');
      if (savedAuditLog) {
        const auditEntries = JSON.parse(savedAuditLog);
        this.auditLog = auditEntries.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  }

  private initializeDefaultRoles(): void {
    const defaultRoles: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'System Administrator',
        description: 'Full system access and user management',
        level: 0,
        isSystemRole: true,
        permissions: this.getAllPermissions()
      },
      {
        name: 'Department Supervisor',
        description: 'Departmental oversight and user management',
        level: 1,
        isSystemRole: true,
        permissions: this.getSupervisorPermissions()
      },
      {
        name: 'Radiologist',
        description: 'Full diagnostic access and reporting',
        level: 2,
        isSystemRole: true,
        permissions: this.getPhysicianPermissions()
      },
      {
        name: 'Technician',
        description: 'Image acquisition and basic viewing',
        level: 3,
        isSystemRole: true,
        permissions: this.getTechnicianPermissions()
      },
      {
        name: 'Viewer',
        description: 'Read-only access to studies',
        level: 4,
        isSystemRole: true,
        permissions: this.getViewerPermissions()
      }
    ];

    defaultRoles.forEach(roleData => {
      const existingRole = Array.from(this.roles.values()).find(r => r.name === roleData.name);
      if (!existingRole) {
        const role: UserRole = {
          ...roleData,
          id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.roles.set(role.id, role);
      }
    });
  }

  private getAllPermissions(): Permission[] {
    return [
      // User management
      { id: 'users-read', name: 'View Users', description: 'View user accounts', resource: 'users', action: 'read' },
      { id: 'users-write', name: 'Manage Users', description: 'Create and edit user accounts', resource: 'users', action: 'write' },
      { id: 'users-delete', name: 'Delete Users', description: 'Delete user accounts', resource: 'users', action: 'delete' },
      
      // Study management
      { id: 'studies-read', name: 'View Studies', description: 'View medical studies', resource: 'studies', action: 'read' },
      { id: 'studies-write', name: 'Edit Studies', description: 'Edit study information', resource: 'studies', action: 'write' },
      { id: 'studies-delete', name: 'Delete Studies', description: 'Delete studies', resource: 'studies', action: 'delete' },
      { id: 'studies-export', name: 'Export Studies', description: 'Export study data', resource: 'studies', action: 'export' },
      { id: 'studies-share', name: 'Share Studies', description: 'Share studies with others', resource: 'studies', action: 'share' },
      
      // Patient management
      { id: 'patients-read', name: 'View Patients', description: 'View patient information', resource: 'patients', action: 'read' },
      { id: 'patients-write', name: 'Edit Patients', description: 'Edit patient information', resource: 'patients', action: 'write' },
      { id: 'patients-delete', name: 'Delete Patients', description: 'Delete patient records', resource: 'patients', action: 'delete' },
      
      // Reports
      { id: 'reports-read', name: 'View Reports', description: 'View diagnostic reports', resource: 'reports', action: 'read' },
      { id: 'reports-write', name: 'Create Reports', description: 'Create and edit reports', resource: 'reports', action: 'write' },
      { id: 'reports-delete', name: 'Delete Reports', description: 'Delete reports', resource: 'reports', action: 'delete' },
      { id: 'reports-sign', name: 'Sign Reports', description: 'Digitally sign reports', resource: 'reports', action: 'sign' },
      
      // System settings
      { id: 'settings-read', name: 'View Settings', description: 'View system settings', resource: 'settings', action: 'read' },
      { id: 'settings-write', name: 'Manage Settings', description: 'Modify system settings', resource: 'settings', action: 'write' },
      
      // Audit logs
      { id: 'audit-read', name: 'View Audit Logs', description: 'View system audit logs', resource: 'audit', action: 'read' },
      
      // AI features
      { id: 'ai-read', name: 'View AI Results', description: 'View AI analysis results', resource: 'ai', action: 'read' },
      { id: 'ai-write', name: 'Manage AI', description: 'Configure AI settings', resource: 'ai', action: 'write' }
    ];
  }

  private getSupervisorPermissions(): Permission[] {
    const allPermissions = this.getAllPermissions();
    return allPermissions.filter(p => 
      !['users-delete', 'settings-write', 'patients-delete', 'studies-delete'].includes(p.id)
    );
  }

  private getPhysicianPermissions(): Permission[] {
    const allPermissions = this.getAllPermissions();
    return allPermissions.filter(p => 
      !p.id.startsWith('users-') && !p.id.startsWith('settings-') && p.id !== 'audit-read'
    );
  }

  private getTechnicianPermissions(): Permission[] {
    return this.getAllPermissions().filter(p => 
      ['studies-read', 'studies-write', 'patients-read', 'patients-write', 'reports-read', 'ai-read'].includes(p.id)
    );
  }

  private getViewerPermissions(): Permission[] {
    return this.getAllPermissions().filter(p => 
      ['studies-read', 'patients-read', 'reports-read', 'ai-read'].includes(p.id)
    );
  }

  private async createDefaultAdmin(): Promise<void> {
    const adminRole = Array.from(this.roles.values()).find(r => r.name === 'System Administrator');
    if (!adminRole) throw new Error('Admin role not found');

    const defaultAdmin: User = {
      id: 'admin-default',
      username: 'admin',
      email: 'admin@hospital.com',
      firstName: 'System',
      lastName: 'Administrator',
      role: adminRole,
      department: 'IT',
      isActive: true,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: this.getDefaultPreferences(),
      permissions: adminRole.permissions,
      sessions: [],
      auditLog: []
    };

    this.users.set(defaultAdmin.id, defaultAdmin);
    console.log('✅ Default admin user created');
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      defaultHangingProtocol: 'default',
      autoSaveInterval: 5,
      enableNotifications: true,
      notificationTypes: ['new_studies', 'urgent_reports'],
      defaultWindowLevel: { center: 40, width: 400 },
      keyboardShortcuts: {
        'ctrl+z': 'undo',
        'ctrl+y': 'redo',
        'ctrl+s': 'save',
        'space': 'play_pause'
      },
      displaySettings: {
        showPatientInfo: true,
        showStudyInfo: true,
        showSeriesInfo: true,
        showMeasurements: true,
        showAnnotations: true
      },
      exportSettings: {
        defaultFormat: 'DICOM',
        includeAnnotations: true,
        includeMetadata: true,
        compressionLevel: 5
      }
    };
  }

  private startBackgroundServices(): void {
    // Session cleanup
    this.sessionCheckInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Every minute

    // Audit log cleanup
    this.auditCleanupInterval = setInterval(() => {
      this.cleanupOldAuditEntries();
    }, 24 * 60 * 60 * 1000); // Daily

    // Auto-save data
    setInterval(() => {
      this.saveData();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async restoreSession(): Promise<void> {
    try {
      const savedSession = localStorage.getItem('dicom_current_session');
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        const session = this.sessions.get(sessionData.id);
        
        if (session && session.isActive && new Date() < session.expiresAt) {
          this.currentSession = session;
          this.currentUser = this.users.get(session.userId) || null;
          
          if (this.currentUser) {
            this.logAudit(this.currentUser.id, 'session_restored', 'session', session.id);
            this.emit('sessionRestored', { user: this.currentUser, session });
          }
        } else {
          localStorage.removeItem('dicom_current_session');
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      localStorage.removeItem('dicom_current_session');
    }
  }

  // Authentication Methods
  public async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      this.logAudit('anonymous', 'login_attempt', 'authentication', undefined, {
        username: request.username,
        deviceInfo: request.deviceInfo
      });

      // Find user
      const user = Array.from(this.users.values()).find(u => 
        u.username === request.username || u.email === request.username
      );

      if (!user) {
        this.logAudit('anonymous', 'login_failed', 'authentication', undefined, {
          reason: 'user_not_found',
          username: request.username
        });
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if user is active
      if (!user.isActive) {
        this.logAudit(user.id, 'login_failed', 'authentication', undefined, {
          reason: 'user_inactive'
        });
        return { success: false, error: 'Account is inactive' };
      }

      // Check lockout status
      const lockoutInfo = await this.checkLockoutStatus(user.id);
      if (lockoutInfo.isLockedOut) {
        this.logAudit(user.id, 'login_failed', 'authentication', undefined, {
          reason: 'account_locked'
        });
        return { success: false, error: 'Account is locked', lockoutInfo };
      }

      // Verify password (in real implementation, use proper password hashing)
      const passwordValid = await this.verifyPassword(request.password, user);
      if (!passwordValid) {
        await this.recordFailedLogin(user.id);
        this.logAudit(user.id, 'login_failed', 'authentication', undefined, {
          reason: 'invalid_password'
        });
        return { success: false, error: 'Invalid credentials' };
      }

      // Check MFA if enabled
      if (this.config.enableMFA && user.role.level <= 2) { // MFA for admin, supervisor, physician
        if (!request.mfaCode) {
          return {
            success: false,
            requiresMFA: true,
            mfaMethods: this.config.mfaMethods
          };
        }

        const mfaValid = await this.verifyMFA(user.id, request.mfaCode);
        if (!mfaValid) {
          this.logAudit(user.id, 'login_failed', 'authentication', undefined, {
            reason: 'invalid_mfa'
          });
          return { success: false, error: 'Invalid MFA code' };
        }
      }

      // Check concurrent sessions
      const activeSessions = Array.from(this.sessions.values()).filter(s => 
        s.userId === user.id && s.isActive
      );

      if (activeSessions.length >= this.config.sessionConfig.maxConcurrentSessions) {
        // Terminate oldest session
        const oldestSession = activeSessions.sort((a, b) => 
          a.lastActivity.getTime() - b.lastActivity.getTime()
        )[0];
        await this.terminateSession(oldestSession.id);
      }

      // Create new session
      const session = await this.createSession(user, request);
      
      // Update user
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      
      // Clear failed login attempts
      await this.clearFailedLogins(user.id);
      
      // Set current session
      this.currentUser = user;
      this.currentSession = session;
      
      // Save session to localStorage if remember me
      if (request.rememberMe) {
        localStorage.setItem('dicom_current_session', JSON.stringify({ id: session.id }));
      }

      this.logAudit(user.id, 'login_success', 'authentication', session.id);
      this.emit('userLoggedIn', { user, session });

      return { success: true, user, session };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  public async logout(): Promise<boolean> {
    if (!this.currentSession || !this.currentUser) {
      return false;
    }

    try {
      await this.terminateSession(this.currentSession.id);
      
      this.logAudit(this.currentUser.id, 'logout', 'authentication', this.currentSession.id);
      
      const user = this.currentUser;
      const session = this.currentSession;
      
      this.currentUser = null;
      this.currentSession = null;
      
      localStorage.removeItem('dicom_current_session');
      
      this.emit('userLoggedOut', { user, session });
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  private async verifyPassword(password: string, _user: User): Promise<boolean> {
    // In a real implementation, use proper password hashing (bcrypt, scrypt, etc.)
    // For demo purposes, we'll use a simple check
    return password === 'admin123' || password === 'password123';
  }

  private async verifyMFA(_userId: string, code: string): Promise<boolean> {
    // In a real implementation, verify TOTP, SMS, or email codes
    // For demo purposes, accept '123456'
    return code === '123456';
  }

  private async createSession(user: User, request: LoginRequest): Promise<UserSession> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 
      (request.rememberMe ? 
        this.config.sessionConfig.rememberMeDuration * 24 * 60 * 60 * 1000 :
        this.config.sessionConfig.maxDuration * 60 * 1000
      )
    );

    const session: UserSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      token: this.generateToken(),
      refreshToken: this.generateToken(),
      deviceInfo: request.deviceInfo,
      isActive: true,
      createdAt: now,
      lastActivity: now,
      expiresAt
    };

    this.sessions.set(session.id, session);
    user.sessions.push(session);

    return session;
  }

  private generateToken(): string {
    // In a real implementation, use a proper JWT library
    return btoa(JSON.stringify({
      timestamp: Date.now(),
      random: Math.random().toString(36).substr(2, 9)
    }));
  }

  private async terminateSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.delete(sessionId);
      
      // Remove from user's sessions
      const user = this.users.get(session.userId);
      if (user) {
        user.sessions = user.sessions.filter(s => s.id !== sessionId);
      }
      
      return true;
    }
    return false;
  }

  // User Management
  public async createUser(request: UserRegistrationRequest): Promise<User | null> {
    try {
      // Validate input
      if (!this.validateUserInput(request)) {
        throw new Error('Invalid user data');
      }

      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(u => 
        u.username === request.username || u.email === request.email
      );

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Get default role (Viewer)
      const defaultRole = Array.from(this.roles.values()).find(r => r.name === 'Viewer');
      if (!defaultRole) {
        throw new Error('Default role not found');
      }

      const user: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: request.username,
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        role: defaultRole,
        department: request.department,
        specialization: request.specialization,
        licenseNumber: request.licenseNumber,
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: this.getDefaultPreferences(),
        permissions: defaultRole.permissions,
        sessions: [],
        auditLog: []
      };

      this.users.set(user.id, user);
      
      this.logAudit(this.currentUser?.id || 'system', 'user_created', 'users', user.id, {
        username: user.username,
        email: user.email
      });
      
      this.emit('userCreated', user);
      
      return user;
    } catch (error) {
      console.error('Create user error:', error);
      return null;
    }
  }

  public getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUsers(): User[] {
    return Array.from(this.users.values());
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    try {
      const updatedUser = { ...user, ...updates, updatedAt: new Date() };
      this.users.set(id, updatedUser);
      
      this.logAudit(this.currentUser?.id || 'system', 'user_updated', 'users', id, updates);
      this.emit('userUpdated', updatedUser);
      
      return true;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  }

  public async deleteUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    try {
      // Terminate all user sessions
      const userSessions = Array.from(this.sessions.values()).filter(s => s.userId === id);
      for (const session of userSessions) {
        await this.terminateSession(session.id);
      }
      
      this.users.delete(id);
      
      this.logAudit(this.currentUser?.id || 'system', 'user_deleted', 'users', id, {
        username: user.username,
        email: user.email
      });
      
      this.emit('userDeleted', user);
      
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      return false;
    }
  }

  private validateUserInput(request: UserRegistrationRequest): boolean {
    // Basic validation
    if (!request.username || request.username.length < 3) return false;
    if (!request.email || !this.isValidEmail(request.email)) return false;
    if (!request.password || !this.isValidPassword(request.password)) return false;
    if (!request.firstName || !request.lastName) return false;
    if (!request.department) return false;
    
    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    const policy = this.config.passwordPolicy;
    
    if (password.length < policy.minLength) return false;
    if (policy.requireUppercase && !/[A-Z]/.test(password)) return false;
    if (policy.requireLowercase && !/[a-z]/.test(password)) return false;
    if (policy.requireNumbers && !/\d/.test(password)) return false;
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
    
    return true;
  }

  // Role Management
  public createRole(roleData: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt'>): UserRole {
    const role: UserRole = {
      ...roleData,
      id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.set(role.id, role);
    
    this.logAudit(this.currentUser?.id || 'system', 'role_created', 'roles', role.id, {
      name: role.name
    });
    
    this.emit('roleCreated', role);
    
    return role;
  }

  public getRole(id: string): UserRole | undefined {
    return this.roles.get(id);
  }

  public getRoles(): UserRole[] {
    return Array.from(this.roles.values());
  }

  public updateRole(id: string, updates: Partial<UserRole>): boolean {
    const role = this.roles.get(id);
    if (!role || role.isSystemRole) return false;

    const updatedRole = { ...role, ...updates, updatedAt: new Date() };
    this.roles.set(id, updatedRole);
    
    this.logAudit(this.currentUser?.id || 'system', 'role_updated', 'roles', id, updates);
    this.emit('roleUpdated', updatedRole);
    
    return true;
  }

  public deleteRole(id: string): boolean {
    const role = this.roles.get(id);
    if (!role || role.isSystemRole) return false;

    // Check if role is in use
    const usersWithRole = Array.from(this.users.values()).filter(u => u.role.id === id);
    if (usersWithRole.length > 0) {
      return false; // Cannot delete role in use
    }

    this.roles.delete(id);
    
    this.logAudit(this.currentUser?.id || 'system', 'role_deleted', 'roles', id, {
      name: role.name
    });
    
    this.emit('roleDeleted', role);
    
    return true;
  }

  // Permission Management
  public hasPermission(userId: string, resource: string, action: string): boolean {
    const user = this.users.get(userId);
    if (!user || !user.isActive) return false;

    return user.permissions.some(p => p.resource === resource && p.action === action);
  }

  public checkPermission(resource: string, action: string): boolean {
    if (!this.currentUser) return false;
    return this.hasPermission(this.currentUser.id, resource, action);
  }

  // Session Management
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentSession !== null;
  }

  public async refreshSession(): Promise<boolean> {
    if (!this.currentSession) return false;

    try {
      const session = this.sessions.get(this.currentSession.id);
      if (!session || !session.isActive) return false;

      // Update last activity
      session.lastActivity = new Date();
      
      // Extend expiration if needed
      const now = new Date();
      const timeUntilExpiry = session.expiresAt.getTime() - now.getTime();
      const halfSessionDuration = this.config.sessionConfig.maxDuration * 30 * 1000; // Half duration in ms
      
      if (timeUntilExpiry < halfSessionDuration) {
        session.expiresAt = new Date(now.getTime() + this.config.sessionConfig.maxDuration * 60 * 1000);
      }

      this.currentSession = session;
      
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }

  private async checkLockoutStatus(_userId: string): Promise<{ isLockedOut: boolean; lockoutExpires?: Date; attemptsRemaining?: number }> {
    // In a real implementation, this would check a lockout table/cache
    // For demo purposes, we'll return not locked out
    return { isLockedOut: false, attemptsRemaining: this.config.lockoutPolicy.maxFailedAttempts };
  }

  private async recordFailedLogin(userId: string): Promise<void> {
    // In a real implementation, record failed login attempts
    console.log('Recording failed login for user:', userId);
  }

  private async clearFailedLogins(userId: string): Promise<void> {
    // In a real implementation, clear failed login attempts
    console.log('Clearing failed logins for user:', userId);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    this.sessions.forEach((session, id) => {
      if (now > session.expiresAt || 
          (now.getTime() - session.lastActivity.getTime()) > 
          (this.config.sessionConfig.inactivityTimeout * 60 * 1000)) {
        expiredSessions.push(id);
      }
    });

    expiredSessions.forEach(id => {
      this.terminateSession(id);
    });

    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  private cleanupOldAuditEntries(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365); // Keep 1 year of audit logs

    const initialCount = this.auditLog.length;
    this.auditLog = this.auditLog.filter(entry => entry.timestamp > cutoffDate);
    
    const removedCount = initialCount - this.auditLog.length;
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old audit entries`);
    }
  }

  // Audit Logging
  private logAudit(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details: { [key: string]: any } = {},
    success: boolean = true,
    errorMessage?: string
  ): void {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: '127.0.0.1', // In real implementation, get from request
      userAgent: navigator.userAgent,
      timestamp: new Date(),
      success,
      errorMessage
    };

    this.auditLog.push(entry);
    
    // Add to user's audit log if user exists
    const user = this.users.get(userId);
    if (user) {
      user.auditLog.push(entry);
      
      // Keep only last 1000 entries per user
      if (user.auditLog.length > 1000) {
        user.auditLog = user.auditLog.slice(-1000);
      }
    }

    this.emit('auditLog', entry);
  }

  public getAuditLog(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let filteredLog = [...this.auditLog];

    if (filters) {
      if (filters.userId) {
        filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
      }
      if (filters.action) {
        filteredLog = filteredLog.filter(entry => entry.action === filters.action);
      }
      if (filters.resource) {
        filteredLog = filteredLog.filter(entry => entry.resource === filters.resource);
      }
      if (filters.startDate) {
        filteredLog = filteredLog.filter(entry => entry.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLog = filteredLog.filter(entry => entry.timestamp <= filters.endDate!);
      }
      if (filters.limit) {
        filteredLog = filteredLog.slice(-filters.limit);
      }
    }

    return filteredLog.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Data Persistence
  private saveData(): void {
    try {
      // Save users
      const users = Array.from(this.users.values());
      localStorage.setItem('dicom_users', JSON.stringify(users));

      // Save roles
      const roles = Array.from(this.roles.values());
      localStorage.setItem('dicom_roles', JSON.stringify(roles));

      // Save audit log (keep only last 10000 entries)
      const auditLog = this.auditLog.slice(-10000);
      localStorage.setItem('dicom_audit_log', JSON.stringify(auditLog));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  // Configuration
  public updateConfig(updates: Partial<AuthenticationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  public getConfig(): AuthenticationConfig {
    return this.config;
  }

  // Cleanup
  public destroy(): void {
    // Save data before destroying
    this.saveData();
    
    // Clear intervals
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    if (this.auditCleanupInterval) {
      clearInterval(this.auditCleanupInterval);
    }
    
    // Clear collections
    this.users.clear();
    this.roles.clear();
    this.sessions.clear();
    this.auditLog.length = 0;
    
    // Reset state
    this.currentUser = null;
    this.currentSession = null;
    this.isInitialized = false;
    
    // Remove all listeners
    this.removeAllListeners();
    
    console.log('✅ User Management System destroyed');
  }
}

export default UserManagementSystem;