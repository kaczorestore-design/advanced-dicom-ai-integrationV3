import React, { useState, useCallback } from 'react';
import * as dicomParser from 'dicom-parser';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Eye, EyeOff, Palette, Upload } from 'lucide-react';

interface SegmentInfo {
  segmentNumber: number;
  segmentLabel: string;
  segmentDescription?: string;
  algorithmType?: string;
  algorithmName?: string;
  recommendedDisplayRGBValue?: [number, number, number];
  segmentedPropertyCategory?: string;
  segmentedPropertyType?: string;
  anatomicRegion?: string;
  visible: boolean;
  opacity: number;
  color: [number, number, number];
}

interface SegmentationData {
  segments: SegmentInfo[];
  pixelData: Uint8Array | Uint16Array;
  rows: number;
  columns: number;
  numberOfFrames: number;
  imagePositions: number[][];
  imageOrientations: number[][];
  pixelSpacing: [number, number];
  sliceThickness?: number;
  frameOfReferenceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
}

interface DICOMSegmentationParserProps {
  onSegmentationLoaded?: (segmentation: SegmentationData) => void;
  onSegmentVisibilityChange?: (segmentNumber: number, visible: boolean) => void;
  onSegmentOpacityChange?: (segmentNumber: number, opacity: number) => void;
  theme?: 'light' | 'dark';
}

