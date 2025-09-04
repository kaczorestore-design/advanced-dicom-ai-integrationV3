interface MeasurementData {
  id: string;
  type: string;
  value: number;
  unit: string;
  coordinates?: number[];
  metadata?: Record<string, unknown>;
}

interface AnnotationData {
  id: string;
  type: string;
  text: string;
  position: { x: number; y: number };
  metadata?: Record<string, unknown>;
}

interface SegmentationData {
  id: string;
  label: string;
  color: string;
  opacity: number;
  visible: boolean;
  data: ArrayBuffer | Uint8Array;
}

interface DICOMMetadata {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  modality: string;
  patientID?: string;
  studyDate?: string;
  seriesDate?: string;
  [key: string]: unknown;
}

interface ViewportSettings {
  windowWidth: number;
  windowCenter: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  invert: boolean;
}

interface RenderingConfig {
  quality: 'low' | 'medium' | 'high';
  enableGPU: boolean;
  maxTextureSize: number;
  volumeRenderingMode: 'mip' | 'vr' | 'minip';
}

interface GSPSPresentationState {
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
  presentationCreationDate?: string;
  presentationCreationTime?: string;
  referencedImageSequence: ReferencedImage[];
  displayedAreaSelectionSequence?: DisplayedAreaSelection[];
  softcopyVOILUTSequence?: SoftcopyVOILUT[];
  softcopyPresentationLUTSequence?: SoftcopyPresentationLUT[];
  graphicAnnotationSequence?: GraphicAnnotation[];
  graphicLayerSequence?: GraphicLayer[];
  spatialTransformationSequence?: SpatialTransformation[];
  overlayActivationSequence?: OverlayActivation[];
  voiLUTSequence?: VOILUT[];
  presentationLUTSequence?: PresentationLUT[];
  modalityLUTSequence?: ModalityLUT[];
  displayShutterSequence?: DisplayShutter[];
  bitmapDisplayShutterSequence?: BitmapDisplayShutter[];
  textObjectSequence?: TextObject[];
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
  presentationColorSpace?: string;
  illumination?: number;
  reflectedAmbientLight?: number;
}

interface ReferencedImage {
  referencedSOPClassUID: string;
  referencedSOPInstanceUID: string;
  referencedFrameNumber?: number[];
  referencedSegmentNumber?: number[];
}

interface DisplayedAreaSelection {
  displayedAreaTopLeftHandCorner: number[];
  displayedAreaBottomRightHandCorner: number[];
  presentationSizeMode: string;
  presentationPixelSpacing?: number[];
  presentationPixelAspectRatio?: number[];
  presentationPixelMagnificationRatio?: number;
}

interface SoftcopyVOILUT {
  referencedImageSequence: ReferencedImage[];
  voiLUTSequence?: VOILUT[];
  windowCenter?: number[];
  windowWidth?: number[];
  windowCenterWidthExplanation?: string;
  voiLUTFunction?: string;
}

interface SoftcopyPresentationLUT {
  referencedImageSequence: ReferencedImage[];
  presentationLUTSequence?: PresentationLUT[];
  presentationLUTShape?: string;
}

interface GraphicAnnotation {
  graphicLayer?: string;
  textObjectSequence?: TextObject[];
  graphicObjectSequence?: GraphicObject[];
}

interface GraphicObject {
  graphicAnnotationUnits: string;
  graphicDimensions: number;
  graphicType: string;
  graphicData: number[];
  graphicFilled?: string;
}

interface TextObject {
  boundingBoxAnnotationUnits?: string;
  anchorPointAnnotationUnits?: string;
  unformattedTextValue: string;
  boundingBoxTopLeftHandCorner?: number[];
  boundingBoxBottomRightHandCorner?: number[];
  boundingBoxTextHorizontalJustification?: string;
  anchorPoint?: number[];
  anchorPointVisibility?: string;
}

interface GraphicLayer {
  graphicLayer: string;
  graphicLayerOrder: number;
  graphicLayerRecommendedDisplayGrayscaleValue?: number;
  graphicLayerRecommendedDisplayRGBValue?: number[];
  graphicLayerDescription?: string;
}

interface SpatialTransformation {
  imageRotation?: number;
  imageHorizontalFlip?: string;
  imageVerticalFlip?: string;
}

interface OverlayActivation {
  overlayGroup: number;
  overlayActivationLayer?: string;
}

interface VOILUT {
  lutDescriptor: number[];
  lutExplanation?: string;
  lutData: number[];
}

interface PresentationLUT {
  presentationLUTShape?: string;
  presentationLUTData?: number[];
}

interface ModalityLUT {
  lutDescriptor: number[];
  lutExplanation?: string;
  modalityLUTType: string;
  lutData: number[];
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
  shutterPresentationColorCIELabValue?: number[];
}

export {
  MeasurementData,
  AnnotationData,
  SegmentationData,
  DICOMMetadata,
  ViewportSettings,
  RenderingConfig,
  GSPSPresentationState,
  ReferencedImage,
  DisplayedAreaSelection,
  SoftcopyVOILUT,
  SoftcopyPresentationLUT,
  GraphicAnnotation,
  GraphicObject,
  TextObject,
  GraphicLayer,
  SpatialTransformation,
  OverlayActivation,
  VOILUT,
  PresentationLUT,
  ModalityLUT,
  DisplayShutter,
  BitmapDisplayShutter
};
