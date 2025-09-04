import { GSPSPresentationState } from '../types/medical';

export const generateGSPSOverlay = (gsps: GSPSPresentationState, _imageId: string) => {
  const overlays: Record<string, unknown>[] = [];
  
  if (gsps.graphicAnnotationSequence) {
    gsps.graphicAnnotationSequence.forEach((annotation, annotationIndex) => {
      if (annotation.graphicObjectSequence) {
        annotation.graphicObjectSequence.forEach((graphicObj, objIndex) => {
          const overlay = {
            id: `gsps-graphic-${annotationIndex}-${objIndex}`,
            type: graphicObj.graphicType.toLowerCase(),
            data: graphicObj.graphicData,
            layer: annotation.graphicLayer || 'default',
            filled: graphicObj.graphicFilled === 'Y',
            color: 'yellow',
            lineWidth: 1
          };
          overlays.push(overlay);
        });
      }
      
      if (annotation.textObjectSequence) {
        annotation.textObjectSequence.forEach((textObj, textIndex) => {
          const overlay = {
            id: `gsps-text-${annotationIndex}-${textIndex}`,
            type: 'text',
            text: textObj.unformattedTextValue,
            position: textObj.anchorPoint || textObj.boundingBoxTopLeftHandCorner,
            layer: annotation.graphicLayer || 'default',
            color: 'yellow',
            fontSize: 12
          };
          overlays.push(overlay);
        });
      }
    });
  }
  
  if (gsps.textObjectSequence) {
    gsps.textObjectSequence.forEach((textObj, index) => {
      const overlay = {
        id: `gsps-text-${index}`,
        type: 'text',
        text: textObj.unformattedTextValue,
        position: textObj.anchorPoint || textObj.boundingBoxTopLeftHandCorner,
        layer: 'default',
        color: 'yellow',
        fontSize: 12
      };
      overlays.push(overlay);
    });
  }
  
  return overlays;
};

export const applyGSPSToViewport = (gsps: GSPSPresentationState, viewport: Record<string, unknown> & {
  setVOI(params: { windowCenter: number; windowWidth: number }): void;
  setRotation(angle: number): void;
  setFlipHorizontal(flip: boolean): void;
  setFlipVertical(flip: boolean): void;
  setZoom(zoom: number): void;
  setPresentationLUT(shape: string): void;
}) => {
  if (gsps.softcopyVOILUTSequence && gsps.softcopyVOILUTSequence.length > 0) {
    const voiLUT = gsps.softcopyVOILUTSequence[0];
    if (voiLUT.windowCenter && voiLUT.windowWidth) {
      viewport.setVOI({
        windowCenter: voiLUT.windowCenter[0],
        windowWidth: voiLUT.windowWidth[0]
      });
    }
  }
  
  if (gsps.imageRotation !== undefined) {
    viewport.setRotation(gsps.imageRotation);
  }
  
  if (gsps.imageHorizontalFlip === 'Y') {
    viewport.setFlipHorizontal(true);
  }
  
  if (gsps.imageVerticalFlip === 'Y') {
    viewport.setFlipVertical(true);
  }
  
  if (gsps.presentationPixelMagnificationRatio) {
    viewport.setZoom(gsps.presentationPixelMagnificationRatio);
  }
  
  if (gsps.softcopyPresentationLUTSequence && gsps.softcopyPresentationLUTSequence.length > 0) {
    const presLUT = gsps.softcopyPresentationLUTSequence[0];
    if (presLUT.presentationLUTShape) {
      viewport.setPresentationLUT(presLUT.presentationLUTShape);
    }
  }
};
