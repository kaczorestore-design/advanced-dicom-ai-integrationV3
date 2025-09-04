import React, { useState, useEffect, useCallback } from 'react';
import * as dicomParser from 'dicom-parser';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Monitor, Upload, Eye, Settings, Palette, Layers, Image, RotateCw, ZoomIn, Contrast } from 'lucide-react';

interface PresentationState {
  sopInstanceUID: string;
  sopClassUID: string;
  studyInstanceUID: string;
  seriesInstanceUID: string;
  instanceNumber: number;
  contentDate?: string;
  contentTime?: string;
  contentLabel?: string;
  contentDescription?: string;
  contentCreatorName?: string;
  referencedImageSequence: ReferencedImage[];
  displayedAreaSelectionSequence?: DisplayedAreaSelection[];
  graphicAnnotationSequence?: GraphicAnnotation[];
  textObjectSequence?: TextObject[];
  graphicLayerSequence?: GraphicLayer[];
  modalityLUTSequence?: ModalityLUT[];
  voiLUTSequence?: VOILUT[];
  presentationLUTSequence?: PresentationLUT[];
  overlayPlaneSequence?: OverlayPlane[];
  displayShutterSequence?: DisplayShutter[];
  bitmapDisplayShutterSequence?: BitmapDisplayShutter[];
  shutterPresentationValue?: number;
  shutterOverlayGroup?: number;
  presentationSizeMode?: string;
  presentationPixelSpacing?: number[];
  presentationPixelAspectRatio?: number[];
  presentationPixelMagnificationRatio?: number;
  imageRotation?: number;
  imageHorizontalFlip?: string;
  imageVerticalFlip?: string;
  requestingPhysician?: string;
  institutionName?: string;
  institutionalDepartmentName?: string;
  manufacturer?: string;
  manufacturerModelName?: string;
  deviceSerialNumber?: string;
  softwareVersions?: string;
}

interface ReferencedImage {
  referencedSOPClassUID: string;
  referencedSOPInstanceUID: string;
  referencedFrameNumber?: number[];
  referencedSegmentNumber?: number[];
}

interface DisplayedAreaSelection {
  referencedImageSequence: ReferencedImage[];
  displayedAreaTopLeftHandCorner: number[];
  displayedAreaBottomRightHandCorner: number[];
  presentationSizeMode: string;
  presentationPixelSpacing?: number[];
  presentationPixelAspectRatio?: number[];
  presentationPixelMagnificationRatio?: number;
}

interface GraphicAnnotation {
  graphicLayer?: string;
  textObjectSequence?: TextObject[];
  graphicObjectSequence?: GraphicObject[];
  referencedImageSequence?: ReferencedImage[];
}

interface GraphicObject {
  graphicAnnotationUnits: string;
  graphicDimensions: number;
  numberOfGraphicPoints: number;
  graphicData: number[];
  graphicType: string;
  graphicFilled?: string;
  lineStyleSequence?: LineStyle[];
  fillStyleSequence?: FillStyle[];
}

interface TextObject {
  boundingBoxAnnotationUnits?: string;
  anchorPointAnnotationUnits?: string;
  unformattedTextValue: string;
  boundingBoxTopLeftHandCorner?: number[];
  boundingBoxBottomRightHandCorner?: number[];
  anchorPoint?: number[];
  anchorPointVisibility?: string;
  textStyleSequence?: TextStyle[];
}

interface GraphicLayer {
  graphicLayer: string;
  graphicLayerOrder: number;
  graphicLayerRecommendedDisplayGrayscaleValue?: number;
  graphicLayerRecommendedDisplayRGBValue?: number[];
  graphicLayerDescription?: string;
}

interface ModalityLUT {
  lutDescriptor: number[];
  lutExplanation?: string;
  modalityLUTType: string;
  lutData: number[];
}

interface VOILUT {
  lutDescriptor: number[];
  lutExplanation?: string;
  lutData: number[];
}

interface PresentationLUT {
  lutDescriptor: number[];
  lutExplanation?: string;
  presentationLUTShape?: string;
  lutData?: number[];
}

interface OverlayPlane {
  overlayRows: number;
  overlayColumns: number;
  overlayType: string;
  overlayOrigin: number[];
  overlayBitsAllocated: number;
  overlayBitPosition: number;
  overlayData: Uint8Array;
  overlayDescription?: string;
  overlaySubtype?: string;
  overlayLabel?: string;
  roiArea?: number;
  roiMean?: number;
  roiStandardDeviation?: number;
}

interface DisplayShutter {
  shutterShape: string;
  shutterLeftVerticalEdge?: number;
  shutterRightVerticalEdge?: number;
  shutterUpperHorizontalEdge?: number;
  shutterLowerHorizontalEdge?: number;
  centerOfCircularShutter?: number[];
  radiusOfCircularShutter?: number;
  verticesOfThePolygonalShutter?: number[];
}

