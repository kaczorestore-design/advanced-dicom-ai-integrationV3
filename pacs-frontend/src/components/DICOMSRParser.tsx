import React, { useState, useEffect, useCallback } from 'react';
import * as dicomParser from 'dicom-parser';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { FileText, Download, Upload, Search, Filter, Eye, Calendar, User, Stethoscope } from 'lucide-react';

interface SRDocument {
  sopInstanceUID: string;
  sopClassUID: string;
  studyInstanceUID: string;
  seriesInstanceUID: string;
  instanceNumber: number;
  contentDate?: string;
  contentTime?: string;
  documentTitle?: string;
  completionFlag?: string;
  verificationFlag?: string;
  contentTemplateSequence?: TemplateIdentification;
  conceptNameCodeSequence?: CodeSequence;
  valueType: string;
  continuityOfContent: string;
  contentSequence: SRContentItem[];
  referencedPerformedProcedureStepSequence?: any[];
  performingPhysicianName?: string;
  operatorName?: string;
  manufacturer?: string;
  institutionName?: string;
}

interface SRContentItem {
  relationshipType?: string;
  valueType: string;
  conceptNameCodeSequence?: CodeSequence;
  textValue?: string;
  numericValue?: NumericValue;
  datetimeValue?: string;
  dateValue?: string;
  timeValue?: string;
  personName?: string;
  uidValue?: string;
  spatialCoordinatesSequence?: SpatialCoordinates[];
  referencedImageSequence?: ReferencedImage[];
  measurementUnitsCodeSequence?: CodeSequence;
  contentSequence?: SRContentItem[];
  continuityOfContent?: string;
  observationDateTime?: string;
  observationUID?: string;
}

interface CodeSequence {
  codeValue: string;
  codingSchemeDesignator: string;
  codingSchemeVersion?: string;
  codeMapping?: string;
}

interface NumericValue {
  value: number;
  measurementUnitsCodeSequence?: CodeSequence;
  qualifierCodeSequence?: CodeSequence[];
}

interface SpatialCoordinates {
  graphicType: string;
  graphicData: number[];
  pixelOriginInterpretation?: string;
  fiducialUID?: string;
}

interface ReferencedImage {
  referencedSOPClassUID: string;
  referencedSOPInstanceUID: string;
  referencedFrameNumber?: number[];
  referencedSegmentNumber?: number[];
}

interface TemplateIdentification {
  mappingResource: string;
  templateID: string;
  templateVersion?: string;
}

interface DICOMSRParserProps {
  onSRLoaded?: (srDocument: SRDocument) => void;
  onMeasurementSelected?: (measurement: SRContentItem) => void;
  onImageReferenceSelected?: (imageRef: ReferencedImage) => void;
  theme?: 'light' | 'dark';
}

