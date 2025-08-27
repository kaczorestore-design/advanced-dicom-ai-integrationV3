import pydicom
import os
import json

def examine_dicom_files():
    """Examine DICOM files to understand their structure and metadata"""
    dicom_files = []
    
    for root, dirs, files in os.walk('/home/ubuntu/attachments'):
        for file in files:
            if file.endswith('.dcm'):
                dicom_files.append(os.path.join(root, file))
                if len(dicom_files) >= 5:  # Examine first 5 files
                    break
        if len(dicom_files) >= 5:
            break
    
    print(f'Found {len(dicom_files)} DICOM files to examine:')
    print('=' * 60)
    
    for i, file_path in enumerate(dicom_files):
        print(f'\n{i+1}. File: {os.path.basename(file_path)}')
        print(f'   Path: {file_path}')
        print(f'   Size: {os.path.getsize(file_path)} bytes')
        
        try:
            ds = pydicom.dcmread(file_path)
            
            metadata = {
                'PatientName': str(getattr(ds, 'PatientName', 'N/A')),
                'PatientID': str(getattr(ds, 'PatientID', 'N/A')),
                'PatientBirthDate': str(getattr(ds, 'PatientBirthDate', 'N/A')),
                'PatientSex': str(getattr(ds, 'PatientSex', 'N/A')),
                'Modality': str(getattr(ds, 'Modality', 'N/A')),
                'StudyDescription': str(getattr(ds, 'StudyDescription', 'N/A')),
                'SeriesDescription': str(getattr(ds, 'SeriesDescription', 'N/A')),
                'BodyPartExamined': str(getattr(ds, 'BodyPartExamined', 'N/A')),
                'StudyDate': str(getattr(ds, 'StudyDate', 'N/A')),
                'StudyTime': str(getattr(ds, 'StudyTime', 'N/A')),
                'StudyInstanceUID': str(getattr(ds, 'StudyInstanceUID', 'N/A')),
                'SeriesInstanceUID': str(getattr(ds, 'SeriesInstanceUID', 'N/A')),
                'SOPInstanceUID': str(getattr(ds, 'SOPInstanceUID', 'N/A')),
                'Rows': getattr(ds, 'Rows', 'N/A'),
                'Columns': getattr(ds, 'Columns', 'N/A'),
                'BitsAllocated': getattr(ds, 'BitsAllocated', 'N/A'),
                'BitsStored': getattr(ds, 'BitsStored', 'N/A'),
                'PixelRepresentation': getattr(ds, 'PixelRepresentation', 'N/A'),
                'PhotometricInterpretation': str(getattr(ds, 'PhotometricInterpretation', 'N/A')),
                'SamplesPerPixel': getattr(ds, 'SamplesPerPixel', 'N/A'),
            }
            
            print('   DICOM Metadata:')
            for key, value in metadata.items():
                print(f'     {key}: {value}')
                
            if hasattr(ds, 'pixel_array'):
                pixel_array = ds.pixel_array
                print(f'     Pixel Array Shape: {pixel_array.shape}')
                print(f'     Pixel Array Type: {pixel_array.dtype}')
                print(f'     Pixel Value Range: {pixel_array.min()} - {pixel_array.max()}')
            else:
                print('     No pixel data found')
                
        except Exception as e:
            print(f'   Error reading DICOM: {e}')
    
    return dicom_files

if __name__ == "__main__":
    files = examine_dicom_files()
    print(f'\n\nTotal DICOM files found: {len(files)}')
    if files:
        print(f'First file for testing: {files[0]}')
