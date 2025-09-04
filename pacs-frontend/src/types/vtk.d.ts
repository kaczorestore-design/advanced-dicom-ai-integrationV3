// VTK.js type declarations
declare module '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow' {
  export interface vtkFullScreenRenderWindow {
    newInstance(options?: any): any;
    getRenderer(): any;
    getRenderWindow(): any;
    getInteractor(): any;
    resize(): void;
    delete(): void;
    getContainer(): HTMLElement;
    setContainer(container: HTMLElement): void;
  }
  const vtkFullScreenRenderWindow: vtkFullScreenRenderWindow;
  export default vtkFullScreenRenderWindow;
}

declare module '@kitware/vtk.js/Rendering/Core/Actor' {
  interface Actor {
    setMapper(mapper: any): void;
  }
  
  interface ActorStatic {
    newInstance(): Actor;
  }
  
  const Actor: ActorStatic;
  export default Actor;
}

declare module '@kitware/vtk.js/Rendering/Core/Mapper' {
  interface Mapper {
    setInputConnection(connection: any): void;
  }
  
  interface MapperStatic {
    newInstance(): Mapper;
  }
  
  const Mapper: MapperStatic;
  export default Mapper;
}

declare module '@kitware/vtk.js/Filters/Sources/ConeSource' {
  interface ConeSource {
    getOutputPort(): any;
  }
  
  interface ConeSourceStatic {
    newInstance(options?: { height?: number }): ConeSource;
  }
  
  const ConeSource: ConeSourceStatic;
  export default ConeSource;
}

declare module '@kitware/vtk.js/Rendering/Core/RenderWindow' {
  export interface vtkRenderWindow {
    newInstance(): any;
    addRenderer(renderer: any): void;
    removeRenderer(renderer: any): void;
    render(): void;
    getInteractor(): any;
    setInteractor(interactor: any): void;
  }
  const vtkRenderWindow: vtkRenderWindow;
  export default vtkRenderWindow;
}

declare module '@kitware/vtk.js/Rendering/Core/Renderer' {
  export interface vtkRenderer {
    newInstance(): any;
    addActor(actor: any): void;
    removeActor(actor: any): void;
    setBackground(r: number, g: number, b: number): void;
    resetCamera(): void;
    getActiveCamera(): any;
    addVolume(volume: any): void;
    removeVolume(volume: any): void;
  }
  const vtkRenderer: vtkRenderer;
  export default vtkRenderer;
}

declare module '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor' {
  export interface vtkRenderWindowInteractor {
    newInstance(): any;
    setView(view: any): void;
    initialize(): void;
    bindEvents(container: HTMLElement): void;
    unbindEvents(): void;
    start(): void;
    setInteractorStyle(style: any): void;
  }
  const vtkRenderWindowInteractor: vtkRenderWindowInteractor;
  export default vtkRenderWindowInteractor;
}

declare module '@kitware/vtk.js/Common/DataModel/ImageData' {
  export interface vtkImageData {
    newInstance(): any;
    setDimensions(dimensions: number[]): void;
    setSpacing(spacing: number[]): void;
    setOrigin(origin: number[]): void;
    getPointData(): any;
    getDimensions(): number[];
    getSpacing(): number[];
    getOrigin(): number[];
  }
  const vtkImageData: vtkImageData;
  export default vtkImageData;
}

declare module '@kitware/vtk.js/Common/Core/DataArray' {
  export interface vtkDataArray {
    newInstance(options: any): any;
  }
  const vtkDataArray: vtkDataArray;
  export default vtkDataArray;
}

declare module '@kitware/vtk.js/Rendering/Core/Volume' {
  export interface vtkVolume {
    newInstance(): any;
    setMapper(mapper: any): void;
    getProperty(): any;
  }
  const vtkVolume: vtkVolume;
  export default vtkVolume;
}

declare module '@kitware/vtk.js/Rendering/Core/VolumeMapper' {
  export interface vtkVolumeMapper {
    newInstance(): any;
    setInputData(data: any): void;
    setSampleDistance(distance: number): void;
  }
  const vtkVolumeMapper: vtkVolumeMapper;
  export default vtkVolumeMapper;
}

declare module '@kitware/vtk.js/Rendering/Core/VolumeProperty' {
  export interface vtkVolumeProperty {
    newInstance(): any;
    setScalarOpacity(opacity: any): void;
    setColor(color: any): void;
    setInterpolationTypeToLinear(): void;
    setShade(shade: boolean): void;
  }
  const vtkVolumeProperty: vtkVolumeProperty;
  export default vtkVolumeProperty;
}

declare module '@kitware/vtk.js/Common/DataModel/PiecewiseFunction' {
  export interface vtkPiecewiseFunction {
    newInstance(): any;
    addPoint(x: number, y: number): void;
    removeAllPoints(): void;
  }
  const vtkPiecewiseFunction: vtkPiecewiseFunction;
  export default vtkPiecewiseFunction;
}

declare module '@kitware/vtk.js/Common/Core/ColorTransferFunction' {
  export interface vtkColorTransferFunction {
    newInstance(): any;
    addRGBPoint(x: number, r: number, g: number, b: number): void;
    removeAllPoints(): void;
  }
  const vtkColorTransferFunction: vtkColorTransferFunction;
  export default vtkColorTransferFunction;
}

// DICOM-specific VTK modules
declare module '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper' {
  const HttpDataAccessHelper: any;
  export default HttpDataAccessHelper;
}

declare module '@kitware/vtk.js/IO/Geometry/STLReader' {
  const STLReader: any;
  export default STLReader;
}

declare module '@kitware/vtk.js/Filters/General/ImageMarchingCubes' {
  const ImageMarchingCubes: any;
  export default ImageMarchingCubes;
}

// Global VTK types
declare global {
  interface Window {
    vtkRenderer?: any;
    vtkRenderWindow?: any;
    vtkRenderWindowInteractor?: any;
    vtkFullScreenRenderWindow?: any;
  }
}

export {};