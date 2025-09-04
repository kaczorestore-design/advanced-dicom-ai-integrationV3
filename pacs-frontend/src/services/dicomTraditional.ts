import { DICOMwebService, DICOMwebConfig, DICOMStudy, DICOMSeries, DICOMInstance } from './dicomweb';

export interface DIMSECommand {
  commandType: 'C-FIND' | 'C-MOVE' | 'C-GET' | 'C-STORE' | 'C-ECHO';
  dataset?: Record<string, unknown>;
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  destinationAET?: string;
}

export interface DIMSEResponse {
  status: number;
  dataset?: Record<string, unknown>;
  error?: string;
}

export interface MoveResponse {
  status: 'pending' | 'success' | 'failed';
  numberOfCompletedSubOperations?: number;
  numberOfRemainingSubOperations?: number;
  numberOfFailedSubOperations?: number;
  numberOfWarningSubOperations?: number;
}

export interface StoreResponse {
  status: 'success' | 'failed';
  sopInstanceUID: string;
  error?: string;
}

export interface DIMSEConfig {
  websocketUrl: string;
  host?: string;
  port?: number;
  callingAET?: string;
  calledAET?: string;
  timeout?: number;
}

export interface StudySearchCriteria {
  PatientID?: string;
  PatientName?: string;
  StudyDate?: string;
  StudyTime?: string;
  AccessionNumber?: string;
  StudyInstanceUID?: string;
  Modality?: string;
  StudyDescription?: string;
}

export interface SeriesSearchCriteria {
  StudyInstanceUID: string;
  SeriesInstanceUID?: string;
  Modality?: string;
  SeriesDescription?: string;
  SeriesNumber?: string;
}

export interface InstanceSearchCriteria {
  StudyInstanceUID: string;
  SeriesInstanceUID: string;
  SOPInstanceUID?: string;
  InstanceNumber?: string;
}

export class DIMSEService {
  private config: DIMSEConfig;
  private wsConnection: WebSocket | null = null;

  constructor(config: DIMSEConfig) {
    this.config = config;
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.websocketUrl || `ws://localhost:8080/dimse`;
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('DIMSE WebSocket connected');
        resolve();
      };

      this.wsConnection.onerror = (error) => {
        console.error('DIMSE WebSocket error:', error);
        reject(error);
      };

      this.wsConnection.onclose = () => {
        console.log('DIMSE WebSocket disconnected');
        this.wsConnection = null;
      };
    });
  }

  private async sendDIMSECommand(command: DIMSECommand): Promise<DIMSEResponse> {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      await this.connectWebSocket();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('DIMSE command timeout'));
      }, this.config.timeout || 30000);

      const messageHandler = (event: MessageEvent) => {
        clearTimeout(timeout);
        this.wsConnection?.removeEventListener('message', messageHandler);
        
        try {
          const response = JSON.parse(event.data);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        } catch (error) {
          reject(error);
        }
      };

      this.wsConnection?.addEventListener('message', messageHandler);
      this.wsConnection?.send(JSON.stringify({
        ...command,
        config: this.config
      }));
    });
  }

  async cFind(criteria: StudySearchCriteria): Promise<DICOMStudy[]> {
    const command = {
      commandType: 'C-FIND' as const,
      level: 'STUDY',
      dataset: {
        '0010,0020': criteria.PatientID || '',
        '0010,0010': criteria.PatientName || '',
        '0008,0020': criteria.StudyDate || '',
        '0008,0030': criteria.StudyTime || '',
        '0008,0050': criteria.AccessionNumber || '',
        '0020,000D': criteria.StudyInstanceUID || '',
        '0008,0060': criteria.Modality || '',
        '0008,1030': criteria.StudyDescription || '',
      }
    };

    const response = await this.sendDIMSECommand(command);
    // Convert DIMSE response to DICOMStudy array
    return response.dataset ? [response.dataset as DICOMStudy] : [];
  }

  async cFindSeries(criteria: SeriesSearchCriteria): Promise<DICOMSeries[]> {
    const command = {
      commandType: 'C-FIND' as const,
      level: 'SERIES',
      dataset: {
        '0020,000D': criteria.StudyInstanceUID,
        '0020,000E': criteria.SeriesInstanceUID || '',
        '0008,0060': criteria.Modality || '',
        '0008,103E': criteria.SeriesDescription || '',
        '0020,0011': criteria.SeriesNumber || '',
      }
    };

    const response = await this.sendDIMSECommand(command);
    // Convert DIMSE response to DICOMSeries array
    return response.dataset ? [response.dataset as DICOMSeries] : [];
  }

  async cFindInstances(criteria: InstanceSearchCriteria): Promise<DICOMInstance[]> {
    const command = {
      commandType: 'C-FIND' as const,
      level: 'IMAGE',
      dataset: {
        '0020,000D': criteria.StudyInstanceUID,
        '0020,000E': criteria.SeriesInstanceUID,
        '0008,0018': criteria.SOPInstanceUID || '',
        '0020,0013': criteria.InstanceNumber || '',
      }
    };

    const response = await this.sendDIMSECommand(command);
    // Convert DIMSE response to DICOMInstance array
    return response.dataset ? [response.dataset as DICOMInstance] : [];
  }

  async cMove(
    studyInstanceUID: string,
    seriesInstanceUID?: string,
    sopInstanceUID?: string,
    destinationAET?: string
  ): Promise<MoveResponse> {
    const command = {
      commandType: 'C-MOVE' as const,
      destinationAET: destinationAET || this.config.callingAET,
      dataset: {
        '0020,000D': studyInstanceUID,
        ...(seriesInstanceUID && { '0020,000E': seriesInstanceUID }),
        ...(sopInstanceUID && { '0008,0018': sopInstanceUID }),
      }
    };

    const response = await this.sendDIMSECommand(command);
    return {
       status: response.status === 0 ? 'success' : 'failed',
       numberOfCompletedSubOperations: 0,
       numberOfRemainingSubOperations: 0,
       numberOfFailedSubOperations: 0,
       numberOfWarningSubOperations: 0
     };
  }

  async cGet(
    studyInstanceUID: string,
    seriesInstanceUID?: string,
    sopInstanceUID?: string
  ): Promise<DICOMInstance[]> {
    const command = {
      commandType: 'C-GET' as const,
      dataset: {
        '0020,000D': studyInstanceUID,
        ...(seriesInstanceUID && { '0020,000E': seriesInstanceUID }),
        ...(sopInstanceUID && { '0008,0018': sopInstanceUID }),
      }
    };

    const response = await this.sendDIMSECommand(command);
    // Convert DIMSE response to DICOMInstance array
    return response.dataset ? [response.dataset as DICOMInstance] : [];
  }

  async cStore(dicomData: ArrayBuffer, sopInstanceUID: string): Promise<StoreResponse> {
    const command = {
      commandType: 'C-STORE' as const,
      sopInstanceUID,
      dicomData: Array.from(new Uint8Array(dicomData)),
    };

    const response = await this.sendDIMSECommand(command);
    return {
      status: response.status === 0 ? 'success' : 'failed',
      sopInstanceUID,
      error: response.error
    };
  }

  async cEcho(): Promise<boolean> {
    try {
      const command = {
        commandType: 'C-ECHO' as const
      };

      const response = await this.sendDIMSECommand(command);
      return response.status === 0; // 0 indicates success in DICOM
    } catch (error) {
      console.error('C-ECHO failed:', error);
      return false;
    }
  }

  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }
}

