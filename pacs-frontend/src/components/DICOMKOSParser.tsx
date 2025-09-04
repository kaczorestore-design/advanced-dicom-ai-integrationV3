import React, { useState, useCallback } from 'react';
import * as dicomParser from 'dicom-parser';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Key, Upload, Eye, Star, Image, FileText } from 'lucide-react';

interface KOSDocument {
  sopInstanceUID: string;
  sopClassUID: string;
  studyInstanceUID: string;
  seriesInstanceUID: string;
  instanceNumber: number;
  contentDate?: string;
  contentTime?: string;
  documentTitle?: string;
  evidenceSequence: EvidenceSequence[];
  currentRequestedProcedureEvidenceSequence?: EvidenceSequence[];
  identicalDocumentsSequence?: IdenticalDocument[];
  conceptNameCodeSequence?: CodeSequence;
  contentTemplateSequence?: TemplateIdentification;
  institutionName?: string;
  institutionalDepartmentName?: string;
  referringPhysicianName?: string;
  performingPhysicianName?: string;
  operatorName?: string;
  manufacturer?: string;
  manufacturerModelName?: string;
  deviceSerialNumber?: string;
  softwareVersions?: string;
}

interface EvidenceSequence {
  studyInstanceUID: string;
  seriesSequence: SeriesSequence[];
}

interface SeriesSequence {
  seriesInstanceUID: string;
  referencedSOPSequence: ReferencedSOPSequence[];
}

interface ReferencedSOPSequence {
  referencedSOPClassUID: string;
  referencedSOPInstanceUID: string;
  referencedFrameNumber?: number[];
  referencedSegmentNumber?: number[];
  purposeOfReferenceCodeSequence?: CodeSequence;
}

interface IdenticalDocument {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  sopClassUID: string;
}

interface CodeSequence {
  codeValue: string;
  codingSchemeDesignator: string;
  codingSchemeVersion?: string;
  codeMapping?: string;
}

interface TemplateIdentification {
  mappingResource: string;
  templateID: string;
  templateVersion?: string;
}

interface DICOMKOSParserProps {
  onKOSLoaded?: (kosDocument: KOSDocument) => void;
  onImageSelected?: (imageRef: ReferencedSOPSequence, studyUID: string, seriesUID: string) => void;
  onStudySelected?: (studyUID: string) => void;
  onSeriesSelected?: (studyUID: string, seriesUID: string) => void;
  theme?: 'light' | 'dark';
}

