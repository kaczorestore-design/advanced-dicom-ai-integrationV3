import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';

// RT STRUCT Interfaces
export interface RTStructure {
  id: string;
  name: string;
  roiNumber: number;
  color: [number, number, number];
  opacity: number;
  contours: RTContour[];
  volume?: number;
  isVisible: boolean;
  structureSetROISequence?: any;
  roiContourSequence?: any;
}

export interface RTContour {
  sliceIndex: number;
  imagePosition: [number, number, number];
  points: number[];
  geometricType: 'CLOSED_PLANAR' | 'OPEN_PLANAR' | 'POINT';
}

export interface RTStructSet {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  structureSetLabel: string;
  structureSetName?: string;
  structureSetDescription?: string;
  structures: RTStructure[];
  referencedFrameOfReference?: string;
  referencedStudySequence?: any[];
  referencedSeriesSequence?: any[];
}

// DICOM SR Interfaces
export interface SRContent {
  valueType: 'TEXT' | 'NUM' | 'CODE' | 'DATETIME' | 'DATE' | 'TIME' | 'UIDREF' | 'PNAME' | 'COMPOSITE' | 'IMAGE' | 'WAVEFORM' | 'SCOORD' | 'TCOORD' | 'CONTAINER';
  conceptNameCodeSequence?: CodeSequence;
  textValue?: string;
  numericValue?: {
    value: number;
    units: CodeSequence;
    qualifier?: CodeSequence;
  };
  codeValue?: CodeSequence;
  dateTimeValue?: string;
  uidValue?: string;
  personNameValue?: string;
  spatialCoordinates?: {
    graphicType: 'POINT' | 'MULTIPOINT' | 'POLYLINE' | 'CIRCLE' | 'ELLIPSE';
    graphicData: number[];
    pixelOriginInterpretation?: string;
  };
  temporalCoordinates?: {
    temporalRangeType: 'POINT' | 'MULTIPOINT' | 'SEGMENT' | 'MULTISEGMENT' | 'BEGIN' | 'END';
    referencedSamplePositions?: number[];
    referencedTimeOffsets?: number[];
    referencedDateTime?: string[];
  };
  children?: SRContent[];
  relationshipType?: 'CONTAINS' | 'HAS_OBS_CONTEXT' | 'HAS_ACQ_CONTEXT' | 'HAS_CONCEPT_MOD' | 'HAS_PROPERTIES' | 'INFERRED_FROM' | 'SELECTED_FROM';
}

export interface CodeSequence {
  codeValue: string;
  codingSchemeDesignator: string;
  codeMeaning: string;
  codingSchemeVersion?: string;
}

export interface StructuredReport {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  sopClassUID: string;
  completionFlag: 'PARTIAL' | 'COMPLETE';
  verificationFlag: 'UNVERIFIED' | 'VERIFIED';
  contentTemplateSequence?: {
    mappingResource: string;
    templateIdentifier: string;
  };
  contentSequence: SRContent[];
  performedProcedureCodeSequence?: CodeSequence[];
  requestedProcedureCodeSequence?: CodeSequence[];
  observationDateTime?: string;
  contentCreatorName?: string;
  verifyingObserver?: {
    verifyingObserverName: string;
    verifyingObserverIdentificationCodeSequence?: CodeSequence;
    verificationDateTime: string;
  }[];
}

// Enhanced DICOM Networking
export interface DICOMNetworkNode {
  id: string;
  name: string;
  host: string;
  port: number;
  aet: string;
  callingAET: string;
  protocol: 'DIMSE' | 'DICOMweb';
  isSecure: boolean;
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    certificate?: string;
  };
  capabilities: {
    cFind: boolean;
    cMove: boolean;
    cGet: boolean;
    cStore: boolean;
    cEcho: boolean;
    wadoRS: boolean;
    qidoRS: boolean;
    stowRS: boolean;
  };
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: Date;
  statistics: {
    totalQueries: number;
    totalRetrievals: number;
    totalStores: number;
    averageResponseTime: number;
    errorCount: number;
  };
}