interface BitmapDisplayShutter {
  shutterOverlayGroup: number;
  shutterPresentationValue: number;
}

interface LineStyle {
  patternOnColorCIELabValue?: number[];
  patternOffColorCIELabValue?: number[];
  lineThickness?: number;
  lineDashingStyle?: string;
  linePattern?: number;
}

interface FillStyle {
  patternOnColorCIELabValue?: number[];
  patternOffColorCIELabValue?: number[];
  fillPattern?: string;
  fillMode?: string;
}

interface TextStyle {
  fontName?: string;
  fontNameType?: string;
  cssFont?: string;
  textColorCIELabValue?: number[];
  horizontalAlignment?: string;
  verticalAlignment?: string;
  shadowStyle?: string;
  underlined?: string;
  bold?: string;
  italic?: string;
}

interface DICOMPRParserProps {
  onPresentationStateLoaded?: (presentationState: PresentationState) => void;
  onApplyPresentationState?: (presentationState: PresentationState) => void;
  onImageSelected?: (imageRef: ReferencedImage) => void;
  theme?: 'light' | 'dark';
}

export default function DICOMPRParser({
  onPresentationStateLoaded,
  onApplyPresentationState,
  onImageSelected,
  theme = 'dark'
}: DICOMPRParserProps) {
  const [presentationState, setPresentationState] = useState<PresentationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string>('');
  const [layerVisibility, setLayerVisibility] = useState<Map<string, boolean>>(new Map());
  const [layerOpacity, setLayerOpacity] = useState<Map<string, number>>(new Map());
  const [windowCenter, setWindowCenter] = useState<number>(0);
  const [windowWidth, setWindowWidth] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(50);
  const [contrast, setContrast] = useState<number>(50);
  const [rotation, setRotation] = useState<number>(0);
  const [horizontalFlip, setHorizontalFlip] = useState<boolean>(false);
  const [verticalFlip, setVerticalFlip] = useState<boolean>(false);
  const [magnification, setMagnification] = useState<number>(100);

  // Parse DICOM Presentation State file
  const parseDICOMPR = useCallback(async (file: File): Promise<PresentationState> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const byteArray = new Uint8Array(arrayBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);

          // Validate this is a DICOM Presentation State object
          const sopClassUID = dataSet.string('x00080016');
          const validPRClasses = [
            '1.2.840.10008.5.1.4.1.1.11.1', // Grayscale Softcopy Presentation State
            '1.2.840.10008.5.1.4.1.1.11.2', // Color Softcopy Presentation State
            '1.2.840.10008.5.1.4.1.1.11.3', // Pseudo-Color Softcopy Presentation State
            '1.2.840.10008.5.1.4.1.1.11.4'  // Blending Softcopy Presentation State
          ];
          
          if (!validPRClasses.includes(sopClassUID || '')) {
            throw new Error('Not a valid DICOM Presentation State object');
          }

          // Extract basic PR information
          const sopInstanceUID = dataSet.string('x00080018') || '';
          const studyInstanceUID = dataSet.string('x0020000d') || '';
          const seriesInstanceUID = dataSet.string('x0020000e') || '';
          const instanceNumber = dataSet.uint16('x00200013') || 0;
          const contentDate = dataSet.string('x00080023');
          const contentTime = dataSet.string('x00080033');
          const contentLabel = dataSet.string('x00700080');
          const contentDescription = dataSet.string('x00700081');
          const contentCreatorName = dataSet.string('x00700084');

          // Extract referenced image sequence
          const referencedImageSequence = extractReferencedImageSequence(dataSet);

          // Extract displayed area selection sequence
          const displayedAreaSelectionSequence = extractDisplayedAreaSelectionSequence(dataSet);

          // Extract graphic annotation sequence
          const graphicAnnotationSequence = extractGraphicAnnotationSequence(dataSet);

          // Extract text object sequence
          const textObjectSequence = extractTextObjectSequence(dataSet);

          // Extract graphic layer sequence
          const graphicLayerSequence = extractGraphicLayerSequence(dataSet);

          // Extract LUT sequences
          const modalityLUTSequence = extractModalityLUTSequence(dataSet);
          const voiLUTSequence = extractVOILUTSequence(dataSet);
          const presentationLUTSequence = extractPresentationLUTSequence(dataSet);

          // Extract overlay plane sequence
          const overlayPlaneSequence = extractOverlayPlaneSequence(dataSet);

          // Extract display shutter sequence
          const displayShutterSequence = extractDisplayShutterSequence(dataSet);
          const bitmapDisplayShutterSequence = extractBitmapDisplayShutterSequence(dataSet);

          // Extract shutter information
          const shutterPresentationValue = dataSet.uint16('x00181612');
          const shutterOverlayGroup = dataSet.uint16('x00181614');

          // Extract presentation parameters
          const presentationSizeMode = dataSet.string('x00700100');
          const presentationPixelSpacing = extractFloatArray(dataSet, 'x00700101');
          const presentationPixelAspectRatio = extractFloatArray(dataSet, 'x00700102');
          const presentationPixelMagnificationRatio = dataSet.floatString('x00700103');

          // Extract transformation parameters
          const imageRotation = dataSet.uint16('x00700042');
          const imageHorizontalFlip = dataSet.string('x00700041');
          const imageVerticalFlip = dataSet.string('x00700043');

          // Extract institutional and personnel information
          const requestingPhysician = dataSet.string('x00321032');
          const institutionName = dataSet.string('x00080080');
          const institutionalDepartmentName = dataSet.string('x00081040');
          const manufacturer = dataSet.string('x00080070');
          const manufacturerModelName = dataSet.string('x00081090');
          const deviceSerialNumber = dataSet.string('x00181000');
          const softwareVersions = dataSet.string('x00181020');

          const presentationState: PresentationState = {
            sopInstanceUID,
            sopClassUID,
            studyInstanceUID,
            seriesInstanceUID,
            instanceNumber,
            contentDate,
            contentTime,
            contentLabel,
            contentDescription,
            contentCreatorName,
            referencedImageSequence,
            displayedAreaSelectionSequence,
            graphicAnnotationSequence,
            textObjectSequence,
            graphicLayerSequence,
            modalityLUTSequence,
            voiLUTSequence,
            presentationLUTSequence,
            overlayPlaneSequence,
            displayShutterSequence,
            bitmapDisplayShutterSequence,
            shutterPresentationValue,
            shutterOverlayGroup,
            presentationSizeMode,
            presentationPixelSpacing,
            presentationPixelAspectRatio,
            presentationPixelMagnificationRatio,
            imageRotation,
            imageHorizontalFlip,
            imageVerticalFlip,
            requestingPhysician,
            institutionName,
            institutionalDepartmentName,
            manufacturer,
            manufacturerModelName,
            deviceSerialNumber,
            softwareVersions
          };

          resolve(presentationState);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Extract referenced image sequence
  const extractReferencedImageSequence = (dataSet: any): ReferencedImage[] => {
    const sequence = dataSet.elements.x00081140;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
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

      return {
        referencedSOPClassUID,
        referencedSOPInstanceUID,
        referencedFrameNumber,
        referencedSegmentNumber
      };
    });
  };

  // Extract displayed area selection sequence
  const extractDisplayedAreaSelectionSequence = (dataSet: any): DisplayedAreaSelection[] => {
    const sequence = dataSet.elements.x00700130;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const referencedImageSequence = extractReferencedImageSequence(itemDataSet);
      const displayedAreaTopLeftHandCorner = extractIntArray(itemDataSet, 'x00700052') || [];
      const displayedAreaBottomRightHandCorner = extractIntArray(itemDataSet, 'x00700053') || [];
      const presentationSizeMode = itemDataSet.string('x00700100') || '';
      const presentationPixelSpacing = extractFloatArray(itemDataSet, 'x00700101');
      const presentationPixelAspectRatio = extractFloatArray(itemDataSet, 'x00700102');
      const presentationPixelMagnificationRatio = itemDataSet.floatString('x00700103');

      return {
        referencedImageSequence,
        displayedAreaTopLeftHandCorner,
        displayedAreaBottomRightHandCorner,
        presentationSizeMode,
        presentationPixelSpacing,
        presentationPixelAspectRatio,
        presentationPixelMagnificationRatio
      };
    });
  };

  // Extract graphic annotation sequence
  const extractGraphicAnnotationSequence = (dataSet: any): GraphicAnnotation[] => {
    const sequence = dataSet.elements.x00700001;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const graphicLayer = itemDataSet.string('x00700002');
      const textObjectSequence = extractTextObjectSequence(itemDataSet);
      const graphicObjectSequence = extractGraphicObjectSequence(itemDataSet);
      const referencedImageSequence = extractReferencedImageSequence(itemDataSet);

      return {
        graphicLayer,
        textObjectSequence,
        graphicObjectSequence,
        referencedImageSequence
      };
    });
  };

  // Extract graphic object sequence
  const extractGraphicObjectSequence = (dataSet: any): GraphicObject[] => {
    const sequence = dataSet.elements.x00700009;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const graphicAnnotationUnits = itemDataSet.string('x00700005') || '';
      const graphicDimensions = itemDataSet.uint16('x00700020') || 2;
      const numberOfGraphicPoints = itemDataSet.uint16('x00700021') || 0;
      const graphicData = extractFloatArray(itemDataSet, 'x00700022') || [];
      const graphicType = itemDataSet.string('x00700023') || '';
      const graphicFilled = itemDataSet.string('x00700024');

      return {
        graphicAnnotationUnits,
        graphicDimensions,
        numberOfGraphicPoints,
        graphicData,
        graphicType,
        graphicFilled
      };
    });
  };

  // Extract text object sequence
  const extractTextObjectSequence = (dataSet: any): TextObject[] => {
    const sequence = dataSet.elements.x00700008;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const boundingBoxAnnotationUnits = itemDataSet.string('x00700003');
      const anchorPointAnnotationUnits = itemDataSet.string('x00700004');
      const unformattedTextValue = itemDataSet.string('x00700006') || '';
      const boundingBoxTopLeftHandCorner = extractFloatArray(itemDataSet, 'x00700010');
      const boundingBoxBottomRightHandCorner = extractFloatArray(itemDataSet, 'x00700011');
      const anchorPoint = extractFloatArray(itemDataSet, 'x00700014');
      const anchorPointVisibility = itemDataSet.string('x00700015');

      return {
        boundingBoxAnnotationUnits,
        anchorPointAnnotationUnits,
        unformattedTextValue,
        boundingBoxTopLeftHandCorner,
        boundingBoxBottomRightHandCorner,
        anchorPoint,
        anchorPointVisibility
      };
    });
  };

  // Extract graphic layer sequence
  const extractGraphicLayerSequence = (dataSet: any): GraphicLayer[] => {
    const sequence = dataSet.elements.x00700060;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const graphicLayer = itemDataSet.string('x00700002') || '';
      const graphicLayerOrder = itemDataSet.uint16('x00700062') || 0;
      const graphicLayerRecommendedDisplayGrayscaleValue = itemDataSet.uint16('x00700066');
      const graphicLayerRecommendedDisplayRGBValue = extractIntArray(itemDataSet, 'x00700067');
      const graphicLayerDescription = itemDataSet.string('x00700068');

      return {
        graphicLayer,
        graphicLayerOrder,
        graphicLayerRecommendedDisplayGrayscaleValue,
        graphicLayerRecommendedDisplayRGBValue,
        graphicLayerDescription
      };
    });
  };

  // Extract modality LUT sequence
  const extractModalityLUTSequence = (dataSet: any): ModalityLUT[] => {
    const sequence = dataSet.elements.x00283000;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const lutDescriptor = extractIntArray(itemDataSet, 'x00283002') || [];
      const lutExplanation = itemDataSet.string('x00283003');
      const modalityLUTType = itemDataSet.string('x00283004') || '';
      const lutData = extractIntArray(itemDataSet, 'x00283006') || [];

      return {
        lutDescriptor,
        lutExplanation,
        modalityLUTType,
        lutData
      };
    });
  };

  // Extract VOI LUT sequence
  const extractVOILUTSequence = (dataSet: any): VOILUT[] => {
    const sequence = dataSet.elements.x00283010;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const lutDescriptor = extractIntArray(itemDataSet, 'x00283002') || [];
      const lutExplanation = itemDataSet.string('x00283003');
      const lutData = extractIntArray(itemDataSet, 'x00283006') || [];

      return {
        lutDescriptor,
        lutExplanation,
        lutData
      };
    });
  };

  // Extract presentation LUT sequence
  const extractPresentationLUTSequence = (dataSet: any): PresentationLUT[] => {
    const sequence = dataSet.elements.x20500010;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const lutDescriptor = extractIntArray(itemDataSet, 'x00283002') || [];
      const lutExplanation = itemDataSet.string('x00283003');
      const presentationLUTShape = itemDataSet.string('x20500020');
      const lutData = extractIntArray(itemDataSet, 'x00283006');

      return {
        lutDescriptor,
        lutExplanation,
        presentationLUTShape,
        lutData
      };
    });
  };

  // Extract overlay plane sequence
  const extractOverlayPlaneSequence = (dataSet: any): OverlayPlane[] => {
    const overlays: OverlayPlane[] = [];
    
    // Check for overlay groups (6000-60FF)
    for (let group = 0x6000; group <= 0x60FF; group += 2) {
      const groupHex = group.toString(16).toUpperCase();
      const overlayRowsTag = `x${groupHex}0010`;
      const overlayColumnsTag = `x${groupHex}0011`;
      const overlayTypeTag = `x${groupHex}0040`;
      const overlayOriginTag = `x${groupHex}0050`;
      const overlayBitsAllocatedTag = `x${groupHex}0100`;
      const overlayBitPositionTag = `x${groupHex}0102`;
      const overlayDataTag = `x${groupHex}3000`;
      
      if (dataSet.elements[overlayRowsTag]) {
        const overlayRows = dataSet.uint16(overlayRowsTag) || 0;
        const overlayColumns = dataSet.uint16(overlayColumnsTag) || 0;
        const overlayType = dataSet.string(overlayTypeTag) || '';
        const overlayOrigin = extractIntArray(dataSet, overlayOriginTag) || [];
        const overlayBitsAllocated = dataSet.uint16(overlayBitsAllocatedTag) || 1;
        const overlayBitPosition = dataSet.uint16(overlayBitPositionTag) || 0;
        const overlayData = dataSet.elements[overlayDataTag]?.dataOffset 
          ? new Uint8Array(dataSet.byteArray.buffer, dataSet.elements[overlayDataTag].dataOffset, dataSet.elements[overlayDataTag].length)
          : new Uint8Array();
        
        const overlayDescription = dataSet.string(`x${groupHex}0022`);
        const overlaySubtype = dataSet.string(`x${groupHex}0045`);
        const overlayLabel = dataSet.string(`x${groupHex}1500`);
        const roiArea = dataSet.uint32(`x${groupHex}1301`);
        const roiMean = dataSet.floatString(`x${groupHex}1302`);
        const roiStandardDeviation = dataSet.floatString(`x${groupHex}1303`);

        overlays.push({
          overlayRows,
          overlayColumns,
          overlayType,
          overlayOrigin,
          overlayBitsAllocated,
          overlayBitPosition,
          overlayData,
          overlayDescription,
          overlaySubtype,
          overlayLabel,
          roiArea,
          roiMean,
          roiStandardDeviation
        });
      }
    }
    
    return overlays;
  };

  // Extract display shutter sequence
  const extractDisplayShutterSequence = (dataSet: any): DisplayShutter[] => {
    const shutters: DisplayShutter[] = [];
    
    const shutterShape = dataSet.string('x00181600');
    if (shutterShape) {
      const shutter: DisplayShutter = {
        shutterShape
      };
      
      if (shutterShape === 'RECTANGULAR') {
        shutter.shutterLeftVerticalEdge = dataSet.uint16('x00181602');
        shutter.shutterRightVerticalEdge = dataSet.uint16('x00181604');
        shutter.shutterUpperHorizontalEdge = dataSet.uint16('x00181606');
        shutter.shutterLowerHorizontalEdge = dataSet.uint16('x00181608');
      } else if (shutterShape === 'CIRCULAR') {
        shutter.centerOfCircularShutter = extractIntArray(dataSet, 'x0018160a');
        shutter.radiusOfCircularShutter = dataSet.uint16('x0018160c');
      } else if (shutterShape === 'POLYGONAL') {
        shutter.verticesOfThePolygonalShutter = extractIntArray(dataSet, 'x0018160e');
      }
      
      shutters.push(shutter);
    }
    
    return shutters;
  };

  // Extract bitmap display shutter sequence
  const extractBitmapDisplayShutterSequence = (dataSet: any): BitmapDisplayShutter[] => {
    const sequence = dataSet.elements.x00181616;
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: any) => {
      const itemDataSet = item.dataSet;
      const shutterOverlayGroup = itemDataSet.uint16('x00181614') || 0;
      const shutterPresentationValue = itemDataSet.uint16('x00181612') || 0;

      return {
        shutterOverlayGroup,
        shutterPresentationValue
      };
    });
  };

  // Utility functions
  const extractIntArray = (dataSet: any, tag: string): number[] | undefined => {
    const element = dataSet.elements[tag];
    if (!element) return undefined;
    
    const values: number[] = [];
    for (let i = 0; i < element.length; i += 2) {
      values.push(dataSet.uint16(tag, i / 2));
    }
    return values;
  };

  const extractFloatArray = (dataSet: any, tag: string): number[] | undefined => {
    const stringValue = dataSet.string(tag);
    if (!stringValue) return undefined;
    
    return stringValue.split('\\').map(Number);
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setLoading(true);
    setError(null);

    try {
      const pr = await parseDICOMPR(file);
      setPresentationState(pr);
      
      // Initialize layer visibility and opacity
      if (pr.graphicLayerSequence) {
        const visibility = new Map<string, boolean>();
        const opacity = new Map<string, number>();
        
        pr.graphicLayerSequence.forEach(layer => {
          visibility.set(layer.graphicLayer, true);
          opacity.set(layer.graphicLayer, 100);
        });
        
        setLayerVisibility(visibility);
        setLayerOpacity(opacity);
        
        if (pr.graphicLayerSequence.length > 0) {
          setSelectedLayer(pr.graphicLayerSequence[0].graphicLayer);
        }
      }
      
      // Initialize transformation parameters
      if (pr.imageRotation !== undefined) {
        setRotation(pr.imageRotation);
      }
      if (pr.imageHorizontalFlip === 'Y') {
        setHorizontalFlip(true);
      }
      if (pr.imageVerticalFlip === 'Y') {
        setVerticalFlip(true);
      }
      if (pr.presentationPixelMagnificationRatio !== undefined) {
        setMagnification(pr.presentationPixelMagnificationRatio * 100);
      }
      
      onPresentationStateLoaded?.(pr);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Presentation State');
    } finally {
      setLoading(false);
    }
  }, [parseDICOMPR, onPresentationStateLoaded]);

  // Apply presentation state
  const handleApplyPresentationState = useCallback(() => {
    if (presentationState) {
      onApplyPresentationState?.(presentationState);
    }
  }, [presentationState, onApplyPresentationState]);

  // Toggle layer visibility
  const toggleLayerVisibility = useCallback((layerName: string) => {
    const newVisibility = new Map(layerVisibility);
    newVisibility.set(layerName, !newVisibility.get(layerName));
    setLayerVisibility(newVisibility);
  }, [layerVisibility]);

  // Update layer opacity
  const updateLayerOpacity = useCallback((layerName: string, opacity: number) => {
    const newOpacity = new Map(layerOpacity);
    newOpacity.set(layerName, opacity);
    setLayerOpacity(newOpacity);
  }, [layerOpacity]);

  // Get statistics
  const getStatistics = useCallback(() => {
    if (!presentationState) return { images: 0, annotations: 0, layers: 0, overlays: 0 };

    const images = presentationState.referencedImageSequence.length;
    const annotations = (presentationState.graphicAnnotationSequence?.length || 0) + 
                       (presentationState.textObjectSequence?.length || 0);
    const layers = presentationState.graphicLayerSequence?.length || 0;
    const overlays = presentationState.overlayPlaneSequence?.length || 0;

    return { images, annotations, layers, overlays };
  }, [presentationState]);

  const statistics = getStatistics();

  return (
    <div className={`space-y-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* File Upload */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>DICOM Presentation State Loader</span>
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
              <div className="text-blue-500">Parsing DICOM Presentation State...</div>
            )}
            {error && (
              <div className="text-red-500">Error: {error}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Presentation State Viewer */}
      {presentationState && (
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="w-5 h-5" />
              <span>Presentation State: {presentationState.contentLabel || 'Untitled'}</span>
              <div className="flex space-x-2">
                <Badge variant="secondary">{statistics.images} images</Badge>
                <Badge variant="secondary">{statistics.annotations} annotations</Badge>
                <Badge variant="secondary">{statistics.layers} layers</Badge>
                <Badge variant="secondary">{statistics.overlays} overlays</Badge>
              </div>
              <Button onClick={handleApplyPresentationState} className="ml-auto">
                <Eye className="w-4 h-4 mr-2" />
                Apply
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="display" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="display">Display</TabsTrigger>
                <TabsTrigger value="layers">Layers</TabsTrigger>
                <TabsTrigger value="annotations">Annotations</TabsTrigger>
                <TabsTrigger value="overlays">Overlays</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>
              
              <TabsContent value="display" className="space-y-4">
                {/* Display Controls */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Window/Level Controls */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Contrast className="w-4 h-4" />
                      <span>Window/Level</span>
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm">Window Center: {windowCenter}</label>
                        <Slider
                          value={[windowCenter]}
                          onValueChange={(value) => setWindowCenter(value[0])}
                          min={-1000}
                          max={1000}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm">Window Width: {windowWidth}</label>
                        <Slider
                          value={[windowWidth]}
                          onValueChange={(value) => setWindowWidth(value[0])}
                          min={1}
                          max={2000}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm">Brightness: {brightness}%</label>
                        <Slider
                          value={[brightness]}
                          onValueChange={(value) => setBrightness(value[0])}
                          min={0}
                          max={100}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm">Contrast: {contrast}%</label>
                        <Slider
                          value={[contrast]}
                          onValueChange={(value) => setContrast(value[0])}
                          min={0}
                          max={100}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Transformation Controls */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center space-x-2">
                      <RotateCw className="w-4 h-4" />
                      <span>Transformations</span>
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm">Rotation: {rotation}°</label>
                        <Slider
                          value={[rotation]}
                          onValueChange={(value) => setRotation(value[0])}
                          min={0}
                          max={360}
                          step={90}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm">Magnification: {magnification}%</label>
                        <Slider
                          value={[magnification]}
                          onValueChange={(value) => setMagnification(value[0])}
                          min={10}
                          max={500}
                          step={10}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={horizontalFlip}
                            onCheckedChange={setHorizontalFlip}
                          />
                          <label className="text-sm">Horizontal Flip</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={verticalFlip}
                            onCheckedChange={setVerticalFlip}
                          />
                          <label className="text-sm">Vertical Flip</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="layers" className="space-y-4">
                {presentationState.graphicLayerSequence && presentationState.graphicLayerSequence.length > 0 ? (
                  <div>
                    <h4 className="font-medium mb-4 flex items-center space-x-2">
                      <Layers className="w-4 h-4" />
                      <span>Graphic Layers ({presentationState.graphicLayerSequence.length})</span>
                    </h4>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {presentationState.graphicLayerSequence
                          .sort((a, b) => a.graphicLayerOrder - b.graphicLayerOrder)
                          .map((layer, index) => {
                            const isVisible = layerVisibility.get(layer.graphicLayer) ?? true;
                            const opacity = layerOpacity.get(layer.graphicLayer) ?? 100;
                            
                            return (
                              <div 
                                key={index} 
                                className={`p-3 border rounded-lg ${
                                  selectedLayer === layer.graphicLayer
                                    ? theme === 'dark' 
                                      ? 'bg-blue-900 border-blue-600' 
                                      : 'bg-blue-50 border-blue-300'
                                    : theme === 'dark' 
                                      ? 'bg-gray-700 border-gray-600' 
                                      : 'bg-gray-50 border-gray-200'
                                }`}
                                onClick={() => setSelectedLayer(layer.graphicLayer)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={isVisible}
                                      onCheckedChange={() => toggleLayerVisibility(layer.graphicLayer)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="font-medium">{layer.graphicLayer}</span>
                                    <Badge variant="outline">Order: {layer.graphicLayerOrder}</Badge>
                                  </div>
                                  {layer.graphicLayerRecommendedDisplayRGBValue && (
                                    <div 
                                      className="w-4 h-4 rounded border"
                                      style={{
                                        backgroundColor: `rgb(${layer.graphicLayerRecommendedDisplayRGBValue.join(',')})`
                                      }}
                                    />
                                  )}
                                </div>
                                
                                {layer.graphicLayerDescription && (
                                  <div className="text-sm text-gray-500 mb-2">
                                    {layer.graphicLayerDescription}
                                  </div>
                                )}
                                
                                <div>
                                  <label className="text-sm">Opacity: {opacity}%</label>
                                  <Slider
                                    value={[opacity]}
                                    onValueChange={(value) => updateLayerOpacity(layer.graphicLayer, value[0])}
                                    min={0}
                                    max={100}
                                    step={1}
                                    className="mt-1"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-gray-500">No graphic layers defined.</div>
                )}
              </TabsContent>
              
              <TabsContent value="annotations" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Graphic Annotations */}
                  <div>
                    <h4 className="font-medium mb-2">Graphic Annotations</h4>
                    {presentationState.graphicAnnotationSequence && presentationState.graphicAnnotationSequence.length > 0 ? (
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {presentationState.graphicAnnotationSequence.map((annotation, index) => (
                            <div key={index} className="p-2 border rounded text-sm">
                              <div><strong>Layer:</strong> {annotation.graphicLayer || 'Default'}</div>
                              {annotation.graphicObjectSequence && (
                                <div><strong>Graphics:</strong> {annotation.graphicObjectSequence.length} objects</div>
                              )}
                              {annotation.textObjectSequence && (
                                <div><strong>Text Objects:</strong> {annotation.textObjectSequence.length}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-gray-500">No graphic annotations.</div>
                    )}
                  </div>
                  
                  {/* Text Objects */}
                  <div>
                    <h4 className="font-medium mb-2">Text Objects</h4>
                    {presentationState.textObjectSequence && presentationState.textObjectSequence.length > 0 ? (
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {presentationState.textObjectSequence.map((textObj, index) => (
                            <div key={index} className="p-2 border rounded text-sm">
                              <div className="font-medium">{textObj.unformattedTextValue}</div>
                              {textObj.anchorPoint && (
                                <div className="text-xs text-gray-500">
                                  Anchor: ({textObj.anchorPoint.join(', ')})
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-gray-500">No text objects.</div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="overlays" className="space-y-4">
                {presentationState.overlayPlaneSequence && presentationState.overlayPlaneSequence.length > 0 ? (
                  <div>
                    <h4 className="font-medium mb-4">Overlay Planes ({presentationState.overlayPlaneSequence.length})</h4>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {presentationState.overlayPlaneSequence.map((overlay, index) => (
                          <div key={index} className="p-3 border rounded">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><strong>Type:</strong> {overlay.overlayType}</div>
                              <div><strong>Size:</strong> {overlay.overlayRows} × {overlay.overlayColumns}</div>
                              <div><strong>Origin:</strong> ({overlay.overlayOrigin.join(', ')})</div>
                              <div><strong>Bits:</strong> {overlay.overlayBitsAllocated}</div>
                              {overlay.overlayLabel && (
                                <div><strong>Label:</strong> {overlay.overlayLabel}</div>
                              )}
                              {overlay.overlayDescription && (
                                <div><strong>Description:</strong> {overlay.overlayDescription}</div>
                              )}
                              {overlay.roiArea && (
                                <div><strong>ROI Area:</strong> {overlay.roiArea}</div>
                              )}
                              {overlay.roiMean && (
                                <div><strong>ROI Mean:</strong> {overlay.roiMean.toFixed(2)}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-gray-500">No overlay planes defined.</div>
                )}
              </TabsContent>
              
              <TabsContent value="images" className="space-y-4">
                <h4 className="font-medium mb-4 flex items-center space-x-2">
                  <Image className="w-4 h-4" />
                  <span>Referenced Images ({presentationState.referencedImageSequence.length})</span>
                </h4>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {presentationState.referencedImageSequence.map((image, index) => (
                      <div 
                        key={index} 
                        className={`p-3 border rounded cursor-pointer ${
                          theme === 'dark' 
                            ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => onImageSelected?.(image)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Image {index + 1}</div>
                            <div className="text-xs text-gray-500">
                              SOP Instance: {image.referencedSOPInstanceUID}
                            </div>
                            <div className="text-xs text-gray-500">
                              SOP Class: {image.referencedSOPClassUID}
                            </div>
                            {image.referencedFrameNumber && (
                              <div className="text-xs text-gray-500">
                                Frames: {image.referencedFrameNumber.join(', ')}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>SOP Instance UID:</strong> {presentationState.sopInstanceUID}</div>
                  <div><strong>SOP Class UID:</strong> {presentationState.sopClassUID}</div>
                  <div><strong>Study Instance UID:</strong> {presentationState.studyInstanceUID}</div>
                  <div><strong>Series Instance UID:</strong> {presentationState.seriesInstanceUID}</div>
                  <div><strong>Instance Number:</strong> {presentationState.instanceNumber}</div>
                  {presentationState.contentDate && (
                    <div><strong>Content Date:</strong> {presentationState.contentDate}</div>
                  )}
                  {presentationState.contentTime && (
                    <div><strong>Content Time:</strong> {presentationState.contentTime}</div>
                  )}
                  {presentationState.contentLabel && (
                    <div><strong>Content Label:</strong> {presentationState.contentLabel}</div>
                  )}
                  {presentationState.contentDescription && (
                    <div><strong>Content Description:</strong> {presentationState.contentDescription}</div>
                  )}
                  {presentationState.contentCreatorName && (
                    <div><strong>Content Creator:</strong> {presentationState.contentCreatorName}</div>
                  )}
                  {presentationState.institutionName && (
                    <div><strong>Institution:</strong> {presentationState.institutionName}</div>
                  )}
                  {presentationState.institutionalDepartmentName && (
                    <div><strong>Department:</strong> {presentationState.institutionalDepartmentName}</div>
                  )}
                  {presentationState.requestingPhysician && (
                    <div><strong>Requesting Physician:</strong> {presentationState.requestingPhysician}</div>
                  )}
                  {presentationState.manufacturer && (
                    <div><strong>Manufacturer:</strong> {presentationState.manufacturer}</div>
                  )}
                  {presentationState.manufacturerModelName && (
                    <div><strong>Model:</strong> {presentationState.manufacturerModelName}</div>
                  )}
                  {presentationState.deviceSerialNumber && (
                    <div><strong>Serial Number:</strong> {presentationState.deviceSerialNumber}</div>
                  )}
                  {presentationState.softwareVersions && (
                    <div><strong>Software Version:</strong> {presentationState.softwareVersions}</div>
                  )}
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
export { type PresentationState, type GraphicLayer, type GraphicAnnotation, type TextObject };
export const DICOMPRUtils = {
  applyPresentationState: (presentationState: PresentationState, imageElement: HTMLElement) => {
    // Apply transformations
    if (presentationState.imageRotation !== undefined) {
      imageElement.style.transform = `rotate(${presentationState.imageRotation}deg)`;
    }
    
    // Apply flips
    let scaleX = 1;
    let scaleY = 1;
    if (presentationState.imageHorizontalFlip === 'Y') {
      scaleX = -1;
    }
    if (presentationState.imageVerticalFlip === 'Y') {
      scaleY = -1;
    }
    
    if (scaleX !== 1 || scaleY !== 1) {
      const currentTransform = imageElement.style.transform || '';
      imageElement.style.transform = `${currentTransform} scale(${scaleX}, ${scaleY})`;
    }
  },
  
  getLayersByOrder: (presentationState: PresentationState): GraphicLayer[] => {
    if (!presentationState.graphicLayerSequence) return [];
    return [...presentationState.graphicLayerSequence].sort((a, b) => a.graphicLayerOrder - b.graphicLayerOrder);
  },
  
  getAnnotationsForLayer: (presentationState: PresentationState, layerName: string): GraphicAnnotation[] => {
    if (!presentationState.graphicAnnotationSequence) return [];
    return presentationState.graphicAnnotationSequence.filter(annotation => 
      annotation.graphicLayer === layerName
    );
  },
  
  getTextObjectsForLayer: (presentationState: PresentationState, layerName: string): TextObject[] => {
    const annotations = DICOMPRUtils.getAnnotationsForLayer(presentationState, layerName);
    return annotations.flatMap(annotation => annotation.textObjectSequence || []);
  },
  
  hasDisplayShutter: (presentationState: PresentationState): boolean => {
    return (presentationState.displayShutterSequence && presentationState.displayShutterSequence.length > 0) ||
           (presentationState.bitmapDisplayShutterSequence && presentationState.bitmapDisplayShutterSequence.length > 0);
  },
  
  getStatistics: (presentationState: PresentationState) => {
    const images = presentationState.referencedImageSequence.length;
    const annotations = (presentationState.graphicAnnotationSequence?.length || 0) + 
                       (presentationState.textObjectSequence?.length || 0);
    const layers = presentationState.graphicLayerSequence?.length || 0;
    const overlays = presentationState.overlayPlaneSequence?.length || 0;
    
    return { images, annotations, layers, overlays };
  }
};