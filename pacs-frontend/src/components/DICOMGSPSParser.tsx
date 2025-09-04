import React, { useState, useCallback } from 'react';
import * as dicomParser from 'dicom-parser';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Monitor, Upload, Eye, Settings, Palette, Layers, Image, RotateCw, Contrast } from 'lucide-react';
import { GSPSPresentationState, ReferencedImage, DisplayedAreaSelection, SoftcopyVOILUT, SoftcopyPresentationLUT, GraphicAnnotation, GraphicObject, TextObject, GraphicLayer, SpatialTransformation, OverlayActivation, VOILUT, PresentationLUT, ModalityLUT, DisplayShutter, BitmapDisplayShutter } from '../types/medical';


interface DICOMGSPSParserProps {
  onGSPSLoaded?: (gsps: GSPSPresentationState) => void;
  onApplyGSPS?: (gsps: GSPSPresentationState) => void;
  onImageSelected?: (imageRef: ReferencedImage) => void;
  theme?: 'light' | 'dark';
}

export default function DICOMGSPSParser({
  onGSPSLoaded,
  onApplyGSPS,
  onImageSelected,
  theme = 'dark'
}: DICOMGSPSParserProps) {
  const [gsps, setGSPS] = useState<GSPSPresentationState | null>(null);
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
  const [gamma, setGamma] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [horizontalFlip, setHorizontalFlip] = useState<boolean>(false);
  const [verticalFlip, setVerticalFlip] = useState<boolean>(false);
  const [magnification, setMagnification] = useState<number>(100);
  const [illumination, setIllumination] = useState<number>(0);
  const [reflectedAmbientLight, setReflectedAmbientLight] = useState<number>(0);
  const [selectedVOILUT, setSelectedVOILUT] = useState<string>('');
  const [_selectedPresentationLUT] = useState<string>('');

  // Parse DICOM GSPS file
  const parseDICOMGSPS = useCallback(async (file: File): Promise<GSPSPresentationState> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const byteArray = new Uint8Array(arrayBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);

          // Validate this is a DICOM GSPS object
          const sopClassUID = dataSet.string('x00080016');
          if (sopClassUID !== '1.2.840.10008.5.1.4.1.1.11.1') {
            throw new Error('Not a valid DICOM Grayscale Softcopy Presentation State object');
          }

          // Extract basic GSPS information
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
          const referencedImageSequence = extractReferencedImageSequence(dataSet as unknown as Record<string, unknown>);

          // Extract displayed area selection sequence
          const displayedAreaSelectionSequence = extractDisplayedAreaSelectionSequence(dataSet as unknown as Record<string, unknown>);

          // Extract softcopy VOI LUT sequence
          const softcopyVOILUTSequence = extractSoftcopyVOILUTSequence(dataSet as unknown as Record<string, unknown>);

          // Extract softcopy presentation LUT sequence
          const softcopyPresentationLUTSequence = extractSoftcopyPresentationLUTSequence(dataSet as unknown as Record<string, unknown>);

          // Extract graphic annotation sequence
          const graphicAnnotationSequence = extractGraphicAnnotationSequence(dataSet as unknown as Record<string, unknown>);

          // Extract text object sequence
          const textObjectSequence = extractTextObjectSequence(dataSet as unknown as Record<string, unknown>);

          // Extract graphic layer sequence
          const graphicLayerSequence = extractGraphicLayerSequence(dataSet as unknown as Record<string, unknown>);

          // Extract spatial transformation sequence
          const spatialTransformationSequence = extractSpatialTransformationSequence(dataSet as unknown as Record<string, unknown>);

          // Extract overlay activation sequence
          const overlayActivationSequence = extractOverlayActivationSequence(dataSet as unknown as Record<string, unknown>);

          // Extract modality LUT sequence
          const modalityLUTSequence = extractModalityLUTSequence(dataSet as unknown as Record<string, unknown>);

          // Extract display shutter sequence
          const displayShutterSequence = extractDisplayShutterSequence(dataSet as unknown as Record<string, unknown>);
          const bitmapDisplayShutterSequence = extractBitmapDisplayShutterSequence(dataSet as unknown as Record<string, unknown>);

          // Extract shutter information
          const shutterPresentationValue = dataSet.uint16('x00181612');
          const shutterOverlayGroup = dataSet.uint16('x00181614');

          // Extract presentation parameters
          const presentationSizeMode = dataSet.string('x00700100');
          const presentationPixelSpacing = extractFloatArray(dataSet as unknown as Record<string, unknown>, 'x00700101');
          const presentationPixelAspectRatio = extractFloatArray(dataSet as unknown as Record<string, unknown>, 'x00700102');
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

          // Extract display environment parameters
          const illumination = dataSet.uint16('x20500020');
          const reflectedAmbientLight = dataSet.uint16('x20500030');

          const gspsState: GSPSPresentationState = {
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
            softcopyVOILUTSequence,
            softcopyPresentationLUTSequence,
            graphicAnnotationSequence,
            textObjectSequence,
            graphicLayerSequence,
            spatialTransformationSequence,
            overlayActivationSequence,
            modalityLUTSequence,
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
            softwareVersions,
            illumination,
            reflectedAmbientLight
          };

          resolve(gspsState);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Extract referenced image sequence
  const extractReferencedImageSequence = (dataSet: Record<string, unknown>): ReferencedImage[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00081140;
    if (!sequence || !(sequence as Record<string, unknown>).items) return [];

    return ((sequence as Record<string, unknown>).items as Record<string, unknown>[]).map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { string(tag: string): string };
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
  const extractDisplayedAreaSelectionSequence = (dataSet: Record<string, unknown>): DisplayedAreaSelection[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00700130;
    if (!sequence || !(sequence as Record<string, unknown>).items) return [];

    return ((sequence as Record<string, unknown>).items as Record<string, unknown>[]).map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { string(tag: string): string; floatString(tag: string): number };
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

  // Extract softcopy VOI LUT sequence
  const extractSoftcopyVOILUTSequence = (dataSet: Record<string, unknown>): SoftcopyVOILUT[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00282110;
    if (!sequence || !(sequence as Record<string, unknown>).items) return [];

    return ((sequence as Record<string, unknown>).items as Record<string, unknown>[]).map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { string(tag: string): string };
      const referencedImageSequence = extractReferencedImageSequence(itemDataSet);
      const voiLUTSequence = extractVOILUTSequence(itemDataSet);
      
      // Extract window center and width
      const windowCenterString = itemDataSet.string('x00281050');
      const windowWidthString = itemDataSet.string('x00281051');
      const windowCenter = windowCenterString ? windowCenterString.split('\\').map(Number) : undefined;
      const windowWidth = windowWidthString ? windowWidthString.split('\\').map(Number) : undefined;
      
      const windowCenterWidthExplanation = itemDataSet.string('x00281055');
      const voiLUTFunction = itemDataSet.string('x00281056');

      return {
        referencedImageSequence,
        voiLUTSequence,
        windowCenter,
        windowWidth,
        windowCenterWidthExplanation,
        voiLUTFunction
      };
    });
  };

  // Extract softcopy presentation LUT sequence
  const extractSoftcopyPresentationLUTSequence = (dataSet: Record<string, unknown>): SoftcopyPresentationLUT[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00282120;
    if (!sequence || !(sequence as Record<string, unknown>).items) return [];

    return ((sequence as Record<string, unknown>).items as Record<string, unknown>[]).map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { string(tag: string): string };
      const referencedImageSequence = extractReferencedImageSequence(itemDataSet);
      const presentationLUTSequence = extractPresentationLUTSequence(itemDataSet);
      const presentationLUTShape = itemDataSet.string('x20500020');

      return {
        referencedImageSequence,
        presentationLUTSequence,
        presentationLUTShape
      };
    });
  };

  // Extract graphic annotation sequence
  const extractGraphicAnnotationSequence = (dataSet: Record<string, unknown>): GraphicAnnotation[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00700001;
    if (!sequence || !(sequence as Record<string, unknown>).items) return [];

    return ((sequence as Record<string, unknown>).items as Record<string, unknown>[]).map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { string(tag: string): string };
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
  const extractGraphicObjectSequence = (dataSet: Record<string, unknown>): GraphicObject[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00700009 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { 
        string(tag: string): string; 
        uint16(tag: string): number; 
        floatString(tag: string): string;
      };
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
  const extractTextObjectSequence = (dataSet: Record<string, unknown>): TextObject[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00700008 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { 
        string(tag: string): string; 
        uint16(tag: string): number; 
        floatString(tag: string): string;
      };
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
  const extractGraphicLayerSequence = (dataSet: Record<string, unknown>): GraphicLayer[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00700060 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { 
        string(tag: string): string; 
        uint16(tag: string): number; 
        floatString(tag: string): string;
      };
      const graphicLayer = itemDataSet.string('x00700002') || '';
      const graphicLayerOrder = itemDataSet.uint16('x00700062') || 0;
      const graphicLayerRecommendedDisplayGrayscaleValue = itemDataSet.uint16('x00700066');
      const graphicLayerDescription = itemDataSet.string('x00700068');

      return {
        graphicLayer,
        graphicLayerOrder,
        graphicLayerRecommendedDisplayGrayscaleValue,
        graphicLayerDescription
      };
    });
  };

  // Extract spatial transformation sequence
  const extractSpatialTransformationSequence = (dataSet: Record<string, unknown>): SpatialTransformation[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00700210 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = item.dataSet as Record<string, unknown>;
      const referencedImageSequence = extractReferencedImageSequence(itemDataSet);
      const imageRotation = (itemDataSet as Record<string, unknown> & { uint16(tag: string): number }).uint16('x00700042');
      const imageHorizontalFlip = (itemDataSet as Record<string, unknown> & { string(tag: string): string }).string('x00700041');
      const imageVerticalFlip = (itemDataSet as Record<string, unknown> & { string(tag: string): string }).string('x00700043');

      return {
        referencedImageSequence,
        imageRotation,
        imageHorizontalFlip,
        imageVerticalFlip
      };
    });
  };

  // Extract overlay activation sequence
  const extractOverlayActivationSequence = (dataSet: Record<string, unknown>): OverlayActivation[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00700260 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { 
        string(tag: string): string; 
        uint16(tag: string): number; 
        floatString(tag: string): string;
      };
      const overlayGroup = itemDataSet.uint16('x00700262') || 0;
      const overlayActivationLayer = itemDataSet.string('x00700264');

      return {
        overlayGroup,
        overlayActivationLayer
      };
    });
  };

  // Extract VOI LUT sequence
  const extractVOILUTSequence = (dataSet: Record<string, unknown>): VOILUT[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00283010 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { 
        string(tag: string): string; 
        uint16(tag: string): number; 
        floatString(tag: string): string;
      };
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
  const extractPresentationLUTSequence = (dataSet: Record<string, unknown>): PresentationLUT[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x20500010 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { 
        string(tag: string): string; 
        uint16(tag: string): number; 
        floatString(tag: string): string;
      };
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

  // Extract modality LUT sequence
  const extractModalityLUTSequence = (dataSet: Record<string, unknown>): ModalityLUT[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00283000 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { 
        string(tag: string): string; 
        uint16(tag: string): number; 
        floatString(tag: string): string;
      };
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

  // Extract display shutter sequence
  const extractDisplayShutterSequence = (dataSet: Record<string, unknown>): DisplayShutter[] => {
    const shutters: DisplayShutter[] = [];
    
    const shutterShape = (dataSet as Record<string, unknown> & { string(tag: string): string }).string('x00181600');
    if (shutterShape) {
      const shutter: DisplayShutter = {
        shutterShape
      };
      
      if (shutterShape === 'RECTANGULAR') {
        const dataSetWithMethods = dataSet as Record<string, unknown> & { uint16(tag: string): number };
        shutter.shutterLeftVerticalEdge = dataSetWithMethods.uint16('x00181602');
        shutter.shutterRightVerticalEdge = dataSetWithMethods.uint16('x00181604');
        shutter.shutterUpperHorizontalEdge = dataSetWithMethods.uint16('x00181606');
        shutter.shutterLowerHorizontalEdge = dataSetWithMethods.uint16('x00181608');
      } else if (shutterShape === 'CIRCULAR') {
        shutter.centerOfCircularShutter = extractIntArray(dataSet, 'x0018160a');
        shutter.radiusOfCircularShutter = (dataSet as Record<string, unknown> & { uint16(tag: string): number }).uint16('x0018160c');
      } else if (shutterShape === 'POLYGONAL') {
        shutter.verticesOfThePolygonalShutter = extractIntArray(dataSet, 'x0018160e');
      }
      
      shutters.push(shutter);
    }
    
    return shutters;
  };

  // Extract bitmap display shutter sequence
  const extractBitmapDisplayShutterSequence = (dataSet: Record<string, unknown>): BitmapDisplayShutter[] => {
    const sequence = (dataSet.elements as Record<string, unknown>).x00181616 as Record<string, unknown> & { items?: Record<string, unknown>[] };
    if (!sequence || !sequence.items) return [];

    return sequence.items.map((item: Record<string, unknown>) => {
      const itemDataSet = (item as Record<string, unknown> & { dataSet: Record<string, unknown> }).dataSet as Record<string, unknown> & { 
        string(tag: string): string; 
        uint16(tag: string): number; 
        floatString(tag: string): string;
      };
      const shutterOverlayGroup = itemDataSet.uint16('x00181614') || 0;
      const shutterPresentationValue = itemDataSet.uint16('x00181612') || 0;

      return {
        shutterOverlayGroup,
        shutterPresentationValue
      };
    });
  };

  // Utility functions
  const extractIntArray = (dataSet: Record<string, unknown>, tag: string): number[] | undefined => {
    const element = (dataSet.elements as Record<string, unknown>)[tag] as Record<string, unknown> & { length?: number };
    if (!element) return undefined;
    
    const values: number[] = [];
    const dataSetWithMethods = dataSet as Record<string, unknown> & { uint16(tag: string, index?: number): number };
    for (let i = 0; i < (element.length || 0); i += 2) {
      values.push(dataSetWithMethods.uint16(tag, i / 2));
    }
    return values;
  };

  const extractFloatArray = (dataSet: Record<string, unknown>, tag: string): number[] | undefined => {
    const stringValue = (dataSet as Record<string, unknown> & { string(tag: string): string }).string(tag);
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
      const gspsState = await parseDICOMGSPS(file);
      setGSPS(gspsState);
      
      // Initialize layer visibility and opacity
      if (gspsState.graphicLayerSequence) {
        const visibility = new Map<string, boolean>();
        const opacity = new Map<string, number>();
        
        gspsState.graphicLayerSequence.forEach(layer => {
          visibility.set(layer.graphicLayer, true);
          opacity.set(layer.graphicLayer, 100);
        });
        
        setLayerVisibility(visibility);
        setLayerOpacity(opacity);
        
        if (gspsState.graphicLayerSequence.length > 0) {
          setSelectedLayer(gspsState.graphicLayerSequence[0].graphicLayer);
        }
      }
      
      // Initialize transformation parameters
      if (gspsState.imageRotation !== undefined) {
        setRotation(gspsState.imageRotation);
      }
      if (gspsState.imageHorizontalFlip === 'Y') {
        setHorizontalFlip(true);
      }
      if (gspsState.imageVerticalFlip === 'Y') {
        setVerticalFlip(true);
      }
      if (gspsState.presentationPixelMagnificationRatio !== undefined) {
        setMagnification(gspsState.presentationPixelMagnificationRatio * 100);
      }
      
      // Initialize display environment parameters
      if (gspsState.illumination !== undefined) {
        setIllumination(gspsState.illumination);
      }
      if (gspsState.reflectedAmbientLight !== undefined) {
        setReflectedAmbientLight(gspsState.reflectedAmbientLight);
      }
      
      // Initialize VOI LUT parameters
      if (gspsState.softcopyVOILUTSequence && gspsState.softcopyVOILUTSequence.length > 0) {
        const firstVOI = gspsState.softcopyVOILUTSequence[0];
        if (firstVOI.windowCenter && firstVOI.windowCenter.length > 0) {
          setWindowCenter(firstVOI.windowCenter[0]);
        }
        if (firstVOI.windowWidth && firstVOI.windowWidth.length > 0) {
          setWindowWidth(firstVOI.windowWidth[0]);
        }
      }
      
      onGSPSLoaded?.(gspsState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse GSPS');
    } finally {
      setLoading(false);
    }
  }, [parseDICOMGSPS, onGSPSLoaded]);

  // Apply GSPS
  const handleApplyGSPS = useCallback(() => {
    if (gsps) {
      onApplyGSPS?.(gsps);
    }
  }, [gsps, onApplyGSPS]);

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
    if (!gsps) return { images: 0, annotations: 0, layers: 0, voiLUTs: 0, presentationLUTs: 0 };

    const images = gsps.referencedImageSequence.length;
    const annotations = (gsps.graphicAnnotationSequence?.length || 0) + 
                       (gsps.textObjectSequence?.length || 0);
    const layers = gsps.graphicLayerSequence?.length || 0;
    const voiLUTs = gsps.softcopyVOILUTSequence?.length || 0;
    const presentationLUTs = gsps.softcopyPresentationLUTSequence?.length || 0;

    return { images, annotations, layers, voiLUTs, presentationLUTs };
  }, [gsps]);

  const statistics = getStatistics();

  return (
    <div className={`space-y-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* File Upload */}
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>DICOM GSPS Loader</span>
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
              <div className="text-blue-500">Parsing DICOM GSPS...</div>
            )}
            {error && (
              <div className="text-red-500">Error: {error}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* GSPS Viewer */}
      {gsps && (
        <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="w-5 h-5" />
              <span>GSPS: {gsps.contentLabel || 'Untitled'}</span>
              <div className="flex space-x-2">
                <Badge variant="secondary">{statistics.images} images</Badge>
                <Badge variant="secondary">{statistics.annotations} annotations</Badge>
                <Badge variant="secondary">{statistics.layers} layers</Badge>
                <Badge variant="secondary">{statistics.voiLUTs} VOI LUTs</Badge>
                <Badge variant="secondary">{statistics.presentationLUTs} Presentation LUTs</Badge>
              </div>
              <Button onClick={handleApplyGSPS} className="ml-auto">
                <Eye className="w-4 h-4 mr-2" />
                Apply GSPS
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="display" className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="display">Display</TabsTrigger>
                <TabsTrigger value="windowing">Windowing</TabsTrigger>
                <TabsTrigger value="layers">Layers</TabsTrigger>
                <TabsTrigger value="annotations">Annotations</TabsTrigger>
                <TabsTrigger value="luts">LUTs</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>
              
              <TabsContent value="display" className="space-y-4">
                {/* Display Controls */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Basic Display Controls */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>Basic Display</span>
                    </h4>
                    <div className="space-y-2">
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
                      <div>
                        <label className="text-sm">Gamma: {gamma.toFixed(2)}</label>
                        <Slider
                          value={[gamma]}
                          onValueChange={(value) => setGamma(value[0])}
                          min={0.1}
                          max={3.0}
                          step={0.1}
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
                
                {/* Display Environment */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Palette className="w-4 h-4" />
                    <span>Display Environment</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm">Illumination: {illumination} cd/m²</label>
                      <Slider
                        value={[illumination]}
                        onValueChange={(value) => setIllumination(value[0])}
                        min={0}
                        max={1000}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm">Reflected Ambient Light: {reflectedAmbientLight} cd/m²</label>
                      <Slider
                        value={[reflectedAmbientLight]}
                        onValueChange={(value) => setReflectedAmbientLight(value[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="windowing" className="space-y-4">
                <h4 className="font-medium flex items-center space-x-2">
                  <Contrast className="w-4 h-4" />
                  <span>Window/Level Controls</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                
                {/* VOI LUT Presets */}
                {gsps.softcopyVOILUTSequence && gsps.softcopyVOILUTSequence.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium">VOI LUT Presets</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {gsps.softcopyVOILUTSequence.map((voiLUT, index) => (
                        <Button
                          key={index}
                          variant={selectedVOILUT === `voi-${index}` ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedVOILUT(`voi-${index}`);
                            if (voiLUT.windowCenter && voiLUT.windowCenter.length > 0) {
                              setWindowCenter(voiLUT.windowCenter[0]);
                            }
                            if (voiLUT.windowWidth && voiLUT.windowWidth.length > 0) {
                              setWindowWidth(voiLUT.windowWidth[0]);
                            }
                          }}
                        >
                          {voiLUT.windowCenterWidthExplanation || `Preset ${index + 1}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="layers" className="space-y-4">
                {gsps.graphicLayerSequence && gsps.graphicLayerSequence.length > 0 ? (
                  <div>
                    <h4 className="font-medium mb-4 flex items-center space-x-2">
                      <Layers className="w-4 h-4" />
                      <span>Graphic Layers ({gsps.graphicLayerSequence.length})</span>
                    </h4>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {gsps.graphicLayerSequence
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
                                  {layer.graphicLayerRecommendedDisplayGrayscaleValue && (
                                    <div 
                                      className="w-4 h-4 rounded border"
                                      style={{
                                        backgroundColor: `rgb(${layer.graphicLayerRecommendedDisplayGrayscaleValue}, ${layer.graphicLayerRecommendedDisplayGrayscaleValue}, ${layer.graphicLayerRecommendedDisplayGrayscaleValue})`
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
                    {gsps.graphicAnnotationSequence && gsps.graphicAnnotationSequence.length > 0 ? (
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {gsps.graphicAnnotationSequence.map((annotation, index) => (
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
                    {gsps.textObjectSequence && gsps.textObjectSequence.length > 0 ? (
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {gsps.textObjectSequence.map((textObj, index) => (
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
              
              <TabsContent value="luts" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* VOI LUTs */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <Contrast className="w-4 h-4" />
                      <span>VOI LUTs ({statistics.voiLUTs})</span>
                    </h4>
                    {gsps.softcopyVOILUTSequence && gsps.softcopyVOILUTSequence.length > 0 ? (
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {gsps.softcopyVOILUTSequence.map((voiLUT, index) => (
                            <div key={index} className="p-2 border rounded text-sm">
                              <div className="font-medium">
                                {voiLUT.windowCenterWidthExplanation || `VOI LUT ${index + 1}`}
                              </div>
                              {voiLUT.windowCenter && voiLUT.windowWidth && (
                                <div className="text-xs text-gray-500">
                                  WC: {voiLUT.windowCenter.join(', ')}, WW: {voiLUT.windowWidth.join(', ')}
                                </div>
                              )}
                              {voiLUT.voiLUTFunction && (
                                <div className="text-xs text-gray-500">
                                  Function: {voiLUT.voiLUTFunction}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-gray-500">No VOI LUTs defined.</div>
                    )}
                  </div>
                  
                  {/* Presentation LUTs */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <Contrast className="w-4 h-4" />
                      <span>Presentation LUTs ({statistics.presentationLUTs})</span>
                    </h4>
                    {gsps.softcopyPresentationLUTSequence && gsps.softcopyPresentationLUTSequence.length > 0 ? (
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {gsps.softcopyPresentationLUTSequence.map((presLUT, index) => (
                            <div key={index} className="p-2 border rounded text-sm">
                              <div className="font-medium">Presentation LUT {index + 1}</div>
                              {presLUT.presentationLUTShape && (
                                <div className="text-xs text-gray-500">
                                  Shape: {presLUT.presentationLUTShape}
                                </div>
                              )}
                              {presLUT.presentationLUTSequence && (
                                <div className="text-xs text-gray-500">
                                  LUT Data: {presLUT.presentationLUTSequence.length} entries
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-gray-500">No presentation LUTs defined.</div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="images" className="space-y-4">
                <h4 className="font-medium mb-4 flex items-center space-x-2">
                  <Image className="w-4 h-4" />
                  <span>Referenced Images ({gsps.referencedImageSequence.length})</span>
                </h4>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {gsps.referencedImageSequence.map((image, index) => (
                      <div 
                        key={index} 
                        className={`p-3 border rounded cursor-pointer ${
                          theme === 'dark' 
                            ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => onImageSelected?.(image)}
                      >
                        <div className="font-medium text-sm">
                          SOP Instance UID: {image.referencedSOPInstanceUID.substring(0, 20)}...
                        </div>
                        <div className="text-xs text-gray-500">
                          SOP Class: {image.referencedSOPClassUID}
                        </div>
                        {image.referencedFrameNumber && (
                          <div className="text-xs text-gray-500">
                            Frames: {image.referencedFrameNumber.join(', ')}
                          </div>
                        )}
                        {image.referencedSegmentNumber && (
                          <div className="text-xs text-gray-500">
                            Segments: {image.referencedSegmentNumber.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div>
                    <h4 className="font-medium mb-2">Basic Information</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>SOP Instance UID:</strong> {gsps.sopInstanceUID}</div>
                      <div><strong>SOP Class UID:</strong> {gsps.sopClassUID}</div>
                      <div><strong>Study Instance UID:</strong> {gsps.studyInstanceUID}</div>
                      <div><strong>Series Instance UID:</strong> {gsps.seriesInstanceUID}</div>
                      <div><strong>Instance Number:</strong> {gsps.instanceNumber}</div>
                      {gsps.contentDate && <div><strong>Content Date:</strong> {gsps.contentDate}</div>}
                      {gsps.contentTime && <div><strong>Content Time:</strong> {gsps.contentTime}</div>}
                      {gsps.contentLabel && <div><strong>Content Label:</strong> {gsps.contentLabel}</div>}
                      {gsps.contentDescription && <div><strong>Description:</strong> {gsps.contentDescription}</div>}
                      {gsps.contentCreatorName && <div><strong>Creator:</strong> {gsps.contentCreatorName}</div>}
                    </div>
                  </div>
                  
                  {/* Institutional Information */}
                  <div>
                    <h4 className="font-medium mb-2">Institutional Information</h4>
                    <div className="space-y-1 text-sm">
                      {gsps.requestingPhysician && <div><strong>Requesting Physician:</strong> {gsps.requestingPhysician}</div>}
                      {gsps.institutionName && <div><strong>Institution:</strong> {gsps.institutionName}</div>}
                      {gsps.institutionalDepartmentName && <div><strong>Department:</strong> {gsps.institutionalDepartmentName}</div>}
                      {gsps.manufacturer && <div><strong>Manufacturer:</strong> {gsps.manufacturer}</div>}
                      {gsps.manufacturerModelName && <div><strong>Model:</strong> {gsps.manufacturerModelName}</div>}
                      {gsps.deviceSerialNumber && <div><strong>Serial Number:</strong> {gsps.deviceSerialNumber}</div>}
                      {gsps.softwareVersions && <div><strong>Software Version:</strong> {gsps.softwareVersions}</div>}
                    </div>
                  </div>
                </div>
                
                {/* Display Parameters */}
                <div>
                  <h4 className="font-medium mb-2">Display Parameters</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {gsps.presentationSizeMode && (
                      <div><strong>Size Mode:</strong> {gsps.presentationSizeMode}</div>
                    )}
                    {gsps.presentationPixelSpacing && (
                      <div><strong>Pixel Spacing:</strong> {gsps.presentationPixelSpacing.join(', ')}</div>
                    )}
                    {gsps.presentationPixelAspectRatio && (
                      <div><strong>Aspect Ratio:</strong> {gsps.presentationPixelAspectRatio.join(', ')}</div>
                    )}
                    {gsps.presentationPixelMagnificationRatio && (
                      <div><strong>Magnification:</strong> {gsps.presentationPixelMagnificationRatio}</div>
                    )}
                    {gsps.imageRotation !== undefined && (
                      <div><strong>Rotation:</strong> {gsps.imageRotation}°</div>
                    )}
                    {gsps.imageHorizontalFlip && (
                      <div><strong>Horizontal Flip:</strong> {gsps.imageHorizontalFlip}</div>
                    )}
                    {gsps.imageVerticalFlip && (
                      <div><strong>Vertical Flip:</strong> {gsps.imageVerticalFlip}</div>
                    )}
                    {gsps.illumination !== undefined && (
                      <div><strong>Illumination:</strong> {gsps.illumination} cd/m²</div>
                    )}
                    {gsps.reflectedAmbientLight !== undefined && (
                      <div><strong>Ambient Light:</strong> {gsps.reflectedAmbientLight} cd/m²</div>
                    )}
                  </div>
                </div>
                
                {/* Shutter Information */}
                {gsps.displayShutterSequence && gsps.displayShutterSequence.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Display Shutters</h4>
                    <div className="space-y-2">
                      {gsps.displayShutterSequence.map((shutter, index) => (
                        <div key={index} className="p-2 border rounded text-sm">
                          <div><strong>Shape:</strong> {shutter.shutterShape}</div>
                          {shutter.shutterShape === 'RECTANGULAR' && (
                            <div className="text-xs text-gray-500">
                              Left: {shutter.shutterLeftVerticalEdge}, Right: {shutter.shutterRightVerticalEdge}, 
                              Top: {shutter.shutterUpperHorizontalEdge}, Bottom: {shutter.shutterLowerHorizontalEdge}
                            </div>
                          )}
                          {shutter.shutterShape === 'CIRCULAR' && (
                            <div className="text-xs text-gray-500">
                              Center: ({shutter.centerOfCircularShutter?.join(', ')}), 
                              Radius: {shutter.radiusOfCircularShutter}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
