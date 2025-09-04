import { FHIRPatient, FHIRImagingStudy, FHIRDiagnosticReport, EMRSystem } from '@/components/integration/EMRIntegration';

// FHIR Resource base interface
interface FHIRResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

// FHIR Bundle interface
interface FHIRBundle<T = Record<string, unknown>> {
  resourceType: 'Bundle';
  id?: string;
  type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
  timestamp?: string;
  total?: number;
  link?: Array<{
    relation: string;
    url: string;
  }>;
  entry?: Array<{
    fullUrl?: string;
    resource?: T;
    search?: {
      mode?: 'match' | 'include' | 'outcome';
      score?: number;
    };
    request?: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      url: string;
      ifNoneMatch?: string;
      ifModifiedSince?: string;
      ifMatch?: string;
      ifNoneExist?: string;
    };
    response?: {
      status: string;
      location?: string;
      etag?: string;
      lastModified?: string;
    };
  }>;
}

// FHIR OperationOutcome interface
interface FHIROperationOutcome {
  resourceType: 'OperationOutcome';
  id?: string;
  issue: Array<{
    severity: 'fatal' | 'error' | 'warning' | 'information';
    code: string;
    details?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
      text?: string;
    };
    diagnostics?: string;
    location?: string[];
    expression?: string[];
  }>;
}

// FHIR Search Parameters
interface FHIRSearchParams {
  _id?: string;
  _lastUpdated?: string;
  _tag?: string;
  _profile?: string;
  _security?: string;
  _text?: string;
  _content?: string;
  _list?: string;
  _has?: string;
  _type?: string;
  _count?: number;
  _offset?: number;
  _sort?: string;
  _include?: string;
  _revinclude?: string;
  _summary?: 'true' | 'text' | 'data' | 'count' | 'false';
  _elements?: string;
  _contained?: 'true' | 'false';
  _containedtyped?: 'true' | 'false';
  [key: string]: string | number | boolean | undefined; // For resource-specific parameters
}

// Authentication Token
interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  issued_at: number;
}

// FHIR Client Configuration
interface FHIRClientConfig {
  baseUrl: string;
  fhirVersion: 'R4' | 'R5' | 'STU3' | 'DSTU2';
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  customHeaders: Record<string, string>;
}

// FHIR Client Error
class FHIRClientError extends Error {
  public statusCode?: number;
  public operationOutcome?: FHIROperationOutcome;
  public response?: Response;

  constructor(
    message: string,
    statusCode?: number,
    operationOutcome?: FHIROperationOutcome,
    response?: Response
  ) {
    super(message);
    this.name = 'FHIRClientError';
    this.statusCode = statusCode;
    this.operationOutcome = operationOutcome;
    this.response = response;
  }
}

// FHIR Client Class
class FHIRClient {
  private config: FHIRClientConfig;
  private authToken?: AuthToken;
  private emrSystem: EMRSystem;

  constructor(emrSystem: EMRSystem) {
    this.emrSystem = emrSystem;
    this.config = {
      baseUrl: emrSystem.baseUrl,
      fhirVersion: emrSystem.fhirVersion,
      timeout: emrSystem.timeout * 1000,
      retryAttempts: emrSystem.retryAttempts,
      retryDelay: 1000,
      customHeaders: {
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
        ...emrSystem.customHeaders
      }
    };
  }

  // Authentication methods
  async authenticate(): Promise<void> {
    switch (this.emrSystem.authType) {
      case 'oauth2':
        await this.authenticateOAuth2();
        break;
      case 'bearer':
        this.setBearerToken();
        break;
      case 'basic':
        this.setBasicAuth();
        break;
      case 'apikey':
        this.setApiKey();
        break;
      case 'certificate':
        await this.authenticateCertificate();
        break;
      default:
        throw new FHIRClientError(`Unsupported authentication type: ${this.emrSystem.authType}`);
    }
  }

