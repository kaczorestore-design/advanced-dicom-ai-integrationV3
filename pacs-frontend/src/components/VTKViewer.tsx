import React, { useEffect, useRef } from 'react';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkConeSource from '@kitware/vtk.js/Filters/Sources/ConeSource';

interface VTKViewerProps {
  width?: number;
  height?: number;
  className?: string;
}

const VTKViewer: React.FC<VTKViewerProps> = ({ 
  width = 400, 
  height = 400, 
  className = '' 
}) => {
  const vtkContainerRef = useRef<HTMLDivElement>(null);
  const renderWindowRef = useRef<any>(null);

  useEffect(() => {
    if (!vtkContainerRef.current) return;

    try {
      // Create a render window
      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        container: vtkContainerRef.current,
        containerStyle: {
          height: `${height}px`,
          width: `${width}px`,
        },
      });

      renderWindowRef.current = fullScreenRenderer;
      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();

      // Create a cone source
      const coneSource = vtkConeSource.newInstance({ height: 1.0 });

      // Create a mapper
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(coneSource.getOutputPort());

      // Create an actor
      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);

      // Add the actor to the renderer
      renderer.addActor(actor);
      renderer.resetCamera();
      renderWindow.render();

      console.log('VTK.js initialized successfully');
    } catch (error) {
      console.error('Error initializing VTK.js:', error);
    }

    // Cleanup function
    return () => {
      if (renderWindowRef.current) {
        try {
          renderWindowRef.current.delete();
        } catch (error) {
          console.error('Error cleaning up VTK.js:', error);
        }
      }
    };
  }, [width, height]);

  return (
    <div 
      ref={vtkContainerRef} 
      className={`vtk-container ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};

export default VTKViewer;