export default function DICOMKOSParser({
  onKOSLoaded,
  onImageSelected,
  onStudySelected,
  onSeriesSelected,
  theme = 'dark'
}: DICOMKOSParserProps) {
  const [kosDocument, setKOSDocument] = useState<KOSDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudies, setSelectedStudies] = useState<Set<string>>(new Set());
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [expandedStudies, setExpandedStudies] = useState<Set<string>>(new Set());
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  // Parse DICOM KOS file
  const parseDICOMKOS = useCallback(async (file: File): Promise<KOSDocument> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const byteArray = new Uint8Array(arrayBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);

          // Validate this is a DICOM KOS object
          const sopClassUID = dataSet.string('x00080016');
          if (sopClassUID !== '1.2.840.10008.5.1.4.1.1.88.59') {
            throw new Error('Not a valid DICOM Key Object Selection Document');
          }

          // Extract basic KOS information
          const sopInstanceUID = dataSet.string('x00080018') || '';
          const studyInstanceUID = dataSet.string('x0020000d') || '';
          const seriesInstanceUID = dataSet.string('x0020000e') || '';
          const instanceNumber = dataSet.uint16('x00200013') || 0;
          const contentDate = dataSet.string('x00080023');
          const contentTime = dataSet.string('x00080033');

          // Extract document title from concept name code sequence
          const conceptNameCodeSequence = extractCodeSequence(dataSet as unknown as Record<string, unknown>, 'x0040a043');
          const documentTitle = conceptNameCodeSequence?.codeMapping || 'Key Object Selection Document';

          // Extract template identification
          let contentTemplateSequence: TemplateIdentification | undefined;
          const templateSeq = dataSet.elements.x0040a504;
          if (templateSeq && templateSeq.items?.[0]) {
            const templateItem = templateSeq.items[0].dataSet;
            if (templateItem) {
              contentTemplateSequence = {
                mappingResource: templateItem.string('x00080105') || '',
                templateID: templateItem.string('x0040db00') || '',
                templateVersion: templateItem.string('x0040db06')
              };
            }
          }

          // Extract evidence sequence (main content)
          const evidenceSequence = extractEvidenceSequence(dataSet as unknown as Record<string, unknown>, 'x0040a375');

          // Extract current requested procedure evidence sequence
          const currentRequestedProcedureEvidenceSequence = extractEvidenceSequence(dataSet as unknown as Record<string, unknown>, 'x0040a385');

          // Extract identical documents sequence
          const identicalDocumentsSequence = extractIdenticalDocuments(dataSet as unknown as Record<string, unknown>);

          // Extract institutional and personnel information
          const institutionName = dataSet.string('x00080080');
          const institutionalDepartmentName = dataSet.string('x00081040');
          const referringPhysicianName = dataSet.string('x00080090');
          const performingPhysicianName = dataSet.string('x00081050');
          const operatorName = dataSet.string('x00081070');
          const manufacturer = dataSet.string('x00080070');
          const manufacturerModelName = dataSet.string('x00081090');
          const deviceSerialNumber = dataSet.string('x00181000');
          const softwareVersions = dataSet.string('x00181020');

          const kosDocument: KOSDocument = {
            sopInstanceUID,
            sopClassUID,
            studyInstanceUID,
            seriesInstanceUID,
            instanceNumber,
            contentDate,
            contentTime,
            documentTitle,
            evidenceSequence,
            currentRequestedProcedureEvidenceSequence,
            identicalDocumentsSequence,
            conceptNameCodeSequence,
            contentTemplateSequence,
            institutionName,
            institutionalDepartmentName,
            referringPhysicianName,
            performingPhysicianName,
            operatorName,
            manufacturer,
            manufacturerModelName,
            deviceSerialNumber,
            softwareVersions
          };

          resolve(kosDocument);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Extract code sequence from dataset
  const extractCodeSequence = (dataSet: Record<string, unknown>, tag: string): CodeSequence | undefined => {
    const sequence = (dataSet.elements as Record<string, unknown>)[tag] as Record<string, unknown> & { items?: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] };
    if (!sequence || !sequence.items?.[0]) return undefined;

    const item = sequence.items[0].dataSet;
    return {
      codeValue: item.string('x00080100') || '',
      codingSchemeDesignator: item.string('x00080102') || '',
      codingSchemeVersion: item.string('x00080103'),
      codeMapping: item.string('x00080104')
    };
  };

  // Extract evidence sequence
  const extractEvidenceSequence = (dataSet: Record<string, unknown>, tag: string): EvidenceSequence[] => {
    const sequence = (dataSet.elements as Record<string, unknown>)[tag] as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = item.dataSet as Record<string, unknown> & { string(tag: string): string };
      const studyInstanceUID = itemDataSet.string('x0020000d') || '';
      
      // Extract series sequence
      const seriesSequence = extractSeriesSequence(itemDataSet);

      return {
        studyInstanceUID,
        seriesSequence
      };
    });
  };

  // Extract series sequence
  const extractSeriesSequence = (dataSet: Record<string, unknown>): SeriesSequence[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00081115 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = item.dataSet as Record<string, unknown> & { string(tag: string): string };
      const seriesInstanceUID = itemDataSet.string('x0020000e') || '';
      
      // Extract referenced SOP sequence
      const referencedSOPSequence = extractReferencedSOPSequence(itemDataSet);

      return {
        seriesInstanceUID,
        referencedSOPSequence
      };
    });
  };

  // Extract referenced SOP sequence
  const extractReferencedSOPSequence = (dataSet: Record<string, unknown>): ReferencedSOPSequence[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00081140 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = item.dataSet as Record<string, unknown> & { string(tag: string): string };
      const referencedSOPClassUID = itemDataSet.string('x00081150') || '';
      const referencedSOPInstanceUID = itemDataSet.string('x00081155') || '';
      
      // Extract referenced frame numbers
      const referencedFrameNumberString = itemDataSet.string('x00081160');
      const referencedFrameNumber = referencedFrameNumberString 
        ? referencedFrameNumberString.split('\\').map(Number) 
        : undefined;
      
      // Extract referenced segment numbers
      const referencedSegmentNumberString = itemDataSet.string('x0062000b');
      const referencedSegmentNumber = referencedSegmentNumberString 
        ? referencedSegmentNumberString.split('\\').map(Number) 
        : undefined;
      
      // Extract purpose of reference code sequence
      const purposeOfReferenceCodeSequence = extractCodeSequence(itemDataSet, 'x0040a170');

      return {
        referencedSOPClassUID,
        referencedSOPInstanceUID,
        referencedFrameNumber,
        referencedSegmentNumber,
        purposeOfReferenceCodeSequence
      };
    });
  };

  // Extract identical documents sequence
  const extractIdenticalDocuments = (dataSet: Record<string, unknown>): IdenticalDocument[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x0040a525 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = item.dataSet as Record<string, unknown> & { string(tag: string): string };
      return {
        studyInstanceUID: itemDataSet.string('x0020000d') || '',
        seriesInstanceUID: itemDataSet.string('x0020000e') || '',
        sopInstanceUID: itemDataSet.string('x00080018') || '',
        sopClassUID: itemDataSet.string('x00080016') || ''
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
      const kos = await parseDICOMKOS(file);
      setKOSDocument(kos);
      onKOSLoaded?.(kos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Key Object Selection Document');
    } finally {
      setLoading(false);
    }
  }, [parseDICOMKOS, onKOSLoaded]);

  // Toggle study expansion
  const toggleStudyExpansion = useCallback((studyUID: string) => {
    const newExpanded = new Set(expandedStudies);
    if (newExpanded.has(studyUID)) {
      newExpanded.delete(studyUID);
    } else {
      newExpanded.add(studyUID);
    }
    setExpandedStudies(newExpanded);
  }, [expandedStudies]);

  // Toggle series expansion
  const toggleSeriesExpansion = useCallback((seriesUID: string) => {
    const newExpanded = new Set(expandedSeries);
    if (newExpanded.has(seriesUID)) {
      newExpanded.delete(seriesUID);
    } else {
      newExpanded.add(seriesUID);
    }
    setExpandedSeries(newExpanded);
  }, [expandedSeries]);

  // Toggle study selection
  const toggleStudySelection = useCallback((studyUID: string) => {
    const newSelection = new Set(selectedStudies);
    if (newSelection.has(studyUID)) {
      newSelection.delete(studyUID);
    } else {
      newSelection.add(studyUID);
    }
    setSelectedStudies(newSelection);
  }, [selectedStudies]);

  // Toggle series selection
  const toggleSeriesSelection = useCallback((seriesUID: string) => {
    const newSelection = new Set(selectedSeries);
    if (newSelection.has(seriesUID)) {
      newSelection.delete(seriesUID);
    } else {
      newSelection.add(seriesUID);
    }
    setSelectedSeries(newSelection);
  }, [selectedSeries]);

  // Toggle image selection
  const toggleImageSelection = useCallback((imageUID: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageUID)) {
      newSelection.delete(imageUID);
    } else {
      newSelection.add(imageUID);
    }
    setSelectedImages(newSelection);
  }, [selectedImages]);

  // Get statistics
  const getStatistics = useCallback(() => {
    if (!kosDocument) return { studies: 0, series: 0, images: 0 };

    const studies = kosDocument.evidenceSequence.length;
    const series = kosDocument.evidenceSequence.reduce((sum, evidence) => 
      sum + evidence.seriesSequence.length, 0
    );
    const images = kosDocument.evidenceSequence.reduce((sum, evidence) => 
      sum + evidence.seriesSequence.reduce((seriesSum, series) => 
        seriesSum + series.referencedSOPSequence.length, 0
      ), 0
    );

    return { studies, series, images };
  }, [kosDocument]);

  // Filter evidence based on search term
  const filterEvidence = useCallback((evidence: EvidenceSequence[], searchTerm: string) => {
    if (!searchTerm) return evidence;
    
    const searchLower = searchTerm.toLowerCase();
    return evidence.filter(study => 
      study.studyInstanceUID.toLowerCase().includes(searchLower) ||
      study.seriesSequence.some(series => 
        series.seriesInstanceUID.toLowerCase().includes(searchLower) ||
        series.referencedSOPSequence.some(sop => 
          sop.referencedSOPInstanceUID.toLowerCase().includes(searchLower) ||
          sop.referencedSOPClassUID.toLowerCase().includes(searchLower)
        )
      )
    );
  }, []);

  const statistics = getStatistics();
  const filteredEvidence = kosDocument ? filterEvidence(kosDocument.evidenceSequence, searchTerm) : [];

  return (
    <div className={`space-y-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* File Upload */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>DICOM Key Object Selection Loader</span>
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
              <div className="text-blue-500">Parsing DICOM Key Object Selection Document...</div>
            )}
            {error && (
              <div className="text-red-500">Error: {error}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KOS Document Viewer */}
      {kosDocument && (
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="w-5 h-5" />
              <span>Key Object Selection: {kosDocument.documentTitle}</span>
              <div className="flex space-x-2">
                <Badge variant="secondary">{statistics.studies} studies</Badge>
                <Badge variant="secondary">{statistics.series} series</Badge>
                <Badge variant="secondary">{statistics.images} images</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="evidence" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="identical">Identical Docs</TabsTrigger>
                <TabsTrigger value="selection">Selection</TabsTrigger>
              </TabsList>
              
              <TabsContent value="evidence" className="space-y-4">
                {/* Search */}
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search studies, series, or images..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full p-2 border rounded-md ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedStudies(new Set());
                      setSelectedSeries(new Set());
                      setSelectedImages(new Set());
                    }}
                  >
                    Clear Selection
                  </Button>
                </div>

                {/* Evidence Tree */}
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredEvidence.map((evidence, evidenceIndex) => {
                      const isStudyExpanded = expandedStudies.has(evidence.studyInstanceUID);
                      const isStudySelected = selectedStudies.has(evidence.studyInstanceUID);
                      
                      return (
                        <div key={evidenceIndex} className="space-y-2">
                          {/* Study Level */}
                          <div 
                            className={`p-3 rounded-lg border cursor-pointer ${
                              isStudySelected
                                ? theme === 'dark' 
                                  ? 'bg-blue-900 border-blue-600' 
                                  : 'bg-blue-50 border-blue-300'
                                : theme === 'dark' 
                                  ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => toggleStudyExpansion(evidence.studyInstanceUID)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">{isStudyExpanded ? '▼' : '▶'}</span>
                                <FileText className="w-4 h-4" />
                                <span className="font-medium">Study</span>
                                <Badge variant="outline">
                                  {evidence.seriesSequence.length} series
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStudySelection(evidence.studyInstanceUID);
                                  }}
                                >
                                  <Star className={`w-4 h-4 ${isStudySelected ? 'fill-current' : ''}`} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStudySelected?.(evidence.studyInstanceUID);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              UID: {evidence.studyInstanceUID}
                            </div>
                          </div>

                          {/* Series Level */}
                          {isStudyExpanded && (
                            <div className="ml-6 space-y-2">
                              {evidence.seriesSequence.map((series, seriesIndex) => {
                                const isSeriesExpanded = expandedSeries.has(series.seriesInstanceUID);
                                const isSeriesSelected = selectedSeries.has(series.seriesInstanceUID);
                                
                                return (
                                  <div key={seriesIndex} className="space-y-2">
                                    {/* Series */}
                                    <div 
                                      className={`p-2 rounded border cursor-pointer ${
                                        isSeriesSelected
                                          ? theme === 'dark' 
                                            ? 'bg-green-900 border-green-600' 
                                            : 'bg-green-50 border-green-300'
                                          : theme === 'dark' 
                                            ? 'bg-gray-600 border-gray-500 hover:bg-gray-500' 
                                            : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                                      }`}
                                      onClick={() => toggleSeriesExpansion(series.seriesInstanceUID)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm">{isSeriesExpanded ? '▼' : '▶'}</span>
                                          <Image className="w-4 h-4" />
                                          <span className="text-sm font-medium">Series</span>
                                          <Badge variant="outline" className="text-xs">
                                            {series.referencedSOPSequence.length} images
                                          </Badge>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleSeriesSelection(series.seriesInstanceUID);
                                            }}
                                          >
                                            <Star className={`w-3 h-3 ${isSeriesSelected ? 'fill-current' : ''}`} />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSeriesSelected?.(evidence.studyInstanceUID, series.seriesInstanceUID);
                                            }}
                                          >
                                            <Eye className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="mt-1 text-xs text-gray-500">
                                        UID: {series.seriesInstanceUID}
                                      </div>
                                    </div>

                                    {/* Images Level */}
                                    {isSeriesExpanded && (
                                      <div className="ml-6 space-y-1">
                                        {series.referencedSOPSequence.map((sop, sopIndex) => {
                                          const isImageSelected = selectedImages.has(sop.referencedSOPInstanceUID);
                                          
                                          return (
                                            <div 
                                              key={sopIndex}
                                              className={`p-2 rounded border cursor-pointer ${
                                                isImageSelected
                                                  ? theme === 'dark' 
                                                    ? 'bg-yellow-900 border-yellow-600' 
                                                    : 'bg-yellow-50 border-yellow-300'
                                                  : theme === 'dark' 
                                                    ? 'bg-gray-500 border-gray-400 hover:bg-gray-400' 
                                                    : 'bg-gray-200 border-gray-400 hover:bg-gray-300'
                                              }`}
                                              onClick={() => toggleImageSelection(sop.referencedSOPInstanceUID)}
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                  <Image className="w-3 h-3" />
                                                  <span className="text-xs font-medium">Image {sopIndex + 1}</span>
                                                  {sop.referencedFrameNumber && (
                                                    <Badge variant="outline" className="text-xs">
                                                      Frames: {sop.referencedFrameNumber.join(',')}
                                                    </Badge>
                                                  )}
                                                  {sop.purposeOfReferenceCodeSequence && (
                                                    <Badge variant="secondary" className="text-xs">
                                                      {sop.purposeOfReferenceCodeSequence.codeMapping}
                                                    </Badge>
                                                  )}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onImageSelected?.(sop, evidence.studyInstanceUID, series.seriesInstanceUID);
                                                    }}
                                                  >
                                                    <Eye className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              </div>
                                              <div className="mt-1 text-xs text-gray-500">
                                                <div>SOP Class: {sop.referencedSOPClassUID}</div>
                                                <div>SOP Instance: {sop.referencedSOPInstanceUID}</div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>SOP Instance UID:</strong> {kosDocument.sopInstanceUID}</div>
                  <div><strong>SOP Class UID:</strong> {kosDocument.sopClassUID}</div>
                  <div><strong>Study Instance UID:</strong> {kosDocument.studyInstanceUID}</div>
                  <div><strong>Series Instance UID:</strong> {kosDocument.seriesInstanceUID}</div>
                  <div><strong>Instance Number:</strong> {kosDocument.instanceNumber}</div>
                  {kosDocument.contentDate && (
                    <div><strong>Content Date:</strong> {kosDocument.contentDate}</div>
                  )}
                  {kosDocument.contentTime && (
                    <div><strong>Content Time:</strong> {kosDocument.contentTime}</div>
                  )}
                  {kosDocument.institutionName && (
                    <div><strong>Institution:</strong> {kosDocument.institutionName}</div>
                  )}
                  {kosDocument.institutionalDepartmentName && (
                    <div><strong>Department:</strong> {kosDocument.institutionalDepartmentName}</div>
                  )}
                  {kosDocument.referringPhysicianName && (
                    <div><strong>Referring Physician:</strong> {kosDocument.referringPhysicianName}</div>
                  )}
                  {kosDocument.performingPhysicianName && (
                    <div><strong>Performing Physician:</strong> {kosDocument.performingPhysicianName}</div>
                  )}
                  {kosDocument.operatorName && (
                    <div><strong>Operator:</strong> {kosDocument.operatorName}</div>
                  )}
                  {kosDocument.manufacturer && (
                    <div><strong>Manufacturer:</strong> {kosDocument.manufacturer}</div>
                  )}
                  {kosDocument.manufacturerModelName && (
                    <div><strong>Model:</strong> {kosDocument.manufacturerModelName}</div>
                  )}
                  {kosDocument.deviceSerialNumber && (
                    <div><strong>Serial Number:</strong> {kosDocument.deviceSerialNumber}</div>
                  )}
                  {kosDocument.softwareVersions && (
                    <div><strong>Software Version:</strong> {kosDocument.softwareVersions}</div>
                  )}
                </div>
                
                {kosDocument.contentTemplateSequence && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Template Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Mapping Resource:</strong> {kosDocument.contentTemplateSequence.mappingResource}</div>
                      <div><strong>Template ID:</strong> {kosDocument.contentTemplateSequence.templateID}</div>
                      {kosDocument.contentTemplateSequence.templateVersion && (
                        <div><strong>Template Version:</strong> {kosDocument.contentTemplateSequence.templateVersion}</div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="identical" className="space-y-4">
                {kosDocument.identicalDocumentsSequence && kosDocument.identicalDocumentsSequence.length > 0 ? (
                  <div>
                    <h4 className="font-medium mb-2">Identical Documents ({kosDocument.identicalDocumentsSequence.length})</h4>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {kosDocument.identicalDocumentsSequence.map((doc, index) => (
                          <div key={index} className="p-2 border rounded text-sm">
                            <div><strong>Study UID:</strong> {doc.studyInstanceUID}</div>
                            <div><strong>Series UID:</strong> {doc.seriesInstanceUID}</div>
                            <div><strong>SOP Instance UID:</strong> {doc.sopInstanceUID}</div>
                            <div><strong>SOP Class UID:</strong> {doc.sopClassUID}</div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-gray-500">No identical documents referenced.</div>
                )}
              </TabsContent>
              
              <TabsContent value="selection" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Selected Studies ({selectedStudies.size})</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {Array.from(selectedStudies).map(studyUID => (
                          <div key={studyUID} className="text-xs p-1 bg-blue-100 rounded">
                            {studyUID.slice(-8)}...
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Selected Series ({selectedSeries.size})</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {Array.from(selectedSeries).map(seriesUID => (
                          <div key={seriesUID} className="text-xs p-1 bg-green-100 rounded">
                            {seriesUID.slice(-8)}...
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Selected Images ({selectedImages.size})</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {Array.from(selectedImages).map(imageUID => (
                          <div key={imageUID} className="text-xs p-1 bg-yellow-100 rounded">
                            {imageUID.slice(-8)}...
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Select all studies
                      const allStudyUIDs = kosDocument.evidenceSequence.map(e => e.studyInstanceUID);
                      setSelectedStudies(new Set(allStudyUIDs));
                    }}
                  >
                    Select All Studies
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Select all series
                      const allSeriesUIDs = kosDocument.evidenceSequence.flatMap(e => 
                        e.seriesSequence.map(s => s.seriesInstanceUID)
                      );
                      setSelectedSeries(new Set(allSeriesUIDs));
                    }}
                  >
                    Select All Series
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Select all images
                      const allImageUIDs = kosDocument.evidenceSequence.flatMap(e => 
                        e.seriesSequence.flatMap(s => 
                          s.referencedSOPSequence.map(sop => sop.referencedSOPInstanceUID)
                        )
                      );
                      setSelectedImages(new Set(allImageUIDs));
                    }}
                  >
                    Select All Images
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export utility functions
export { type KOSDocument, type EvidenceSequence, type ReferencedSOPSequence };
export const DICOMKOSUtils = {
  getAllReferencedImages: (kosDocument: KOSDocument): ReferencedSOPSequence[] => {
    return kosDocument.evidenceSequence.flatMap(evidence => 
      evidence.seriesSequence.flatMap(series => 
        series.referencedSOPSequence
      )
    );
  },
  
  getImagesByStudy: (kosDocument: KOSDocument, studyUID: string): ReferencedSOPSequence[] => {
    const evidence = kosDocument.evidenceSequence.find(e => e.studyInstanceUID === studyUID);
    if (!evidence) return [];
    
    return evidence.seriesSequence.flatMap(series => series.referencedSOPSequence);
  },
  
  getImagesBySeries: (kosDocument: KOSDocument, studyUID: string, seriesUID: string): ReferencedSOPSequence[] => {
    const evidence = kosDocument.evidenceSequence.find(e => e.studyInstanceUID === studyUID);
    if (!evidence) return [];
    
    const series = evidence.seriesSequence.find(s => s.seriesInstanceUID === seriesUID);
    if (!series) return [];
    
    return series.referencedSOPSequence;
  },
  
  getStatistics: (kosDocument: KOSDocument) => {
    const studies = kosDocument.evidenceSequence.length;
    const series = kosDocument.evidenceSequence.reduce((sum, evidence) => 
      sum + evidence.seriesSequence.length, 0
    );
    const images = kosDocument.evidenceSequence.reduce((sum, evidence) => 
      sum + evidence.seriesSequence.reduce((seriesSum, series) => 
        seriesSum + series.referencedSOPSequence.length, 0
      ), 0
    );
    
    return { studies, series, images };
  }
};