export default function DICOMSegmentationParser({
  onSegmentationLoaded,
  onSegmentVisibilityChange,
  onSegmentOpacityChange,
  theme = 'dark'
}: DICOMSegmentationParserProps) {
  const [segmentationData, setSegmentationData] = useState<SegmentationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Parse DICOM SEG file
  const parseDICOMSEG = useCallback(async (file: File): Promise<SegmentationData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const byteArray = new Uint8Array(arrayBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);

          // Validate this is a DICOM SEG object
          const sopClassUID = dataSet.string('x00080016');
          if (sopClassUID !== '1.2.840.10008.5.1.4.1.1.66.4') {
            throw new Error('Not a valid DICOM Segmentation object');
          }

          // Extract basic image information
          const rows = dataSet.uint16('x00280010') || 0;
          const columns = dataSet.uint16('x00280011') || 0;
          const numberOfFrames = dataSet.uint16('x00280008') || 1;
          const frameOfReferenceUID = dataSet.string('x00200052') || '';
          const seriesInstanceUID = dataSet.string('x0020000e') || '';
          const sopInstanceUID = dataSet.string('x00080018') || '';

          // Extract pixel spacing
          const pixelSpacingString = dataSet.string('x00280030');
          const pixelSpacing: [number, number] = pixelSpacingString 
            ? pixelSpacingString.split('\\').map(Number) as [number, number]
            : [1, 1];

          const sliceThickness = dataSet.floatString('x00180050');

          // Extract segment sequence
          const segmentSequence = dataSet.elements.x0062000a;
          const segments: SegmentInfo[] = [];

          if (segmentSequence) {
            const segmentItems = (segmentSequence as unknown as Record<string, unknown> & { items?: Record<string, unknown>[] }).items || [];
            segmentItems.forEach((item: Record<string, unknown>, index: number) => {
              const itemDataSet = item.dataSet as Record<string, unknown> & { uint16(tag: string): number; string(tag: string): string; elements: Record<string, unknown> };
              const segmentNumber = itemDataSet.uint16('x00620004') || (index + 1);
              const segmentLabel = itemDataSet.string('x00620005') || `Segment ${segmentNumber}`;
              const segmentDescription = itemDataSet.string('x00620006');
              const algorithmType = itemDataSet.string('x0062000c');
              const algorithmName = itemDataSet.string('x0062000d');
              
              // Extract recommended display color
              const colorString = itemDataSet.string('x0062000d');
              let recommendedDisplayRGBValue: [number, number, number] = [255, 0, 0]; // Default red
              if (colorString) {
                const colorValues = colorString.split('\\').map(Number);
                if (colorValues.length >= 3) {
                  recommendedDisplayRGBValue = [colorValues[0], colorValues[1], colorValues[2]];
                }
              }

              // Extract anatomical information
              const anatomicRegionSequence = itemDataSet.elements.x00082218;
              const anatomicRegion = anatomicRegionSequence && (anatomicRegionSequence as Record<string, unknown> & { items?: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] }).items?.[0] 
                ? (anatomicRegionSequence as Record<string, unknown> & { items: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] }).items[0].dataSet.string('x00080104') || ''
                : '';

              const segmentedPropertyCategorySequence = itemDataSet.elements.x0062000f;
              const segmentedPropertyCategory = segmentedPropertyCategorySequence && (segmentedPropertyCategorySequence as Record<string, unknown> & { items?: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] }).items?.[0]
                ? (segmentedPropertyCategorySequence as Record<string, unknown> & { items: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] }).items[0].dataSet.string('x00080104') || ''
                : '';

              const segmentedPropertyTypeSequence = itemDataSet.elements.x00620010;
              const segmentedPropertyType = segmentedPropertyTypeSequence && (segmentedPropertyTypeSequence as Record<string, unknown> & { items?: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] }).items?.[0]
                ? (segmentedPropertyTypeSequence as Record<string, unknown> & { items: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] }).items[0].dataSet.string('x00080104') || ''
                : '';

              segments.push({
                segmentNumber,
                segmentLabel,
                segmentDescription,
                algorithmType,
                algorithmName,
                recommendedDisplayRGBValue,
                segmentedPropertyCategory,
                segmentedPropertyType,
                anatomicRegion,
                visible: true,
                opacity: 0.5,
                color: recommendedDisplayRGBValue
              });
            });
          }

          // Extract pixel data
          const pixelDataElement = dataSet.elements.x7fe00010;
          if (!pixelDataElement) {
            throw new Error('No pixel data found in segmentation');
          }

          let pixelData: Uint8Array | Uint16Array;
          const bitsAllocated = dataSet.uint16('x00280100') || 8;
          
          if (bitsAllocated === 8) {
            pixelData = new Uint8Array(byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length);
          } else {
            pixelData = new Uint16Array(byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length / 2);
          }

          // Extract frame positions and orientations
          const imagePositions: number[][] = [];
          const imageOrientations: number[][] = [];

          // For multi-frame, extract per-frame functional groups
          const perFrameFunctionalGroupsSequence = dataSet.elements.x52009230;
          if (perFrameFunctionalGroupsSequence && (perFrameFunctionalGroupsSequence as unknown as Record<string, unknown> & { items?: Record<string, unknown>[] }).items) {
            (perFrameFunctionalGroupsSequence as unknown as Record<string, unknown> & { items: Record<string, unknown>[] }).items.forEach((item: Record<string, unknown>) => {
              const itemDataSet = item.dataSet as Record<string, unknown> & { elements: Record<string, unknown> };
              const planePositionSequence = itemDataSet.elements.x00209113;
              const planeOrientationSequence = itemDataSet.elements.x00209116;
              
              if (planePositionSequence && (planePositionSequence as Record<string, unknown> & { items?: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] }).items?.[0]) {
                const positionString = (planePositionSequence as Record<string, unknown> & { items: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] }).items[0].dataSet.string('x00200032');
                if (positionString) {
                  imagePositions.push(positionString.split('\\').map(Number));
                }
              }
              
              if (planeOrientationSequence && (planeOrientationSequence as Record<string, unknown> & { items?: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] }).items?.[0]) {
                const orientationString = (planeOrientationSequence as Record<string, unknown> & { items: { dataSet: Record<string, unknown> & { string(tag: string): string } }[] }).items[0].dataSet.string('x00200037');
                if (orientationString) {
                  imageOrientations.push(orientationString.split('\\').map(Number));
                }
              }
            });
          } else {
            // Single frame or legacy format
            const positionString = dataSet.string('x00200032');
            const orientationString = dataSet.string('x00200037');
            
            if (positionString) {
              imagePositions.push(positionString.split('\\').map(Number));
            }
            if (orientationString) {
              imageOrientations.push(orientationString.split('\\').map(Number));
            }
          }

          const segmentationData: SegmentationData = {
            segments,
            pixelData,
            rows,
            columns,
            numberOfFrames,
            imagePositions,
            imageOrientations,
            pixelSpacing,
            sliceThickness,
            frameOfReferenceUID,
            seriesInstanceUID,
            sopInstanceUID
          };

          resolve(segmentationData);
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
      const segData = await parseDICOMSEG(file);
      setSegmentationData(segData);
      onSegmentationLoaded?.(segData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse segmentation');
    } finally {
      setLoading(false);
    }
  }, [parseDICOMSEG, onSegmentationLoaded]);

  // Handle segment visibility toggle
  const handleVisibilityToggle = useCallback((segmentNumber: number) => {
    if (!segmentationData) return;

    const updatedSegments = segmentationData.segments.map(segment => 
      segment.segmentNumber === segmentNumber 
        ? { ...segment, visible: !segment.visible }
        : segment
    );

    setSegmentationData({ ...segmentationData, segments: updatedSegments });
    
    const segment = updatedSegments.find(s => s.segmentNumber === segmentNumber);
    if (segment) {
      onSegmentVisibilityChange?.(segmentNumber, segment.visible);
    }
  }, [segmentationData, onSegmentVisibilityChange]);

  // Handle segment opacity change
  const handleOpacityChange = useCallback((segmentNumber: number, opacity: number) => {
    if (!segmentationData) return;

    const updatedSegments = segmentationData.segments.map(segment => 
      segment.segmentNumber === segmentNumber 
        ? { ...segment, opacity: opacity / 100 }
        : segment
    );

    setSegmentationData({ ...segmentationData, segments: updatedSegments });
    onSegmentOpacityChange?.(segmentNumber, opacity / 100);
  }, [segmentationData, onSegmentOpacityChange]);


  return (
    <div className={`space-y-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* File Upload */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>DICOM Segmentation Loader</span>
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
              <div className="text-blue-500">Parsing DICOM segmentation...</div>
            )}
            {error && (
              <div className="text-red-500">Error: {error}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Segmentation Controls */}
      {segmentationData && (
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>Segmentation Controls</span>
              <Badge variant="secondary">
                {segmentationData.segments.length} segments
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Segmentation Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Dimensions: {segmentationData.columns} × {segmentationData.rows}</div>
                <div>Frames: {segmentationData.numberOfFrames}</div>
                <div>Pixel Spacing: {segmentationData.pixelSpacing.join(' × ')} mm</div>
                <div>Series UID: {segmentationData.seriesInstanceUID.slice(-8)}...</div>
              </div>

              {/* Segment List */}
              <div className="space-y-3">
                {segmentationData.segments.map((segment) => (
                  <div 
                    key={segment.segmentNumber}
                    className={`p-3 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: `rgb(${segment.color.join(',')})` }}
                        />
                        <div>
                          <div className="font-medium">{segment.segmentLabel}</div>
                          {segment.segmentDescription && (
                            <div className="text-xs text-gray-500">{segment.segmentDescription}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVisibilityToggle(segment.segmentNumber)}
                        >
                          {segment.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    {segment.visible && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs">Opacity:</span>
                          <Slider
                            value={[segment.opacity * 100]}
                            onValueChange={([value]) => handleOpacityChange(segment.segmentNumber, value)}
                            max={100}
                            step={5}
                            className="flex-1"
                          />
                          <span className="text-xs w-8">{Math.round(segment.opacity * 100)}%</span>
                        </div>
                        
                        {(segment.anatomicRegion || segment.segmentedPropertyType) && (
                          <div className="text-xs text-gray-500">
                            {segment.anatomicRegion && <div>Region: {segment.anatomicRegion}</div>}
                            {segment.segmentedPropertyType && <div>Type: {segment.segmentedPropertyType}</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export utility functions for external use
export { type SegmentationData, type SegmentInfo };
export const DICOMSegmentationUtils = {
  generateSegmentOverlay: (segmentationData: SegmentationData, segmentNumber: number, frameIndex: number = 0) => {
    if (!segmentationData) return null;

    const { pixelData, rows, columns } = segmentationData;
    const segment = segmentationData.segments.find(s => s.segmentNumber === segmentNumber);
    if (!segment || !segment.visible) return null;

    const frameSize = rows * columns;
    const frameOffset = frameIndex * frameSize;
    
    const overlayData = new Uint8ClampedArray(frameSize * 4);
    const [r, g, b] = segment.color;
    const alpha = Math.round(segment.opacity * 255);

    for (let i = 0; i < frameSize; i++) {
      const pixelValue = pixelData[frameOffset + i];
      if (pixelValue === segmentNumber) {
        const overlayIndex = i * 4;
        overlayData[overlayIndex] = r;
        overlayData[overlayIndex + 1] = g;
        overlayData[overlayIndex + 2] = b;
        overlayData[overlayIndex + 3] = alpha;
      }
    }

    return {
      data: overlayData,
      width: columns,
      height: rows
    };
  }
};
