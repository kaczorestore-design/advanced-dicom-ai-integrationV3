// VTK.js type declarations
interface VTKRenderer {
  addActor(actor: VTKActor): void;
  removeActor(actor: VTKActor): void;
  setBackground(r: number, g: number, b: number): void;
  resetCamera(): void;
  getActiveCamera(): VTKCamera;
  addVolume(volume: VTKVolume): void;
  removeVolume(volume: VTKVolume): void;
}

interface VTKRenderWindow {
  addRenderer(renderer: VTKRenderer): void;
  removeRenderer(renderer: VTKRenderer): void;
  render(): void;
  getInteractor(): VTKRenderWindowInteractor;
  setInteractor(interactor: VTKRenderWindowInteractor): void;
}

interface VTKRenderWindowInteractor {
  setView(view: VTKRenderWindow): void;
  initialize(): void;
  bindEvents(container: HTMLElement): void;
  unbindEvents(): void;
  start(): void;
  setInteractorStyle(style: VTKInteractorStyle): void;
}

interface VTKActor {
  setMapper(mapper: VTKMapper): void;
}

interface VTKMapper {
  setInputConnection(connection: VTKOutputPort): void;
}

interface VTKVolume {
  setMapper(mapper: VTKVolumeMapper): void;
  getProperty(): VTKVolumeProperty;
}

interface VTKVolumeMapper {
  setInputData(data: VTKImageData): void;
  setSampleDistance(distance: number): void;
}

interface VTKVolumeProperty {
  setScalarOpacity(opacity: VTKPiecewiseFunction): void;
  setColor(color: VTKColorTransferFunction): void;
  setInterpolationTypeToLinear(): void;
  setShade(shade: boolean): void;
}

interface VTKImageData {
  setDimensions(dimensions: number[]): void;
  setSpacing(spacing: number[]): void;
  setOrigin(origin: number[]): void;
  getPointData(): VTKPointData;
  getDimensions(): number[];
  getSpacing(): number[];
  getOrigin(): number[];
}

interface VTKPointData {
  setScalars(scalars: VTKDataArray): void;
}

interface VTKDataArray {
  setData(data: ArrayLike<number>): void;
}

interface VTKPiecewiseFunction {
  addPoint(x: number, y: number): void;
  removeAllPoints(): void;
}

interface VTKColorTransferFunction {
  addRGBPoint(x: number, r: number, g: number, b: number): void;
  removeAllPoints(): void;
}

interface VTKOutputPort {
  getOutputData(): VTKImageData;
}

interface VTKCamera {
  setPosition(x: number, y: number, z: number): void;
  setFocalPoint(x: number, y: number, z: number): void;
  setViewUp(x: number, y: number, z: number): void;
}

interface VTKInteractorStyle {
  setInteractor(interactor: VTKRenderWindowInteractor): void;
}

declare module '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow' {
  export interface vtkFullScreenRenderWindow {
    newInstance(options?: Record<string, unknown>): vtkFullScreenRenderWindow;
    getRenderer(): VTKRenderer;
    getRenderWindow(): VTKRenderWindow;
    getInteractor(): VTKRenderWindowInteractor;
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
    setMapper(mapper: VTKMapper): void;
  }
  
  interface ActorStatic {
    newInstance(): Actor;
  }
  
  const Actor: ActorStatic;
  export default Actor;
}

declare module '@kitware/vtk.js/Rendering/Core/Mapper' {
  interface Mapper {
    setInputConnection(connection: VTKOutputPort): void;
  }
  
  interface MapperStatic {
    newInstance(): Mapper;
  }
  
  const Mapper: MapperStatic;
  export default Mapper;
}

declare module '@kitware/vtk.js/Filters/Sources/ConeSource' {
  interface ConeSource {
    getOutputPort(): VTKOutputPort;
  }
  
  interface ConeSourceStatic {
    newInstance(options?: { height?: number }): ConeSource;
  }
  
  const ConeSource: ConeSourceStatic;
  export default ConeSource;
}

declare module '@kitware/vtk.js/Rendering/Core/RenderWindow' {
  export interface vtkRenderWindow {
    newInstance(): VTKRenderWindow;
    addRenderer(renderer: VTKRenderer): void;
    removeRenderer(renderer: VTKRenderer): void;
    render(): void;
    getInteractor(): VTKRenderWindowInteractor;
    setInteractor(interactor: VTKRenderWindowInteractor): void;
  }
  const vtkRenderWindow: vtkRenderWindow;
  export default vtkRenderWindow;
}

declare module '@kitware/vtk.js/Rendering/Core/Renderer' {
  export interface vtkRenderer {
    newInstance(): VTKRenderer;
    addActor(actor: VTKActor): void;
    removeActor(actor: VTKActor): void;
    setBackground(r: number, g: number, b: number): void;
    resetCamera(): void;
    getActiveCamera(): VTKCamera;
    addVolume(volume: VTKVolume): void;
    removeVolume(volume: VTKVolume): void;
  }
  const vtkRenderer: vtkRenderer;
  export default vtkRenderer;
}

