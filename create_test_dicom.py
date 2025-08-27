import pydicom
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid
import numpy as np
import os

def create_test_dicom():
    file_meta = Dataset()
    file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.ImplementationClassUID = generate_uid()

    ds = FileDataset('test_ct.dcm', {}, file_meta=file_meta, preamble=b'\0' * 128)

    ds.PatientName = 'Test^Patient'
    ds.PatientID = 'TEST001'
    ds.PatientBirthDate = '19900101'
    ds.PatientSex = 'M'
    ds.StudyInstanceUID = generate_uid()
    ds.SeriesInstanceUID = generate_uid()
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.StudyDate = '20250825'
    ds.StudyTime = '120000'
    ds.Modality = 'CT'
    ds.BodyPartExamined = 'CHEST'
    ds.StudyDescription = 'Test Chest CT'
    ds.SeriesDescription = 'Axial CT Chest'
    ds.InstanceNumber = 1
    ds.SliceThickness = 5.0
    ds.PixelSpacing = [1.0, 1.0]

    pixel_array = np.random.randint(0, 4096, (512, 512), dtype=np.uint16)
    ds.Rows = 512
    ds.Columns = 512
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = 'MONOCHROME2'
    ds.PixelData = pixel_array.tobytes()

    os.makedirs('test_dicom', exist_ok=True)
    ds.save_as('test_dicom/test_ct.dcm')
    print('Created test DICOM file: test_dicom/test_ct.dcm')
    return 'test_dicom/test_ct.dcm'

if __name__ == "__main__":
    create_test_dicom()
