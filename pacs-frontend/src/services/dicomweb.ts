export interface DICOMwebConfig {
  wadoRsUrl: string;
  qidoRsUrl: string;
  stowRsUrl: string;
  authToken?: string;
}

export interface DICOMStudy {
  StudyInstanceUID: string;
  PatientID?: string;
  PatientName?: string;
  StudyDate?: string;
  StudyTime?: string;
  StudyDescription?: string;
  Modality?: string;
  [key: string]: unknown;
}

export interface DICOMSeries {
  SeriesInstanceUID: string;
  StudyInstanceUID: string;
  SeriesNumber?: string;
  SeriesDescription?: string;
  Modality?: string;
  NumberOfSeriesRelatedInstances?: number;
  [key: string]: unknown;
}

export interface DICOMInstance {
  SOPInstanceUID: string;
  SeriesInstanceUID: string;
  StudyInstanceUID: string;
  InstanceNumber?: string;
  SOPClassUID?: string;
  [key: string]: unknown;
}

export interface DICOMMetadata {
  [tag: string]: {
    vr: string;
    Value?: unknown[];
    BulkDataURI?: string;
  };
}

export interface StoreResponse {
  ReferencedSOPSequence?: Array<{
    ReferencedSOPClassUID: string;
    ReferencedSOPInstanceUID: string;
  }>;
  FailedSOPSequence?: Array<{
    ReferencedSOPClassUID: string;
    ReferencedSOPInstanceUID: string;
    FailureReason: number;
  }>;
}

export class DICOMwebService {
  public config: DICOMwebConfig;

  constructor(config: DICOMwebConfig) {
    this.config = config;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/dicom+json',
    };
    
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }
    
    return headers;
  }

  async searchStudies(params: {
    PatientID?: string;
    StudyDate?: string;
    Modality?: string;
    limit?: number;
    offset?: number;
  }): Promise<DICOMStudy[]> {
    const searchParams = new URLSearchParams();
    
    if (params.PatientID) searchParams.append('00100020', params.PatientID);
    if (params.StudyDate) searchParams.append('00080020', params.StudyDate);
    if (params.Modality) searchParams.append('00080060', params.Modality);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const url = `${this.config.qidoRsUrl}/studies?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`QIDO-RS search failed: ${response.statusText}`);
    }

    return response.json();
  }

  async searchSeries(studyInstanceUID: string, params?: {
    Modality?: string;
    SeriesDescription?: string;
  }): Promise<DICOMSeries[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.Modality) searchParams.append('00080060', params.Modality);
    if (params?.SeriesDescription) searchParams.append('0008103E', params.SeriesDescription);

    const url = `${this.config.qidoRsUrl}/studies/${studyInstanceUID}/series?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`QIDO-RS series search failed: ${response.statusText}`);
    }

    return response.json();
  }

  async searchInstances(studyInstanceUID: string, seriesInstanceUID: string): Promise<DICOMInstance[]> {
    const url = `${this.config.qidoRsUrl}/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`QIDO-RS instances search failed: ${response.statusText}`);
    }

    return response.json();
  }

  async retrieveInstance(
    studyInstanceUID: string,
    seriesInstanceUID: string,
    sopInstanceUID: string,
    transferSyntax?: string
  ): Promise<ArrayBuffer> {
    const url = `${this.config.wadoRsUrl}/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${sopInstanceUID}`;
    
    const headers: Record<string, string> = { ...this.getHeaders() };
    
    if (transferSyntax) {
      headers['Accept'] = `application/dicom; transfer-syntax=${transferSyntax}`;
    } else {
      headers['Accept'] = 'application/dicom';
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`WADO-RS retrieve failed: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  async retrieveRenderedInstance(
    studyInstanceUID: string,
    seriesInstanceUID: string,
    sopInstanceUID: string,
    params?: {
      viewport?: string;
      window?: string;
      quality?: number;
    }
  ): Promise<Blob> {
    let url = `${this.config.wadoRsUrl}/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${sopInstanceUID}/rendered`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.viewport) searchParams.append('viewport', params.viewport);
      if (params.window) searchParams.append('window', params.window);
      if (params.quality) searchParams.append('quality', params.quality.toString());
      
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'image/jpeg, image/png',
        ...this.getHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`WADO-RS rendered retrieve failed: ${response.statusText}`);
    }

    return response.blob();
  }

  async storeInstances(dicomFiles: File[]): Promise<StoreResponse> {
    const formData = new FormData();
    
    dicomFiles.forEach((file, index) => {
      formData.append(`file${index}`, file, file.name);
    });

    const response = await fetch(`${this.config.stowRsUrl}/studies`, {
      method: 'POST',
      headers: {
        'Accept': 'application/dicom+json',
        ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`STOW-RS store failed: ${response.statusText}`);
    }

    return response.json();
  }

  async retrieveMetadata(
    studyInstanceUID: string,
    seriesInstanceUID?: string,
    sopInstanceUID?: string
  ): Promise<DICOMMetadata[]> {
    let url = `${this.config.wadoRsUrl}/studies/${studyInstanceUID}`;
    
    if (seriesInstanceUID) {
      url += `/series/${seriesInstanceUID}`;
      if (sopInstanceUID) {
        url += `/instances/${sopInstanceUID}`;
      }
    }
    
    url += '/metadata';

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`WADO-RS metadata retrieve failed: ${response.statusText}`);
    }

    return response.json();
  }

  async retrieveBulkData(bulkDataURI: string): Promise<ArrayBuffer> {
    const response = await fetch(bulkDataURI, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Bulk data retrieve failed: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }
}
