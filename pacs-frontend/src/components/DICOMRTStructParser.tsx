import React, { useState, useEffect, useCallback } from 'react';
import * as dicomParser from 'dicom-parser';
import * as cornerstone from 'cornerstone-core';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Eye, EyeOff, Palette, Download, Upload, Target, Zap } from 'lucide-react';

interface RTStructureSet {
  structureSetLabel: string;
  structureSetName?: string;
  structureSetDescription?: string;
  structureSetDate?: string;
  structureSetTime?: string;
  referencedFrameOfReferenceUID: string;
  structures: RTStructure[];
}

interface RTStructure {
  roiNumber: number;
  roiName: string;
  roiDescription?: string;
  roiGenerationAlgorithm?: string;
  roiType?: string;
  roiInterpretedType?: string;
  roiColor: [number, number, number];
  contours: RTContour[];
  visible: boolean;
  opacity: number;
  filled: boolean;
  thickness: number;
}

interface RTContour {
  contourNumber: number;
  contourGeometricType: string;
  numberOfContourPoints: number;
  contourData: number[]; // Flattened array of x,y,z coordinates
  referencedSOPInstanceUID?: string;
  slicePosition?: number;
}

interface DICOMRTStructParserProps {
  onRTStructLoaded?: (rtStruct: RTStructureSet) => void;
  onStructureVisibilityChange?: (roiNumber: number, visible: boolean) => void;
  onStructureOpacityChange?: (roiNumber: number, opacity: number) => void;
  onStructureFillChange?: (roiNumber: number, filled: boolean) => void;
  theme?: 'light' | 'dark';
}

