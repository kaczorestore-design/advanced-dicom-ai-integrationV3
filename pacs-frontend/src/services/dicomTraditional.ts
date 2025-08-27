import { DICOMwebService, DICOMwebConfig } from './dicomweb';

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

  private async sendDIMSECommand(command: any): Promise<any> {
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

  async cFind(criteria: StudySearchCriteria): Promise<any[]> {
    const command = {
      type: 'C-FIND',
      level: 'STUDY',
      criteria: {
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

    return this.sendDIMSECommand(command);
  }

  async cFindSeries(criteria: SeriesSearchCriteria): Promise<any[]> {
    const command = {
      type: 'C-FIND',
      level: 'SERIES',
      criteria: {
        '0020,000D': criteria.StudyInstanceUID,
        '0020,000E': criteria.SeriesInstanceUID || '',
        '0008,0060': criteria.Modality || '',
        '0008,103E': criteria.SeriesDescription || '',
        '0020,0011': criteria.SeriesNumber || '',
      }
    };

    return this.sendDIMSECommand(command);
  }

  async cFindInstances(criteria: InstanceSearchCriteria): Promise<any[]> {
    const command = {
      type: 'C-FIND',
      level: 'IMAGE',
      criteria: {
        '0020,000D': criteria.StudyInstanceUID,
        '0020,000E': criteria.SeriesInstanceUID,
        '0008,0018': criteria.SOPInstanceUID || '',
        '0020,0013': criteria.InstanceNumber || '',
      }
    };

    return this.sendDIMSECommand(command);
  }

  async cMove(
    studyInstanceUID: string,
    seriesInstanceUID?: string,
    sopInstanceUID?: string,
    destinationAET?: string
  ): Promise<any> {
    const command = {
      type: 'C-MOVE',
      destinationAET: destinationAET || this.config.callingAET,
      criteria: {
        '0020,000D': studyInstanceUID,
        ...(seriesInstanceUID && { '0020,000E': seriesInstanceUID }),
        ...(sopInstanceUID && { '0008,0018': sopInstanceUID }),
      }
    };

    return this.sendDIMSECommand(command);
  }

  async cGet(
    studyInstanceUID: string,
    seriesInstanceUID?: string,
    sopInstanceUID?: string
  ): Promise<any> {
    const command = {
      type: 'C-GET',
      criteria: {
        '0020,000D': studyInstanceUID,
        ...(seriesInstanceUID && { '0020,000E': seriesInstanceUID }),
        ...(sopInstanceUID && { '0008,0018': sopInstanceUID }),
      }
    };

    return this.sendDIMSECommand(command);
  }

  async cStore(dicomData: ArrayBuffer, sopInstanceUID: string): Promise<any> {
    const command = {
      type: 'C-STORE',
      sopInstanceUID,
      dicomData: Array.from(new Uint8Array(dicomData)),
    };

    return this.sendDIMSECommand(command);
  }

  async cEcho(): Promise<boolean> {
    try {
      const command = {
        type: 'C-ECHO'
      };

      const response = await this.sendDIMSECommand(command);
      return response.status === 'SUCCESS';
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

  async searchStudies(criteria: StudySearchCriteria, useDIMSE = false): Promise<any[]> {
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
  ): Promise<any> {
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
          serie['0020000E'].Value[0]
        );
        instances.push(...seriesInstances);
      }
      
      return instances;
    } else {
      throw new Error('No DICOM service configured');
    }
  }

  async storeStudy(dicomFiles: File[], useDIMSE = false): Promise<any> {
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
      } catch (error) {
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