declare module '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor' {
  export interface vtkRenderWindowInteractor {
    newInstance(): VTKRenderWindowInteractor;
    setView(view: VTKRenderWindow): void;
    initialize(): void;
    bindEvents(container: HTMLElement): void;
    unbindEvents(): void;
    start(): void;
    setInteractorStyle(style: VTKInteractorStyle): void;
  }
  const vtkRenderWindowInteractor: vtkRenderWindowInteractor;
  export default vtkRenderWindowInteractor;
}

declare module '@kitware/vtk.js/Common/DataModel/ImageData' {
  export interface vtkImageData {
    newInstance(): VTKImageData;
    setDimensions(dimensions: number[]): void;
    setSpacing(spacing: number[]): void;
    setOrigin(origin: number[]): void;
    getPointData(): VTKPointData;
    getDimensions(): number[];
    getSpacing(): number[];
    getOrigin(): number[];
  }
  const vtkImageData: vtkImageData;
  export default vtkImageData;
}

declare module '@kitware/vtk.js/Common/Core/DataArray' {
  export interface vtkDataArray {
    newInstance(options: Record<string, unknown>): VTKDataArray;
  }
  const vtkDataArray: vtkDataArray;
  export default vtkDataArray;
}

declare module '@kitware/vtk.js/Rendering/Core/Volume' {
  export interface vtkVolume {
    newInstance(): VTKVolume;
    setMapper(mapper: VTKVolumeMapper): void;
    getProperty(): VTKVolumeProperty;
  }
  const vtkVolume: vtkVolume;
  export default vtkVolume;
}

declare module '@kitware/vtk.js/Rendering/Core/VolumeMapper' {
  export interface vtkVolumeMapper {
    newInstance(): VTKVolumeMapper;
    setInputData(data: VTKImageData): void;
    setSampleDistance(distance: number): void;
  }
  const vtkVolumeMapper: vtkVolumeMapper;
  export default vtkVolumeMapper;
}

declare module '@kitware/vtk.js/Rendering/Core/VolumeProperty' {
  export interface vtkVolumeProperty {
    newInstance(): VTKVolumeProperty;
    setScalarOpacity(opacity: VTKPiecewiseFunction): void;
    setColor(color: VTKColorTransferFunction): void;
    setInterpolationTypeToLinear(): void;
    setShade(shade: boolean): void;
  }
  const vtkVolumeProperty: vtkVolumeProperty;
  export default vtkVolumeProperty;
}

declare module '@kitware/vtk.js/Common/DataModel/PiecewiseFunction' {
  export interface vtkPiecewiseFunction {
    newInstance(): VTKPiecewiseFunction;
    addPoint(x: number, y: number): void;
    removeAllPoints(): void;
  }
  const vtkPiecewiseFunction: vtkPiecewiseFunction;
  export default vtkPiecewiseFunction;
}

declare module '@kitware/vtk.js/Common/Core/ColorTransferFunction' {
  export interface vtkColorTransferFunction {
    newInstance(): VTKColorTransferFunction;
    addRGBPoint(x: number, r: number, g: number, b: number): void;
    removeAllPoints(): void;
  }
  const vtkColorTransferFunction: vtkColorTransferFunction;
  export default vtkColorTransferFunction;
}

// DICOM-specific VTK modules
declare module '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper' {
  interface HttpDataAccessHelper {
    fetchBinary(url: string): Promise<ArrayBuffer>;
    fetchText(url: string): Promise<string>;
  }
  const HttpDataAccessHelper: HttpDataAccessHelper;
  export default HttpDataAccessHelper;
}

declare module '@kitware/vtk.js/IO/Geometry/STLReader' {
  interface STLReader {
    setUrl(url: string): void;
    parseAsArrayBuffer(arrayBuffer: ArrayBuffer): void;
    getOutputData(): VTKImageData;
  }
  const STLReader: STLReader;
  export default STLReader;
}

declare module '@kitware/vtk.js/Filters/General/ImageMarchingCubes' {
  interface ImageMarchingCubes {
    setInputData(data: VTKImageData): void;
    setContourValue(value: number): void;
    getOutputData(): VTKImageData;
  }
  const ImageMarchingCubes: ImageMarchingCubes;
  export default ImageMarchingCubes;
}

// Global VTK types
declare global {
  interface Window {
    vtkRenderer?: VTKRenderer;
    vtkRenderWindow?: VTKRenderWindow;
    vtkRenderWindowInteractor?: VTKRenderWindowInteractor;
    vtkFullScreenRenderWindow?: vtkFullScreenRenderWindow;
  }
}

export {};