export class DICOMNetworkService {
  private dicomwebService?: DICOMwebService;
  private dimseService?: DIMSEService;

  constructor(
    dicomwebConfig?: DICOMwebConfig,
    dimseConfig?: DIMSEConfig
  ) {
    if (dicomwebConfig) {
      this.dicomwebService = new DICOMwebService(dicomwebConfig);
    }
    if (dimseConfig) {
      this.dimseService = new DIMSEService(dimseConfig);
    }
  }

  async searchStudies(criteria: StudySearchCriteria, useDIMSE = false): Promise<DICOMStudy[]> {
    if (useDIMSE && this.dimseService) {
      return this.dimseService.cFind(criteria);
    } else if (this.dicomwebService) {
      return this.dicomwebService.searchStudies({
        PatientID: criteria.PatientID,
        StudyDate: criteria.StudyDate,
        Modality: criteria.Modality,
      });
    } else {
      throw new Error('No DICOM service configured');
    }
  }

  async retrieveStudy(
    studyInstanceUID: string,
    useDIMSE = false,
    destinationAET?: string
  ): Promise<MoveResponse | DICOMInstance[]> {
    if (useDIMSE && this.dimseService) {
      if (destinationAET) {
        return this.dimseService.cMove(studyInstanceUID, undefined, undefined, destinationAET);
      } else {
        return this.dimseService.cGet(studyInstanceUID);
      }
    } else if (this.dicomwebService) {
      const series = await this.dicomwebService.searchSeries(studyInstanceUID);
      const instances = [];
      
      for (const serie of series) {
        const seriesInstances = await this.dicomwebService.searchInstances(
          studyInstanceUID,
          (serie as Record<string, { Value: string[] }>)['0020000E'].Value[0]
        );
        instances.push(...seriesInstances);
      }
      
      return instances;
    } else {
      throw new Error('No DICOM service configured');
    }
  }

  async storeStudy(dicomFiles: File[], useDIMSE = false): Promise<StoreResponse[] | import('./dicomweb').StoreResponse> {
    if (useDIMSE && this.dimseService) {
      const results = [];
      for (const file of dicomFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const sopInstanceUID = this.extractSOPInstanceUID(arrayBuffer);
        const result = await this.dimseService.cStore(arrayBuffer, sopInstanceUID);
        results.push(result);
      }
      return results;
    } else if (this.dicomwebService) {
      return this.dicomwebService.storeInstances(dicomFiles);
    } else {
      throw new Error('No DICOM service configured');
    }
  }

  async testConnection(useDIMSE = false): Promise<boolean> {
    if (useDIMSE && this.dimseService) {
      return this.dimseService.cEcho();
    } else if (this.dicomwebService) {
      try {
        await this.dicomwebService.searchStudies({ limit: 1 });
        return true;
      } catch {
        return false;
      }
    } else {
      return false;
    }
  }

  private extractSOPInstanceUID(dicomData: ArrayBuffer): string {
    const view = new DataView(dicomData);
    let offset = 128 + 4;
    
    while (offset < dicomData.byteLength - 8) {
      const group = view.getUint16(offset, true);
      const element = view.getUint16(offset + 2, true);
      
      if (group === 0x0008 && element === 0x0018) {
        const length = view.getUint16(offset + 6, true);
        const valueOffset = offset + 8;
        const value = new TextDecoder().decode(new Uint8Array(dicomData, valueOffset, length));
        return value.trim();
      }
      
      const length = view.getUint16(offset + 6, true);
      offset += 8 + length;
    }
    
    throw new Error('SOP Instance UID not found in DICOM data');
  }
}
