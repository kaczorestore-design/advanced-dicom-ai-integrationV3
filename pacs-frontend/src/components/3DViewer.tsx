import '@kitware/vtk.js/Rendering/Profiles/Volume';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkVolumeProperty from '@kitware/vtk.js/Rendering/Core/VolumeProperty';
import { VtkDataTypes } from '@kitware/vtk.js/Common/Core/DataArray/Constants';
import { useState } from 'react';



const ThreeDViewerDicom = ()=>{
    const [vtkRenderWindow, setVtkRenderWindow] = useState<any>(null);
    const [vtkRenderer, setVtkRenderer] = useState<any>(null);
    const [vtkVolumeActor, setVtkVolumeActor] = useState<any>(null);
    const [volumeData, setVolumeData] = useState<any>(null);



}