export interface DICOMQuery {
  level: 'PATIENT' | 'STUDY' | 'SERIES' | 'IMAGE';
  patientID?: string;
  patientName?: string;
  studyInstanceUID?: string;
  studyDate?: string;
  studyTime?: string;
  accessionNumber?: string;
  modality?: string;
  seriesInstanceUID?: string;
  seriesNumber?: string;
  sopInstanceUID?: string;
  instanceNumber?: string;
  [key: string]: any;
}

export interface DICOMRetrieveRequest {
  studyInstanceUID: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  destination?: {
    aet: string;
    host: string;
    port: number;
  };
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  moveOriginatorAET?: string;
  moveOriginatorMessageID?: number;
}

// Enhanced DICOM Support Class
export class EnhancedDICOMSupport {
  private rtStructSets: Map<string, RTStructSet> = new Map();
  private structuredReports: Map<string, StructuredReport> = new Map();
  private networkNodes: Map<string, DICOMNetworkNode> = new Map();
  private eventEmitter = new EventTarget();

  constructor() {
    this.initializeDefaultNodes();
  }

  // RT STRUCT Methods
  async parseRTStruct(dicomFile: ArrayBuffer): Promise<RTStructSet> {
    try {
      const dataSet = dicomParser.parseDicom(new Uint8Array(dicomFile));
      
      const structureSet: RTStructSet = {
        studyInstanceUID: this.getStringValue(dataSet, 'x0020000d') || '',
        seriesInstanceUID: this.getStringValue(dataSet, 'x0020000e') || '',
        sopInstanceUID: this.getStringValue(dataSet, 'x00080018') || '',
        structureSetLabel: this.getStringValue(dataSet, 'x30060002') || '',
        structureSetName: this.getStringValue(dataSet, 'x30060004'),
        structureSetDescription: this.getStringValue(dataSet, 'x30060006'),
        structures: [],
        referencedFrameOfReference: this.getStringValue(dataSet, 'x30060010')
      };

      // Parse ROI Contour Sequence
      const roiContourSequence = dataSet.elements.x30060039;
      const structureSetROISequence = dataSet.elements.x30060020;
      
      if (roiContourSequence && structureSetROISequence) {
        const roiContours = this.parseSequence(dataSet, roiContourSequence);
        const structureSetROIs = this.parseSequence(dataSet, structureSetROISequence);
        
        for (let i = 0; i < roiContours.length; i++) {
          const roiContour = roiContours[i];
          const structureSetROI = structureSetROIs.find(roi => 
            this.getStringValue(roi, 'x30060022') === this.getStringValue(roiContour, 'x30060084')
          );
          
          if (structureSetROI) {
            const structure = await this.parseRTStructure(roiContour, structureSetROI);
            structureSet.structures.push(structure);
          }
        }
      }

      this.rtStructSets.set(structureSet.sopInstanceUID, structureSet);
      this.emitEvent('rtstructLoaded', { structureSet });
      
      return structureSet;
    } catch (error) {
      console.error('Error parsing RT STRUCT:', error);
      throw new Error(`Failed to parse RT STRUCT: ${error}`);
    }
  }

  private async parseRTStructure(roiContour: any, structureSetROI: any): Promise<RTStructure> {
    const roiNumber = parseInt(this.getStringValue(structureSetROI, 'x30060022') || '0');
    const roiName = this.getStringValue(structureSetROI, 'x30060026') || `ROI_${roiNumber}`;
    
    // Parse display color
    const roiDisplayColor = this.getStringValue(roiContour, 'x3006002a');
    let color: [number, number, number] = [255, 0, 0]; // Default red
    if (roiDisplayColor) {
      const colorValues = roiDisplayColor.split('\\').map(v => parseInt(v));
      if (colorValues.length >= 3) {
        color = [colorValues[0], colorValues[1], colorValues[2]];
      }
    }

    const structure: RTStructure = {
      id: `${roiNumber}_${roiName}`,
      name: roiName,
      roiNumber,
      color,
      opacity: 0.5,
      contours: [],
      isVisible: true,
      structureSetROISequence: structureSetROI,
      roiContourSequence: roiContour
    };

    // Parse contour sequence
    const contourSequence = roiContour.elements?.x30060040;
    if (contourSequence) {
      const contours = this.parseSequence(roiContour, contourSequence);
      for (const contour of contours) {
        const rtContour = this.parseContour(contour);
        if (rtContour) {
          structure.contours.push(rtContour);
        }
      }
    }

    // Calculate volume if possible
    structure.volume = this.calculateStructureVolume(structure);

    return structure;
  }