export default function DICOMSRParser({
  onSRLoaded,
  onMeasurementSelected,
  onImageReferenceSelected,
  theme = 'dark'
}: DICOMSRParserProps) {
  const [srDocument, setSRDocument] = useState<SRDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Parse DICOM SR file
  const parseDICOMSR = useCallback(async (file: File): Promise<SRDocument> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const byteArray = new Uint8Array(arrayBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);

          // Validate this is a DICOM SR object
          const sopClassUID = dataSet.string('x00080016');
          const srSOPClasses = [
            '1.2.840.10008.5.1.4.1.1.88.11', // Basic Text SR
            '1.2.840.10008.5.1.4.1.1.88.22', // Enhanced SR
            '1.2.840.10008.5.1.4.1.1.88.33', // Comprehensive SR
            '1.2.840.10008.5.1.4.1.1.88.40', // Procedure Log
            '1.2.840.10008.5.1.4.1.1.88.50', // Mammography CAD SR
            '1.2.840.10008.5.1.4.1.1.88.59', // Key Object Selection
            '1.2.840.10008.5.1.4.1.1.88.65', // Chest CAD SR
            '1.2.840.10008.5.1.4.1.1.88.67', // X-Ray Radiation Dose SR
            '1.2.840.10008.5.1.4.1.1.88.69', // Colon CAD SR
            '1.2.840.10008.5.1.4.1.1.88.70', // Implantation Plan SR
          ];
          
          if (!sopClassUID || !srSOPClasses.includes(sopClassUID)) {
            throw new Error('Not a valid DICOM Structured Report object');
          }

          // Extract basic SR information
          const sopInstanceUID = dataSet.string('x00080018') || '';
          const studyInstanceUID = dataSet.string('x0020000d') || '';
          const seriesInstanceUID = dataSet.string('x0020000e') || '';
          const instanceNumber = dataSet.uint16('x00200013') || 0;
          const contentDate = dataSet.string('x00080023');
          const contentTime = dataSet.string('x00080033');
          const completionFlag = dataSet.string('x0040a491');
          const verificationFlag = dataSet.string('x0040a493');
          const continuityOfContent = dataSet.string('x0040a050') || 'SEPARATE';
          const valueType = dataSet.string('x0040a040') || 'CONTAINER';

          // Extract document title
          const conceptNameCodeSequence = extractCodeSequence(dataSet, 'x0040a043');
          const documentTitle = conceptNameCodeSequence?.codeMapping || 'Structured Report';

          // Extract template identification
          let contentTemplateSequence: TemplateIdentification | undefined;
          const templateSeq = dataSet.elements.x0040a504;
          if (templateSeq && templateSeq.items?.[0]) {
            const templateItem = templateSeq.items[0].dataSet;
            contentTemplateSequence = {
              mappingResource: templateItem.string('x00080105') || '',
              templateID: templateItem.string('x0040db00') || '',
              templateVersion: templateItem.string('x0040db06')
            };
          }

          // Extract performing physician and operator
          const performingPhysicianName = dataSet.string('x00081050');
          const operatorName = dataSet.string('x00081070');
          const manufacturer = dataSet.string('x00080070');
          const institutionName = dataSet.string('x00080080');

          // Extract content sequence (main SR content)
          const contentSequence = extractContentSequence(dataSet, 'x0040a730');

          // Extract referenced performed procedure step
          const referencedPerformedProcedureStepSequence = extractReferencedProcedureSteps(dataSet);

          const srDocument: SRDocument = {
            sopInstanceUID,
            sopClassUID,
            studyInstanceUID,
            seriesInstanceUID,
            instanceNumber,
            contentDate,
            contentTime,
            documentTitle,
            completionFlag,
            verificationFlag,
            contentTemplateSequence,
            conceptNameCodeSequence,
            valueType,
            continuityOfContent,
            contentSequence,
            referencedPerformedProcedureStepSequence,
            performingPhysicianName,
            operatorName,
            manufacturer,
            institutionName
          };

          resolve(srDocument);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Extract code sequence from dataset
  const extractCodeSequence = (dataSet: any, tag: string): CodeSequence | undefined => {
    const sequence = dataSet.elements[tag];
    if (!sequence || !sequence.items?.[0]) return undefined;

    const item = sequence.items[0].dataSet;
    return {
      codeValue: item.string('x00080100') || '',
      codingSchemeDesignator: item.string('x00080102') || '',
      codingSchemeVersion: item.string('x00080103'),
      codeMapping: item.string('x00080104')
    };
  };

  // Extract content sequence recursively
  const extractContentSequence = (dataSet: any, tag: string): SRContentItem[] => {
    const sequence = dataSet.elements[tag];
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any, index: number) => {
      const itemDataSet = item.dataSet;
      const valueType = itemDataSet.string('x0040a040') || 'TEXT';
      const relationshipType = itemDataSet.string('x0040a010');
      const continuityOfContent = itemDataSet.string('x0040a050');
      const observationDateTime = itemDataSet.string('x0040a032');
      const observationUID = itemDataSet.string('x0040a171');

      // Extract concept name
      const conceptNameCodeSequence = extractCodeSequence(itemDataSet, 'x0040a043');

      // Extract value based on value type
      let textValue: string | undefined;
      let numericValue: NumericValue | undefined;
      let datetimeValue: string | undefined;
      let dateValue: string | undefined;
      let timeValue: string | undefined;
      let personName: string | undefined;
      let uidValue: string | undefined;
      let spatialCoordinatesSequence: SpatialCoordinates[] | undefined;
      let referencedImageSequence: ReferencedImage[] | undefined;
      let measurementUnitsCodeSequence: CodeSequence | undefined;

      switch (valueType) {
        case 'TEXT':
          textValue = itemDataSet.string('x0040a160');
          break;
        case 'NUM':
          const numValue = itemDataSet.floatString('x0040a30a');
          if (numValue !== undefined) {
            measurementUnitsCodeSequence = extractCodeSequence(itemDataSet, 'x0040a300');
            numericValue = {
              value: parseFloat(numValue),
              measurementUnitsCodeSequence
            };
          }
          break;
        case 'DATETIME':
          datetimeValue = itemDataSet.string('x0040a120');
          break;
        case 'DATE':
          dateValue = itemDataSet.string('x0040a121');
          break;
        case 'TIME':
          timeValue = itemDataSet.string('x0040a122');
          break;
        case 'PNAME':
          personName = itemDataSet.string('x0040a123');
          break;
        case 'UIDREF':
          uidValue = itemDataSet.string('x0040a124');
          break;
        case 'SCOORD':
          spatialCoordinatesSequence = extractSpatialCoordinates(itemDataSet);
          break;
        case 'IMAGE':
          referencedImageSequence = extractReferencedImages(itemDataSet);
          break;
      }

      // Recursively extract nested content
      const nestedContent = extractContentSequence(itemDataSet, 'x0040a730');

      return {
        relationshipType,
        valueType,
        conceptNameCodeSequence,
        textValue,
        numericValue,
        datetimeValue,
        dateValue,
        timeValue,
        personName,
        uidValue,
        spatialCoordinatesSequence,
        referencedImageSequence,
        measurementUnitsCodeSequence,
        contentSequence: nestedContent.length > 0 ? nestedContent : undefined,
        continuityOfContent,
        observationDateTime,
        observationUID
      };
    });
  };

  // Extract spatial coordinates
  const extractSpatialCoordinates = (dataSet: any): SpatialCoordinates[] => {
    const sequence = dataSet.elements.x0040a30c;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const graphicType = itemDataSet.string('x00700023') || 'POINT';
      const graphicDataString = itemDataSet.string('x00700022');
      const graphicData = graphicDataString ? graphicDataString.split('\\').map(Number) : [];
      const pixelOriginInterpretation = itemDataSet.string('x00700024');
      const fiducialUID = itemDataSet.string('x00700026');

      return {
        graphicType,
        graphicData,
        pixelOriginInterpretation,
        fiducialUID
      };
    });
  };

  // Extract referenced images
  const extractReferencedImages = (dataSet: any): ReferencedImage[] => {
    const sequence = dataSet.elements.x00081140;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const referencedSOPClassUID = itemDataSet.string('x00081150') || '';
      const referencedSOPInstanceUID = itemDataSet.string('x00081155') || '';
      const referencedFrameNumberString = itemDataSet.string('x00081160');
      const referencedSegmentNumberString = itemDataSet.string('x0062000b');

      const referencedFrameNumber = referencedFrameNumberString 
        ? referencedFrameNumberString.split('\\').map(Number) 
        : undefined;
      const referencedSegmentNumber = referencedSegmentNumberString 
        ? referencedSegmentNumberString.split('\\').map(Number) 
        : undefined;

      return {
        referencedSOPClassUID,
        referencedSOPInstanceUID,
        referencedFrameNumber,
        referencedSegmentNumber
      };
    });
  };

  // Extract referenced performed procedure steps
  const extractReferencedProcedureSteps = (dataSet: any): any[] => {
    const sequence = dataSet.elements.x00081111;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      return {
        referencedSOPClassUID: itemDataSet.string('x00081150'),
        referencedSOPInstanceUID: itemDataSet.string('x00081155')
      };
    });
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setLoading(true);
    setError(null);

    try {
      const sr = await parseDICOMSR(file);
      setSRDocument(sr);
      onSRLoaded?.(sr);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Structured Report');
    } finally {
      setLoading(false);
    }
  }, [parseDICOMSR, onSRLoaded]);

  // Toggle item expansion
  const toggleExpansion = useCallback((itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  }, [expandedItems]);

  // Filter content items based on search and filter criteria
  const filterContentItems = useCallback((items: SRContentItem[], searchTerm: string, filterType: string): SRContentItem[] => {
    return items.filter(item => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const conceptName = item.conceptNameCodeSequence?.codeMapping?.toLowerCase() || '';
        const textValue = item.textValue?.toLowerCase() || '';
        const numericValue = item.numericValue?.value.toString() || '';
        
        if (!conceptName.includes(searchLower) && 
            !textValue.includes(searchLower) && 
            !numericValue.includes(searchLower)) {
          return false;
        }
      }

      // Type filter
      if (filterType !== 'all' && item.valueType !== filterType.toUpperCase()) {
        return false;
      }

      return true;
    });
  }, []);

  // Render content item
  const renderContentItem = useCallback((item: SRContentItem, index: number, depth: number = 0) => {
    const itemId = `${depth}-${index}`;
    const hasChildren = item.contentSequence && item.contentSequence.length > 0;
    const isExpanded = expandedItems.has(itemId);

    return (
      <div key={itemId} className={`ml-${depth * 4} mb-2`}>
        <div 
          className={`p-3 rounded-lg border cursor-pointer ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
          }`}
          onClick={() => hasChildren && toggleExpansion(itemId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasChildren && (
                <span className="text-sm">{isExpanded ? '▼' : '▶'}</span>
              )}
              <Badge variant="outline">{item.valueType}</Badge>
              {item.relationshipType && (
                <Badge variant="secondary">{item.relationshipType}</Badge>
              )}
              <span className="font-medium">
                {item.conceptNameCodeSequence?.codeMapping || 'Unnamed Item'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {item.numericValue && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMeasurementSelected?.(item);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              {item.referencedImageSequence && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    item.referencedImageSequence?.forEach(ref => {
                      onImageReferenceSelected?.(ref);
                    });
                  }}
                >
                  <Search className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Item content */}
          <div className="mt-2 text-sm space-y-1">
            {item.textValue && (
              <div><strong>Text:</strong> {item.textValue}</div>
            )}
            {item.numericValue && (
              <div>
                <strong>Value:</strong> {item.numericValue.value}
                {item.numericValue.measurementUnitsCodeSequence && (
                  <span className="ml-1">
                    {item.numericValue.measurementUnitsCodeSequence.codeMapping}
                  </span>
                )}
              </div>
            )}
            {item.datetimeValue && (
              <div><strong>DateTime:</strong> {item.datetimeValue}</div>
            )}
            {item.dateValue && (
              <div><strong>Date:</strong> {item.dateValue}</div>
            )}
            {item.timeValue && (
              <div><strong>Time:</strong> {item.timeValue}</div>
            )}
            {item.personName && (
              <div><strong>Person:</strong> {item.personName}</div>
            )}
            {item.uidValue && (
              <div><strong>UID:</strong> {item.uidValue}</div>
            )}
            {item.spatialCoordinatesSequence && (
              <div>
                <strong>Coordinates:</strong> {item.spatialCoordinatesSequence.length} spatial coordinate(s)
              </div>
            )}
            {item.referencedImageSequence && (
              <div>
                <strong>Referenced Images:</strong> {item.referencedImageSequence.length} image(s)
              </div>
            )}
            {item.observationDateTime && (
              <div><strong>Observation Time:</strong> {item.observationDateTime}</div>
            )}
          </div>
        </div>

        {/* Nested content */}
        {hasChildren && isExpanded && item.contentSequence && (
          <div className="mt-2">
            {item.contentSequence.map((childItem, childIndex) => 
              renderContentItem(childItem, childIndex, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  }, [expandedItems, theme, toggleExpansion, onMeasurementSelected, onImageReferenceSelected]);

  return (
    <div className={`space-y-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* File Upload */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>DICOM Structured Report Loader</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="file"
              accept=".dcm,.dicom"
              onChange={handleFileSelect}
              className={`w-full p-2 border rounded-md ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            {selectedFile && (
              <div className="text-sm text-gray-500">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
            {loading && (
              <div className="text-blue-500">Parsing DICOM Structured Report...</div>
            )}
            {error && (
              <div className="text-red-500">Error: {error}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SR Document Viewer */}
      {srDocument && (
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Structured Report: {srDocument.documentTitle}</span>
              <Badge variant="secondary">
                {srDocument.contentSequence.length} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="references">References</TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" className="space-y-4">
                {/* Search and Filter */}
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search content..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full p-2 border rounded-md ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className={`p-2 border rounded-md ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All Types</option>
                    <option value="text">Text</option>
                    <option value="num">Numeric</option>
                    <option value="image">Image</option>
                    <option value="scoord">Spatial Coordinates</option>
                    <option value="container">Container</option>
                  </select>
                </div>

                {/* Content Items */}
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filterContentItems(srDocument.contentSequence, searchTerm, filterType)
                      .map((item, index) => renderContentItem(item, index))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>SOP Instance UID:</strong> {srDocument.sopInstanceUID}</div>
                  <div><strong>SOP Class UID:</strong> {srDocument.sopClassUID}</div>
                  <div><strong>Study Instance UID:</strong> {srDocument.studyInstanceUID}</div>
                  <div><strong>Series Instance UID:</strong> {srDocument.seriesInstanceUID}</div>
                  <div><strong>Instance Number:</strong> {srDocument.instanceNumber}</div>
                  {srDocument.contentDate && (
                    <div><strong>Content Date:</strong> {srDocument.contentDate}</div>
                  )}
                  {srDocument.contentTime && (
                    <div><strong>Content Time:</strong> {srDocument.contentTime}</div>
                  )}
                  {srDocument.completionFlag && (
                    <div><strong>Completion Flag:</strong> {srDocument.completionFlag}</div>
                  )}
                  {srDocument.verificationFlag && (
                    <div><strong>Verification Flag:</strong> {srDocument.verificationFlag}</div>
                  )}
                  {srDocument.performingPhysicianName && (
                    <div><strong>Performing Physician:</strong> {srDocument.performingPhysicianName}</div>
                  )}
                  {srDocument.operatorName && (
                    <div><strong>Operator:</strong> {srDocument.operatorName}</div>
                  )}
                  {srDocument.manufacturer && (
                    <div><strong>Manufacturer:</strong> {srDocument.manufacturer}</div>
                  )}
                  {srDocument.institutionName && (
                    <div><strong>Institution:</strong> {srDocument.institutionName}</div>
                  )}
                </div>
                
                {srDocument.contentTemplateSequence && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Template Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Mapping Resource:</strong> {srDocument.contentTemplateSequence.mappingResource}</div>
                      <div><strong>Template ID:</strong> {srDocument.contentTemplateSequence.templateID}</div>
                      {srDocument.contentTemplateSequence.templateVersion && (
                        <div><strong>Template Version:</strong> {srDocument.contentTemplateSequence.templateVersion}</div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="references" className="space-y-4">
                {srDocument.referencedPerformedProcedureStepSequence && 
                 srDocument.referencedPerformedProcedureStepSequence.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Referenced Procedure Steps</h4>
                    <div className="space-y-2">
                      {srDocument.referencedPerformedProcedureStepSequence.map((ref, index) => (
                        <div key={index} className="p-2 border rounded text-sm">
                          <div><strong>SOP Class UID:</strong> {ref.referencedSOPClassUID}</div>
                          <div><strong>SOP Instance UID:</strong> {ref.referencedSOPInstanceUID}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Extract and display all image references */}
                {(() => {
                  const allImageRefs: ReferencedImage[] = [];
                  const extractImageRefs = (items: SRContentItem[]) => {
                    items.forEach(item => {
                      if (item.referencedImageSequence) {
                        allImageRefs.push(...item.referencedImageSequence);
                      }
                      if (item.contentSequence) {
                        extractImageRefs(item.contentSequence);
                      }
                    });
                  };
                  extractImageRefs(srDocument.contentSequence);
                  
                  return allImageRefs.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Referenced Images ({allImageRefs.length})</h4>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {allImageRefs.map((ref, index) => (
                            <div 
                              key={index} 
                              className="p-2 border rounded text-sm cursor-pointer hover:bg-gray-100"
                              onClick={() => onImageReferenceSelected?.(ref)}
                            >
                              <div><strong>SOP Class UID:</strong> {ref.referencedSOPClassUID}</div>
                              <div><strong>SOP Instance UID:</strong> {ref.referencedSOPInstanceUID}</div>
                              {ref.referencedFrameNumber && (
                                <div><strong>Frame Numbers:</strong> {ref.referencedFrameNumber.join(', ')}</div>
                              )}
                              {ref.referencedSegmentNumber && (
                                <div><strong>Segment Numbers:</strong> {ref.referencedSegmentNumber.join(', ')}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export utility functions
export { type SRDocument, type SRContentItem, type CodeSequence, type NumericValue };
export const DICOMSRUtils = {
  extractMeasurements: (srDocument: SRDocument): SRContentItem[] => {
    const measurements: SRContentItem[] = [];
    
    const extractFromItems = (items: SRContentItem[]) => {
      items.forEach(item => {
        if (item.valueType === 'NUM' && item.numericValue) {
          measurements.push(item);
        }
        if (item.contentSequence) {
          extractFromItems(item.contentSequence);
        }
      });
    };
    
    extractFromItems(srDocument.contentSequence);
    return measurements;
  },
  
  extractImageReferences: (srDocument: SRDocument): ReferencedImage[] => {
    const imageRefs: ReferencedImage[] = [];
    
    const extractFromItems = (items: SRContentItem[]) => {
      items.forEach(item => {
        if (item.referencedImageSequence) {
          imageRefs.push(...item.referencedImageSequence);
        }
        if (item.contentSequence) {
          extractFromItems(item.contentSequence);
        }
      });
    };
    
    extractFromItems(srDocument.contentSequence);
    return imageRefs;
  },
  
  findContentByConceptName: (srDocument: SRDocument, conceptName: string): SRContentItem[] => {
    const results: SRContentItem[] = [];
    
    const searchItems = (items: SRContentItem[]) => {
      items.forEach(item => {
        if (item.conceptNameCodeSequence?.codeMapping?.toLowerCase().includes(conceptName.toLowerCase())) {
          results.push(item);
        }
        if (item.contentSequence) {
          searchItems(item.contentSequence);
        }
      });
    };
    
    searchItems(srDocument.contentSequence);
    return results;
  }
};