  private async authenticateOAuth2(): Promise<void> {
    if (!this.emrSystem.clientId || !this.emrSystem.clientSecret || !this.emrSystem.tokenUrl) {
      throw new FHIRClientError('OAuth2 configuration incomplete');
    }

    const tokenRequest = {
      grant_type: 'client_credentials',
      client_id: this.emrSystem.clientId,
      client_secret: this.emrSystem.clientSecret,
      scope: this.emrSystem.scope || ''
    };

    try {
      const response = await fetch(this.emrSystem.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenRequest)
      });

      if (!response.ok) {
        throw new FHIRClientError(
          `OAuth2 authentication failed: ${response.statusText}`,
          response.status
        );
      }

      const tokenData = await response.json();
      this.authToken = {
        ...tokenData,
        issued_at: Date.now()
      };

      // Set authorization header
      this.config.customHeaders['Authorization'] = `${this.authToken?.token_type} ${this.authToken?.access_token}`;
    } catch (error) {
      throw new FHIRClientError(
        `OAuth2 authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private setBearerToken(): void {
    if (!this.emrSystem.apiKey) {
      throw new FHIRClientError('Bearer token not configured');
    }
    this.config.customHeaders['Authorization'] = `Bearer ${this.emrSystem.apiKey}`;
  }

  private setBasicAuth(): void {
    if (!this.emrSystem.username || !this.emrSystem.password) {
      throw new FHIRClientError('Basic authentication credentials not configured');
    }
    const credentials = btoa(`${this.emrSystem.username}:${this.emrSystem.password}`);
    this.config.customHeaders['Authorization'] = `Basic ${credentials}`;
  }

  private setApiKey(): void {
    if (!this.emrSystem.apiKey) {
      throw new FHIRClientError('API key not configured');
    }
    this.config.customHeaders['X-API-Key'] = this.emrSystem.apiKey;
  }

  private async authenticateCertificate(): Promise<void> {
    // Certificate authentication would require additional setup
    // This is a placeholder for certificate-based authentication
    throw new FHIRClientError('Certificate authentication not yet implemented');
  }

  // Check if token needs refresh
  private isTokenExpired(): boolean {
    if (!this.authToken) return true;
    const expiresAt = this.authToken.issued_at + (this.authToken.expires_in * 1000);
    return Date.now() >= expiresAt - 60000; // Refresh 1 minute before expiry
  }

  // Refresh OAuth2 token
  private async refreshToken(): Promise<void> {
    if (this.emrSystem.authType === 'oauth2' && this.authToken?.refresh_token) {
      const tokenRequest = {
        grant_type: 'refresh_token',
        refresh_token: this.authToken.refresh_token,
        client_id: this.emrSystem.clientId!,
        client_secret: this.emrSystem.clientSecret!
      };

      try {
        const response = await fetch(this.emrSystem.tokenUrl!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams(tokenRequest)
        });

        if (response.ok) {
          const tokenData = await response.json();
          this.authToken = {
            ...tokenData,
            issued_at: Date.now()
          };
          this.config.customHeaders['Authorization'] = `${this.authToken?.token_type} ${this.authToken?.access_token}`;
        } else {
          // If refresh fails, re-authenticate
          await this.authenticate();
        }
      } catch {
        // If refresh fails, re-authenticate
        await this.authenticate();
      }
    } else {
      // Re-authenticate for other auth types
      await this.authenticate();
    }
  }

  // HTTP request wrapper with retry logic
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    body?: Record<string, unknown> | string | FHIRBundle | FHIRResource,
    headers?: Record<string, string>
  ): Promise<T> {
    // Check and refresh token if needed
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }

    const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}/${url.replace(/^\//, '')}`;
    
    const requestHeaders = {
      ...this.config.customHeaders,
      ...headers
    };

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(this.config.timeout)
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(fullUrl, requestOptions);
        
        if (!response.ok) {
          let operationOutcome: FHIROperationOutcome | undefined;
          
          try {
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/fhir+json') || contentType?.includes('application/json')) {
              const errorData = await response.json();
              if (errorData.resourceType === 'OperationOutcome') {
                operationOutcome = errorData;
              }
            }
          } catch {
            // Ignore JSON parsing errors for error responses
          }
          
          throw new FHIRClientError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            operationOutcome,
            response
          );
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/fhir+json') || contentType?.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text() as T;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError!;
  }

  // FHIR Resource operations
  async read<T>(resourceType: string, id: string): Promise<T> {
    return this.request<T>('GET', `${resourceType}/${id}`);
  }

  async create<T extends FHIRResource>(resource: T): Promise<T> {
    const resourceType = resource.resourceType;
    if (!resourceType) {
      throw new FHIRClientError('Resource must have a resourceType');
    }
    return this.request<T>('POST', resourceType, resource);
  }

  async update<T extends FHIRResource>(resource: T): Promise<T> {
    const resourceType = resource.resourceType;
    const id = resource.id;
    if (!resourceType || !id) {
      throw new FHIRClientError('Resource must have resourceType and id for update');
    }
    return this.request<T>('PUT', `${resourceType}/${id}`, resource);
  }

  async delete(resourceType: string, id: string): Promise<void> {
    await this.request<void>('DELETE', `${resourceType}/${id}`);
  }

  async search<T>(
    resourceType: string,
    params?: FHIRSearchParams
  ): Promise<FHIRBundle<T>> {
    let url = resourceType;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }
    
    return this.request<FHIRBundle<T>>('GET', url);
  }

  async searchAll<T>(
    resourceType: string,
    params?: FHIRSearchParams
  ): Promise<T[]> {
    const results: T[] = [];
    let nextUrl: string | undefined;
    let searchParams = { ...params, _count: params?._count || 100 };
    
    do {
      const bundle = await this.search<T>(resourceType, searchParams);
      
      if (bundle.entry) {
        results.push(...bundle.entry.map(entry => entry.resource!));
      }
      
      // Find next page link
      nextUrl = bundle.link?.find(link => link.relation === 'next')?.url;
      
      if (nextUrl) {
        // Extract search parameters from next URL
        const url = new URL(nextUrl);
        searchParams = { ...Object.fromEntries(url.searchParams.entries()), _count: 100 };
      }
    } while (nextUrl);
    
    return results;
  }

  // Capability Statement
  async getCapabilityStatement(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('GET', 'metadata');
  }

  // Batch operations
  async batch(bundle: FHIRBundle): Promise<FHIRBundle> {
    return this.request<FHIRBundle>('POST', '', bundle);
  }

  async transaction(bundle: FHIRBundle): Promise<FHIRBundle> {
    bundle.type = 'transaction';
    return this.request<FHIRBundle>('POST', '', bundle);
  }

  // Specific resource methods
  async getPatient(id: string): Promise<FHIRPatient> {
    return this.read<FHIRPatient>('Patient', id);
  }

  async searchPatients(params?: {
    name?: string;
    family?: string;
    given?: string;
    identifier?: string;
    birthdate?: string;
    gender?: string;
    _count?: number;
  }): Promise<FHIRBundle<FHIRPatient>> {
    return this.search<FHIRPatient>('Patient', params);
  }

  async getImagingStudy(id: string): Promise<FHIRImagingStudy> {
    return this.read<FHIRImagingStudy>('ImagingStudy', id);
  }

  async searchImagingStudies(params?: {
    patient?: string;
    subject?: string;
    started?: string;
    modality?: string;
    bodysite?: string;
    status?: string;
    _count?: number;
  }): Promise<FHIRBundle<FHIRImagingStudy>> {
    return this.search<FHIRImagingStudy>('ImagingStudy', params);
  }

  async getDiagnosticReport(id: string): Promise<FHIRDiagnosticReport> {
    return this.read<FHIRDiagnosticReport>('DiagnosticReport', id);
  }

  async searchDiagnosticReports(params?: {
    patient?: string;
    subject?: string;
    date?: string;
    category?: string;
    code?: string;
    status?: string;
    _count?: number;
  }): Promise<FHIRBundle<FHIRDiagnosticReport>> {
    return this.search<FHIRDiagnosticReport>('DiagnosticReport', params);
  }

  // Patient everything operation
  async getPatientEverything(patientId: string): Promise<FHIRBundle> {
    return this.request<FHIRBundle>('GET', `Patient/${patientId}/$everything`);
  }

  // Validate resource
  async validate<T extends FHIRResource>(resource: T): Promise<FHIROperationOutcome> {
    const resourceType = resource.resourceType;
    if (!resourceType) {
      throw new FHIRClientError('Resource must have a resourceType');
    }
    return this.request<FHIROperationOutcome>('POST', `${resourceType}/$validate`, resource);
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getCapabilityStatement();
      return true;
    } catch {
      return false;
    }
  }

  // Get system information
  getSystemInfo(): {
    name: string;
    type: string;
    baseUrl: string;
    fhirVersion: string;
    authType: string;
  } {
    return {
      name: this.emrSystem.name,
      type: this.emrSystem.type,
      baseUrl: this.emrSystem.baseUrl,
      fhirVersion: this.emrSystem.fhirVersion,
      authType: this.emrSystem.authType
    };
  }
}