  private parseContour(contour: any): RTContour | null {
    try {
      const geometricType = this.getStringValue(contour, 'x30060042') as RTContour['geometricType'] || 'CLOSED_PLANAR';
      const contourData = this.getStringValue(contour, 'x30060050');
      const contourImageSequence = contour.elements?.x30060016;
      
      if (!contourData) return null;

      const points = contourData.split('\\').map(v => parseFloat(v));
      if (points.length < 6) return null; // Need at least 2 points (x,y,z each)

      // Get image position from contour image sequence
      let imagePosition: [number, number, number] = [0, 0, 0];
      if (contourImageSequence) {
        const imageSequence = this.parseSequence(contour, contourImageSequence);
        if (imageSequence.length > 0) {
          const referencedSOPInstanceUID = this.getStringValue(imageSequence[0], 'x00081155');
          // Here you would typically look up the image position from the referenced image
          // For now, we'll use the first point's Z coordinate
          imagePosition = [0, 0, points[2]];
        }
      }

      return {
        sliceIndex: 0, // This would be calculated based on the image position
        imagePosition,
        points,
        geometricType
      };
    } catch (error) {
      console.error('Error parsing contour:', error);
      return null;
    }
  }

  private calculateStructureVolume(structure: RTStructure): number {
    // Simplified volume calculation using contour areas and slice thickness
    let totalVolume = 0;
    const sliceThickness = 1.0; // This should be obtained from the image series
    
    for (const contour of structure.contours) {
      if (contour.geometricType === 'CLOSED_PLANAR') {
        const area = this.calculateContourArea(contour.points);
        totalVolume += area * sliceThickness;
      }
    }
    
    return totalVolume;
  }

  private calculateContourArea(points: number[]): number {
    // Shoelace formula for polygon area
    let area = 0;
    const numPoints = points.length / 3; // x,y,z coordinates
    
    for (let i = 0; i < numPoints; i++) {
      const j = (i + 1) % numPoints;
      const x1 = points[i * 3];
      const y1 = points[i * 3 + 1];
      const x2 = points[j * 3];
      const y2 = points[j * 3 + 1];
      area += x1 * y2 - x2 * y1;
    }
    
    return Math.abs(area) / 2;
  }

  // DICOM SR Methods
  async parseStructuredReport(dicomFile: ArrayBuffer): Promise<StructuredReport> {
    try {
      const dataSet = dicomParser.parseDicom(new Uint8Array(dicomFile));
      
      const sr: StructuredReport = {
        studyInstanceUID: this.getStringValue(dataSet, 'x0020000d') || '',
        seriesInstanceUID: this.getStringValue(dataSet, 'x0020000e') || '',
        sopInstanceUID: this.getStringValue(dataSet, 'x00080018') || '',
        sopClassUID: this.getStringValue(dataSet, 'x00080016') || '',
        completionFlag: this.getStringValue(dataSet, 'x0040a491') as 'PARTIAL' | 'COMPLETE' || 'COMPLETE',
        verificationFlag: this.getStringValue(dataSet, 'x0040a493') as 'UNVERIFIED' | 'VERIFIED' || 'UNVERIFIED',
        contentSequence: [],
        observationDateTime: this.getStringValue(dataSet, 'x0040a032'),
        contentCreatorName: this.getStringValue(dataSet, 'x0070,0084')
      };

      // Parse content sequence
      const contentSequence = dataSet.elements.x0040a730;
      if (contentSequence) {
        const contents = this.parseSequence(dataSet, contentSequence);
        sr.contentSequence = this.parseSRContentSequence(contents);
      }

      // Parse template information
      const contentTemplateSequence = dataSet.elements.x0040a504;
      if (contentTemplateSequence) {
        const templates = this.parseSequence(dataSet, contentTemplateSequence);
        if (templates.length > 0) {
          sr.contentTemplateSequence = {
            mappingResource: this.getStringValue(templates[0], 'x00080105') || '',
            templateIdentifier: this.getStringValue(templates[0], 'x0040db00') || ''
          };
        }
      }

      this.structuredReports.set(sr.sopInstanceUID, sr);
      this.emitEvent('structuredReportLoaded', { structuredReport: sr });
      
      return sr;
    } catch (error) {
      console.error('Error parsing Structured Report:', error);
      throw new Error(`Failed to parse Structured Report: ${error}`);
    }
  }