export default function DICOMRTStructParser({
  onRTStructLoaded,
  onStructureVisibilityChange,
  onStructureOpacityChange,
  onStructureFillChange,
  theme = 'dark'
}: DICOMRTStructParserProps) {
  const [rtStructData, setRTStructData] = useState<RTStructureSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStructures, setSelectedStructures] = useState<Set<number>>(new Set());

  // Parse DICOM RTSTRUCT file
  const parseDICOMRTStruct = useCallback(async (file: File): Promise<RTStructureSet> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const byteArray = new Uint8Array(arrayBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);

          // Validate this is a DICOM RT Structure Set
          const sopClassUID = dataSet.string('x00080016');
          if (sopClassUID !== '1.2.840.10008.5.1.4.1.1.481.3') {
            throw new Error('Not a valid DICOM RT Structure Set object');
          }

          // Extract structure set information
          const structureSetLabel = dataSet.string('x30060002') || 'Unnamed Structure Set';
          const structureSetName = dataSet.string('x30060004');
          const structureSetDescription = dataSet.string('x30060006');
          const structureSetDate = dataSet.string('x30060008');
          const structureSetTime = dataSet.string('x30060009');

          // Extract referenced frame of reference
          const referencedFrameOfReferenceSequence = dataSet.elements.x30060010;
          let referencedFrameOfReferenceUID = '';
          if (referencedFrameOfReferenceSequence && referencedFrameOfReferenceSequence.items?.[0]) {
            referencedFrameOfReferenceUID = referencedFrameOfReferenceSequence.items[0].dataSet.string('x00200052') || '';
          }

          // Extract ROI Contour Sequence
          const roiContourSequence = dataSet.elements.x30060039;
          const contoursByROI = new Map<number, RTContour[]>();
          const colorsByROI = new Map<number, [number, number, number]>();

          if (roiContourSequence && roiContourSequence.items) {
            roiContourSequence.items.forEach((item: any) => {
              const referencedROINumber = item.dataSet.uint16('x30060084');
              if (!referencedROINumber) return;

              // Extract ROI display color
              const roiDisplayColorString = item.dataSet.string('x3006002a');
              let roiColor: [number, number, number] = [255, 255, 0]; // Default yellow
              if (roiDisplayColorString) {
                const colorValues = roiDisplayColorString.split('\\').map(Number);
                if (colorValues.length >= 3) {
                  roiColor = [colorValues[0], colorValues[1], colorValues[2]];
                }
              }
              colorsByROI.set(referencedROINumber, roiColor);

              // Extract contour sequence
              const contourSequence = item.dataSet.elements.x30060040;
              const contours: RTContour[] = [];

              if (contourSequence && contourSequence.items) {
                contourSequence.items.forEach((contourItem: any, contourIndex: number) => {
                  const contourGeometricType = contourItem.dataSet.string('x30060042') || 'CLOSED_PLANAR';
                  const numberOfContourPoints = contourItem.dataSet.uint16('x30060046') || 0;
                  const contourDataString = contourItem.dataSet.string('x30060050');

                  if (contourDataString && numberOfContourPoints > 0) {
                    const contourData = contourDataString.split('\\').map(Number);
                    
                    // Extract referenced SOP instance UID if available
                    const contourImageSequence = contourItem.dataSet.elements.x30060016;
                    let referencedSOPInstanceUID = '';
                    if (contourImageSequence && contourImageSequence.items?.[0]) {
                      referencedSOPInstanceUID = contourImageSequence.items[0].dataSet.string('x00081155') || '';
                    }

                    // Calculate slice position (Z coordinate of first point)
                    const slicePosition = contourData.length >= 3 ? contourData[2] : 0;

                    contours.push({
                      contourNumber: contourIndex + 1,
                      contourGeometricType,
                      numberOfContourPoints,
                      contourData,
                      referencedSOPInstanceUID,
                      slicePosition
                    });
                  }
                });
              }

              contoursByROI.set(referencedROINumber, contours);
            });
          }

          // Extract Structure Set ROI Sequence
          const structureSetROISequence = dataSet.elements.x30060020;
          const structures: RTStructure[] = [];

          if (structureSetROISequence && structureSetROISequence.items) {
            structureSetROISequence.items.forEach((item: any) => {
              const roiNumber = item.dataSet.uint16('x30060022');
              const roiName = item.dataSet.string('x30060026') || `ROI ${roiNumber}`;
              const roiDescription = item.dataSet.string('x30060028');
              const roiGenerationAlgorithm = item.dataSet.string('x3006002c');

              if (roiNumber) {
                const contours = contoursByROI.get(roiNumber) || [];
                const roiColor = colorsByROI.get(roiNumber) || [255, 255, 0];

                structures.push({
                  roiNumber,
                  roiName,
                  roiDescription,
                  roiGenerationAlgorithm,
                  roiColor,
                  contours,
                  visible: true,
                  opacity: 0.7,
                  filled: false,
                  thickness: 2
                });
              }
            });
          }

          // Extract RT ROI Observations Sequence for additional metadata
          const rtROIObservationsSequence = dataSet.elements.x30060080;
          if (rtROIObservationsSequence && rtROIObservationsSequence.items) {
            rtROIObservationsSequence.items.forEach((item: any) => {
              const observationNumber = item.dataSet.uint16('x30060082');
              const referencedROINumber = item.dataSet.uint16('x30060084');
              const roiObservationLabel = item.dataSet.string('x30060085');
              const rtROIInterpretedType = item.dataSet.string('x300600a4');
              const roiInterpreter = item.dataSet.string('x300600a6');

              // Update structure with observation data
              const structure = structures.find(s => s.roiNumber === referencedROINumber);
              if (structure) {
                structure.roiInterpretedType = rtROIInterpretedType;
                if (roiObservationLabel) {
                  structure.roiDescription = structure.roiDescription 
                    ? `${structure.roiDescription} (${roiObservationLabel})`
                    : roiObservationLabel;
                }
              }
            });
          }

          const rtStructureSet: RTStructureSet = {
            structureSetLabel,
            structureSetName,
            structureSetDescription,
            structureSetDate,
            structureSetTime,
            referencedFrameOfReferenceUID,
            structures
          };

          resolve(rtStructureSet);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setLoading(true);
    setError(null);

    try {
      const rtStruct = await parseDICOMRTStruct(file);
      setRTStructData(rtStruct);
      onRTStructLoaded?.(rtStruct);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse RT Structure Set');
    } finally {
      setLoading(false);
    }
  }, [parseDICOMRTStruct, onRTStructLoaded]);

  // Handle structure visibility toggle
  const handleVisibilityToggle = useCallback((roiNumber: number) => {
    if (!rtStructData) return;

    const updatedStructures = rtStructData.structures.map(structure => 
      structure.roiNumber === roiNumber 
        ? { ...structure, visible: !structure.visible }
        : structure
    );

    setRTStructData({ ...rtStructData, structures: updatedStructures });
    
    const structure = updatedStructures.find(s => s.roiNumber === roiNumber);
    if (structure) {
      onStructureVisibilityChange?.(roiNumber, structure.visible);
    }
  }, [rtStructData, onStructureVisibilityChange]);

  // Handle structure opacity change
  const handleOpacityChange = useCallback((roiNumber: number, opacity: number) => {
    if (!rtStructData) return;

    const updatedStructures = rtStructData.structures.map(structure => 
      structure.roiNumber === roiNumber 
        ? { ...structure, opacity: opacity / 100 }
        : structure
    );

    setRTStructData({ ...rtStructData, structures: updatedStructures });
    onStructureOpacityChange?.(roiNumber, opacity / 100);
  }, [rtStructData, onStructureOpacityChange]);

  // Handle structure fill toggle
  const handleFillToggle = useCallback((roiNumber: number) => {
    if (!rtStructData) return;

    const updatedStructures = rtStructData.structures.map(structure => 
      structure.roiNumber === roiNumber 
        ? { ...structure, filled: !structure.filled }
        : structure
    );

    setRTStructData({ ...rtStructData, structures: updatedStructures });
    
    const structure = updatedStructures.find(s => s.roiNumber === roiNumber);
    if (structure) {
      onStructureFillChange?.(roiNumber, structure.filled);
    }
  }, [rtStructData, onStructureFillChange]);

  // Toggle structure selection
  const toggleStructureSelection = useCallback((roiNumber: number) => {
    const newSelection = new Set(selectedStructures);
    if (newSelection.has(roiNumber)) {
      newSelection.delete(roiNumber);
    } else {
      newSelection.add(roiNumber);
    }
    setSelectedStructures(newSelection);
  }, [selectedStructures]);

  // Generate contour overlay for cornerstone
  const generateContourOverlay = useCallback((roiNumber: number, slicePosition: number, tolerance: number = 1.0) => {
    if (!rtStructData) return null;

    const structure = rtStructData.structures.find(s => s.roiNumber === roiNumber);
    if (!structure || !structure.visible) return null;

    // Find contours for this slice position
    const relevantContours = structure.contours.filter(contour => 
      Math.abs((contour.slicePosition || 0) - slicePosition) <= tolerance
    );

    if (relevantContours.length === 0) return null;

    return {
      contours: relevantContours,
      color: structure.roiColor,
      opacity: structure.opacity,
      filled: structure.filled,
      thickness: structure.thickness
    };
  }, [rtStructData]);

  return (
    <div className={`space-y-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* File Upload */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>DICOM RT Structure Set Loader</span>
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
              <div className="text-blue-500">Parsing DICOM RT Structure Set...</div>
            )}
            {error && (
              <div className="text-red-500">Error: {error}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RT Structure Set Controls */}
      {rtStructData && (
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>RT Structure Set: {rtStructData.structureSetLabel}</span>
              <Badge variant="secondary">
                {rtStructData.structures.length} structures
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Structure Set Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {rtStructData.structureSetName && (
                  <div>Name: {rtStructData.structureSetName}</div>
                )}
                {rtStructData.structureSetDescription && (
                  <div>Description: {rtStructData.structureSetDescription}</div>
                )}
                {rtStructData.structureSetDate && (
                  <div>Date: {rtStructData.structureSetDate}</div>
                )}
                <div>Frame of Reference: {rtStructData.referencedFrameOfReferenceUID.slice(-8)}...</div>
              </div>

              {/* Structure List */}
              <div className="space-y-3">
                {rtStructData.structures.map((structure) => (
                  <div 
                    key={structure.roiNumber}
                    className={`p-3 rounded-lg border ${
                      selectedStructures.has(structure.roiNumber)
                        ? theme === 'dark' 
                          ? 'bg-blue-900 border-blue-600' 
                          : 'bg-blue-50 border-blue-300'
                        : theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600' 
                          : 'bg-gray-50 border-gray-200'
                    } cursor-pointer`}
                    onClick={() => toggleStructureSelection(structure.roiNumber)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: `rgb(${structure.roiColor.join(',')})` }}
                        />
                        <div>
                          <div className="font-medium">{structure.roiName}</div>
                          {structure.roiDescription && (
                            <div className="text-xs text-gray-500">{structure.roiDescription}</div>
                          )}
                          {structure.roiInterpretedType && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {structure.roiInterpretedType}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFillToggle(structure.roiNumber);
                          }}
                          className={structure.filled ? 'text-blue-500' : ''}
                        >
                          <Zap className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVisibilityToggle(structure.roiNumber);
                          }}
                        >
                          {structure.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    {structure.visible && (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs">Opacity:</span>
                          <Slider
                            value={[structure.opacity * 100]}
                            onValueChange={([value]) => handleOpacityChange(structure.roiNumber, value)}
                            max={100}
                            step={5}
                            className="flex-1"
                          />
                          <span className="text-xs w-8">{Math.round(structure.opacity * 100)}%</span>
                        </div>
                        
                        <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
                          <div>Contours: {structure.contours.length}</div>
                          <div>ROI #{structure.roiNumber}</div>
                          {structure.roiGenerationAlgorithm && (
                            <div className="col-span-2">Algorithm: {structure.roiGenerationAlgorithm}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bulk Actions */}
              {selectedStructures.size > 0 && (
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark' ? 'bg-blue-900 border-blue-600' : 'bg-blue-50 border-blue-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedStructures.size} structure(s) selected
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          selectedStructures.forEach(roiNumber => {
                            handleVisibilityToggle(roiNumber);
                          });
                        }}
                      >
                        Toggle Visibility
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedStructures(new Set())}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export utility functions for external use
export { type RTStructureSet, type RTStructure, type RTContour };
export const DICOMRTStructUtils = {
  generateContourOverlay: (rtStructData: RTStructureSet, roiNumber: number, slicePosition: number, tolerance: number = 1.0) => {
    const structure = rtStructData.structures.find(s => s.roiNumber === roiNumber);
    if (!structure || !structure.visible) return null;

    const relevantContours = structure.contours.filter(contour => 
      Math.abs((contour.slicePosition || 0) - slicePosition) <= tolerance
    );

    if (relevantContours.length === 0) return null;

    return {
      contours: relevantContours,
      color: structure.roiColor,
      opacity: structure.opacity,
      filled: structure.filled,
      thickness: structure.thickness
    };
  },
  
  getStructureStatistics: (structure: RTStructure) => {
    const totalPoints = structure.contours.reduce((sum, contour) => sum + contour.numberOfContourPoints, 0);
    const sliceCount = new Set(structure.contours.map(c => c.slicePosition)).size;
    
    return {
      totalContours: structure.contours.length,
      totalPoints,
      sliceCount,
      geometricTypes: [...new Set(structure.contours.map(c => c.contourGeometricType))]
    };
  }
};