// FHIR Client Factory
class FHIRClientFactory {
  private static clients: Map<string, FHIRClient> = new Map();

  static getClient(emrSystem: EMRSystem): FHIRClient {
    const existingClient = this.clients.get(emrSystem.id);
    if (existingClient) {
      return existingClient;
    }

    const client = new FHIRClient(emrSystem);
    this.clients.set(emrSystem.id, client);
    return client;
  }

  static removeClient(systemId: string): void {
    this.clients.delete(systemId);
  }

  static clearClients(): void {
    this.clients.clear();
  }
}

// FHIR Utilities
class FHIRUtils {
  // Extract patient name
  static getPatientName(patient: FHIRPatient): string {
    if (!patient.name || patient.name.length === 0) {
      return 'Unknown';
    }

    const name = patient.name[0];
    const given = name.given?.join(' ') || '';
    const family = name.family || '';
    
    return `${given} ${family}`.trim() || 'Unknown';
  }

  // Extract patient identifier
  static getPatientIdentifier(patient: FHIRPatient, system?: string): string | undefined {
    if (!patient.identifier) return undefined;
    
    if (system) {
      const identifier = patient.identifier.find(id => id.system === system);
      return identifier?.value;
    }
    
    return patient.identifier[0]?.value;
  }

  // Format FHIR date
  static formatFHIRDate(fhirDate: string): Date {
    return new Date(fhirDate);
  }