  private parseSRContentSequence(contents: any[]): SRContent[] {
    return contents.map(content => this.parseSRContent(content)).filter(Boolean) as SRContent[];
  }

  private parseSRContent(content: any): SRContent | null {
    try {
      const valueType = this.getStringValue(content, 'x0040a040') as SRContent['valueType'];
      if (!valueType) return null;

      const srContent: SRContent = {
        valueType,
        relationshipType: this.getStringValue(content, 'x0040a010') as SRContent['relationshipType']
      };

      // Parse concept name code sequence
      const conceptNameCodeSequence = content.elements?.x0040a043;
      if (conceptNameCodeSequence) {
        const codes = this.parseSequence(content, conceptNameCodeSequence);
        if (codes.length > 0) {
          srContent.conceptNameCodeSequence = this.parseCodeSequence(codes[0]);
        }
      }

      // Parse value based on value type
      switch (valueType) {
        case 'TEXT':
          srContent.textValue = this.getStringValue(content, 'x0040a160');
          break;
        case 'NUM':
          const numericValue = this.getStringValue(content, 'x0040a30a');
          if (numericValue) {
            srContent.numericValue = {
              value: parseFloat(numericValue),
              units: this.parseCodeSequence(content) // This would need proper parsing
            };
          }
          break;
        case 'CODE':
          const codeSequence = content.elements?.x0040a168;
          if (codeSequence) {
            const codes = this.parseSequence(content, codeSequence);
            if (codes.length > 0) {
              srContent.codeValue = this.parseCodeSequence(codes[0]);
            }
          }
          break;
        case 'DATETIME':
          srContent.dateTimeValue = this.getStringValue(content, 'x0040a120');
          break;
        case 'UIDREF':
          srContent.uidValue = this.getStringValue(content, 'x0040a124');
          break;
        case 'PNAME':
          srContent.personNameValue = this.getStringValue(content, 'x0040a123');
          break;
      }

      // Parse child content sequence
      const childContentSequence = content.elements?.x0040a730;
      if (childContentSequence) {
        const childContents = this.parseSequence(content, childContentSequence);
        srContent.children = this.parseSRContentSequence(childContents);
      }

      return srContent;
    } catch (error) {
      console.error('Error parsing SR content:', error);
      return null;
    }
  }

  private parseCodeSequence(codeItem: any): CodeSequence {
    return {
      codeValue: this.getStringValue(codeItem, 'x00080100') || '',
      codingSchemeDesignator: this.getStringValue(codeItem, 'x00080102') || '',
      codeMeaning: this.getStringValue(codeItem, 'x00080104') || '',
      codingSchemeVersion: this.getStringValue(codeItem, 'x00080103')
    };
  }

  // Enhanced DICOM Networking Methods
  async addNetworkNode(node: Omit<DICOMNetworkNode, 'connectionStatus' | 'statistics'>): Promise<void> {
    const networkNode: DICOMNetworkNode = {
      ...node,
      connectionStatus: 'disconnected',
      statistics: {
        totalQueries: 0,
        totalRetrievals: 0,
        totalStores: 0,
        averageResponseTime: 0,
        errorCount: 0
      }
    };

    this.networkNodes.set(node.id, networkNode);
    this.emitEvent('networkNodeAdded', { node: networkNode });
  }

  async connectToNode(nodeId: string): Promise<boolean> {
    const node = this.networkNodes.get(nodeId);
    if (!node) {
      throw new Error(`Network node ${nodeId} not found`);
    }

    try {
      node.connectionStatus = 'connecting';
      this.emitEvent('networkNodeStatusChanged', { nodeId, status: 'connecting' });

      // Perform C-ECHO to test connection
      const echoResult = await this.performCEcho(node);
      
      if (echoResult) {
        node.connectionStatus = 'connected';
        node.lastConnected = new Date();
        this.emitEvent('networkNodeStatusChanged', { nodeId, status: 'connected' });
        return true;
      } else {
        node.connectionStatus = 'error';
        node.statistics.errorCount++;
        this.emitEvent('networkNodeStatusChanged', { nodeId, status: 'error' });
        return false;
      }
    } catch (error) {
      node.connectionStatus = 'error';
      node.statistics.errorCount++;
      this.emitEvent('networkNodeStatusChanged', { nodeId, status: 'error' });
      console.error(`Failed to connect to node ${nodeId}:`, error);
      return false;
    }
  }

  async performQuery(nodeId: string, query: DICOMQuery): Promise<any[]> {
    const node = this.networkNodes.get(nodeId);
    if (!node || node.connectionStatus !== 'connected') {
      throw new Error(`Node ${nodeId} is not connected`);
    }

    try {
      const startTime = Date.now();
      let results: any[] = [];

      if (node.protocol === 'DICOMweb') {
        results = await this.performDICOMwebQuery(node, query);
      } else {
        results = await this.performDIMSEQuery(node, query);
      }

      const responseTime = Date.now() - startTime;
      this.updateNodeStatistics(nodeId, 'query', responseTime);
      
      return results;
    } catch (error) {
      node.statistics.errorCount++;
      console.error(`Query failed for node ${nodeId}:`, error);
      throw error;
    }
  }

  async performRetrieve(nodeId: string, request: DICOMRetrieveRequest): Promise<boolean> {
    const node = this.networkNodes.get(nodeId);
    if (!node || node.connectionStatus !== 'connected') {
      throw new Error(`Node ${nodeId} is not connected`);
    }

    try {
      const startTime = Date.now();
      let success = false;

      if (node.protocol === 'DICOMweb') {
        success = await this.performDICOMwebRetrieve(node, request);
      } else {
        success = await this.performDIMSERetrieve(node, request);
      }

      const responseTime = Date.now() - startTime;
      this.updateNodeStatistics(nodeId, 'retrieve', responseTime);
      
      return success;
    } catch (error) {
      node.statistics.errorCount++;
      console.error(`Retrieve failed for node ${nodeId}:`, error);
      throw error;
    }
  }

  // Utility Methods
  private getStringValue(dataSet: any, tag: string): string | undefined {
    const element = dataSet.elements[tag];
    if (!element) return undefined;
    
    if (element.length === undefined) return undefined;
    
    return dataSet.string(tag);
  }

  private parseSequence(dataSet: any, sequenceElement: any): any[] {
    const items: any[] = [];
    
    if (!sequenceElement || !sequenceElement.items) {
      return items;
    }

    for (const item of sequenceElement.items) {
      if (item.dataSet) {
        items.push(item.dataSet);
      }
    }
    
    return items;
  }