  // Create FHIR date string
  static toFHIRDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Create FHIR datetime string
  static toFHIRDateTime(date: Date): string {
    return date.toISOString();
  }

  // Extract coding display
  static getCodingDisplay(coding: Array<{ system?: string; code?: string; display?: string; }>): string {
    if (!coding || coding.length === 0) return 'Unknown';
    return coding[0].display || coding[0].code || 'Unknown';
  }

  // Create reference
  static createReference(resourceType: string, id: string, display?: string): { reference: string; display?: string } {
    return {
      reference: `${resourceType}/${id}`,
      display
    };
  }

  // Parse reference
  static parseReference(reference: string): { resourceType: string; id: string } | null {
    const match = reference.match(/^([A-Za-z]+)\/(.+)$/);
    if (!match) return null;
    
    return {
      resourceType: match[1],
      id: match[2]
    };
  }

  // Validate FHIR resource
  static validateResource(resource: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!resource.resourceType) {
      errors.push('Missing resourceType');
    }
    
    // Add more validation rules as needed
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export {
  FHIRClient,
  FHIRClientFactory,
  FHIRClientError,
  FHIRUtils,
  type FHIRBundle,
  type FHIROperationOutcome,
  type FHIRSearchParams,
  type AuthToken,
  type FHIRClientConfig
};