  private async performCEcho(node: DICOMNetworkNode): Promise<boolean> {
    // Implementation would depend on the specific DICOM library being used
    // This is a placeholder for the actual C-ECHO implementation
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1000); // Simulate network delay
    });
  }

  private async performDICOMwebQuery(node: DICOMNetworkNode, query: DICOMQuery): Promise<any[]> {
    // Implementation for DICOMweb QIDO-RS queries
    // This would use the existing DICOMweb service
    return [];
  }

  private async performDIMSEQuery(node: DICOMNetworkNode, query: DICOMQuery): Promise<any[]> {
    // Implementation for traditional DIMSE C-FIND queries
    // This would use the DIMSE service
    return [];
  }

  private async performDICOMwebRetrieve(node: DICOMNetworkNode, request: DICOMRetrieveRequest): Promise<boolean> {
    // Implementation for DICOMweb WADO-RS retrieval
    return true;
  }

  private async performDIMSERetrieve(node: DICOMNetworkNode, request: DICOMRetrieveRequest): Promise<boolean> {
    // Implementation for traditional DIMSE C-MOVE/C-GET retrieval
    return true;
  }

  private updateNodeStatistics(nodeId: string, operation: 'query' | 'retrieve', responseTime: number): void {
    const node = this.networkNodes.get(nodeId);
    if (!node) return;

    if (operation === 'query') {
      node.statistics.totalQueries++;
    } else {
      node.statistics.totalRetrievals++;
    }

    // Update average response time
    const totalOperations = node.statistics.totalQueries + node.statistics.totalRetrievals;
    node.statistics.averageResponseTime = 
      (node.statistics.averageResponseTime * (totalOperations - 1) + responseTime) / totalOperations;
  }

  private initializeDefaultNodes(): void {
    // Add some default PACS nodes
    const defaultNodes: Omit<DICOMNetworkNode, 'connectionStatus' | 'statistics'>[] = [
      {
        id: 'local-pacs',
        name: 'Local PACS',
        host: 'localhost',
        port: 8000,
        aet: 'LOCAL_PACS',
        callingAET: 'VIEWER',
        protocol: 'DICOMweb',
        isSecure: false,
        capabilities: {
          cFind: true,
          cMove: true,
          cGet: true,
          cStore: true,
          cEcho: true,
          wadoRS: true,
          qidoRS: true,
          stowRS: true
        }
      }
    ];

    defaultNodes.forEach(node => this.addNetworkNode(node));
  }

  private emitEvent(eventType: string, data: any): void {
    const event = new CustomEvent(eventType, { detail: data });
    this.eventEmitter.dispatchEvent(event);
  }

  // Public API Methods
  getRTStructSet(sopInstanceUID: string): RTStructSet | undefined {
    return this.rtStructSets.get(sopInstanceUID);
  }

  getAllRTStructSets(): RTStructSet[] {
    return Array.from(this.rtStructSets.values());
  }

  getStructuredReport(sopInstanceUID: string): StructuredReport | undefined {
    return this.structuredReports.get(sopInstanceUID);
  }

  getAllStructuredReports(): StructuredReport[] {
    return Array.from(this.structuredReports.values());
  }

  getNetworkNode(nodeId: string): DICOMNetworkNode | undefined {
    return this.networkNodes.get(nodeId);
  }

  getAllNetworkNodes(): DICOMNetworkNode[] {
    return Array.from(this.networkNodes.values());
  }

  addEventListener(eventType: string, listener: EventListener): void {
    this.eventEmitter.addEventListener(eventType, listener);
  }

  removeEventListener(eventType: string, listener: EventListener): void {
    this.eventEmitter.removeEventListener(eventType, listener);
  }
}

// React Component for Enhanced DICOM Support UI
export const EnhancedDICOMSupportUI: React.FC = () => {
  const [dicomSupport] = useState(() => new EnhancedDICOMSupport());
  const [rtStructSets, setRTStructSets] = useState<RTStructSet[]>([]);
  const [structuredReports, setStructuredReports] = useState<StructuredReport[]>([]);
  const [networkNodes, setNetworkNodes] = useState<DICOMNetworkNode[]>([]);
  const [selectedTab, setSelectedTab] = useState<'rtstruct' | 'sr' | 'network'>('rtstruct');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateRTStructSets = () => setRTStructSets(dicomSupport.getAllRTStructSets());
    const updateStructuredReports = () => setStructuredReports(dicomSupport.getAllStructuredReports());
    const updateNetworkNodes = () => setNetworkNodes(dicomSupport.getAllNetworkNodes());

    dicomSupport.addEventListener('rtstructLoaded', updateRTStructSets);
    dicomSupport.addEventListener('structuredReportLoaded', updateStructuredReports);
    dicomSupport.addEventListener('networkNodeAdded', updateNetworkNodes);
    dicomSupport.addEventListener('networkNodeStatusChanged', updateNetworkNodes);

    // Initial load
    updateRTStructSets();
    updateStructuredReports();
    updateNetworkNodes();

    return () => {
      dicomSupport.removeEventListener('rtstructLoaded', updateRTStructSets);
      dicomSupport.removeEventListener('structuredReportLoaded', updateStructuredReports);
      dicomSupport.removeEventListener('networkNodeAdded', updateNetworkNodes);
      dicomSupport.removeEventListener('networkNodeStatusChanged', updateNetworkNodes);
    };
  }, [dicomSupport, setRTStructSets, setStructuredReports, setNetworkNodes]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Try to determine file type and parse accordingly
        if (file.name.toLowerCase().includes('rtstruct') || file.name.toLowerCase().includes('struct')) {
          await dicomSupport.parseRTStruct(arrayBuffer);
        } else if (file.name.toLowerCase().includes('sr') || file.name.toLowerCase().includes('report')) {
          await dicomSupport.parseStructuredReport(arrayBuffer);
        } else {
          // Try both parsers
          try {
            await dicomSupport.parseRTStruct(arrayBuffer);
          } catch {
            await dicomSupport.parseStructuredReport(arrayBuffer);
          }
        }
      } catch (error) {
        console.error(`Failed to parse file ${file.name}:`, error);
      }
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [dicomSupport]);

  const connectToNode = useCallback(async (nodeId: string) => {
    try {
      await dicomSupport.connectToNode(nodeId);
    } catch (error) {
      console.error(`Failed to connect to node ${nodeId}:`, error);
    }
  }, [dicomSupport]);

  return (
    <div className="enhanced-dicom-support p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Enhanced DICOM Support</h2>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'rtstruct', label: 'RT STRUCT', count: rtStructSets.length },
              { id: 'sr', label: 'Structured Reports', count: structuredReports.length },
              { id: 'network', label: 'Network Nodes', count: networkNodes.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".dcm,.dicom"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Upload DICOM Files
        </button>
      </div>

      {/* Tab Content */}
      {selectedTab === 'rtstruct' && (
        <div className="rt-struct-panel">
          <h3 className="text-lg font-semibold mb-4">RT Structure Sets</h3>
          {rtStructSets.length === 0 ? (
            <p className="text-gray-500">No RT Structure Sets loaded</p>
          ) : (
            <div className="space-y-4">
              {rtStructSets.map((structSet) => (
                <div key={structSet.sopInstanceUID} className="border rounded-lg p-4">
                  <h4 className="font-medium text-lg">{structSet.structureSetLabel}</h4>
                  <p className="text-sm text-gray-600 mb-2">{structSet.structureSetDescription}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {structSet.structures.map((structure) => (
                      <div key={structure.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: `rgb(${structure.color.join(',')})` }}
                        />
                        <span className="text-sm font-medium">{structure.name}</span>
                        <span className="text-xs text-gray-500">({structure.contours.length} contours)</span>
                        {structure.volume && (
                          <span className="text-xs text-gray-500">{structure.volume.toFixed(2)} cm³</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTab === 'sr' && (
        <div className="structured-reports-panel">
          <h3 className="text-lg font-semibold mb-4">Structured Reports</h3>
          {structuredReports.length === 0 ? (
            <p className="text-gray-500">No Structured Reports loaded</p>
          ) : (
            <div className="space-y-4">
              {structuredReports.map((report) => (
                <div key={report.sopInstanceUID} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-lg">Structured Report</h4>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        report.completionFlag === 'COMPLETE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.completionFlag}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        report.verificationFlag === 'VERIFIED' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {report.verificationFlag}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    SOP Class: {report.sopClassUID}
                  </p>
                  {report.observationDateTime && (
                    <p className="text-sm text-gray-600 mb-2">
                      Observation Date: {new Date(report.observationDateTime).toLocaleString()}
                    </p>
                  )}
                  {report.contentCreatorName && (
                    <p className="text-sm text-gray-600 mb-2">
                      Creator: {report.contentCreatorName}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    Content Items: {report.contentSequence.length}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTab === 'network' && (
        <div className="network-nodes-panel">
          <h3 className="text-lg font-semibold mb-4">DICOM Network Nodes</h3>
          <div className="space-y-4">
            {networkNodes.map((node) => (
              <div key={node.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-lg">{node.name}</h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      node.connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                      node.connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                      node.connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {node.connectionStatus}
                    </span>
                    <button
                      onClick={() => connectToNode(node.id)}
                      disabled={node.connectionStatus === 'connecting'}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                    >
                      {node.connectionStatus === 'connected' ? 'Reconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Host:</span>
                    <p className="font-medium">{node.host}:{node.port}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">AET:</span>
                    <p className="font-medium">{node.aet}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Protocol:</span>
                    <p className="font-medium">{node.protocol}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Security:</span>
                    <p className="font-medium">{node.isSecure ? 'Secure' : 'Standard'}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Queries:</span>
                    <p className="font-medium">{node.statistics.totalQueries}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Retrievals:</span>
                    <p className="font-medium">{node.statistics.totalRetrievals}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Response:</span>
                    <p className="font-medium">{node.statistics.averageResponseTime.toFixed(0)}ms</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Errors:</span>
                    <p className="font-medium">{node.statistics.errorCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Connected:</span>
                    <p className="font-medium">
                      {node.lastConnected ? new Date(node.lastConnected).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDICOMSupport;