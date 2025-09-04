"""
Upload configuration for large DICOM file handling
"""

MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024  # 10GB

# MAX_FILES_PER_BATCH = None  # Removed restriction

ALLOWED_EXTENSIONS = {".dcm", ".dicom", ".DCM", ".DICOM"}

UPLOAD_TIMEOUT = 30 * 60  # 30 minutes

CHUNK_SIZE = 1024 * 1024  # 1MB


def validate_upload_file(file, max_size=MAX_UPLOAD_SIZE):
    """Validate uploaded file size and type"""
    if file.size > max_size:
        raise ValueError(
            f"File size {file.size} exceeds maximum allowed size {max_size}"
        )

    if not any(
        file.filename.lower().endswith(ext.lower()) for ext in ALLOWED_EXTENSIONS
    ):
        raise ValueError(
            f"File type not supported. Allowed extensions: {ALLOWED_EXTENSIONS}"
        )

    return True


def validate_batch_upload(files, max_total_size=MAX_UPLOAD_SIZE):
    """Validate batch upload constraints - no file count limit, only total size"""

    total_size = sum(file.size for file in files if hasattr(file, "size"))
    if total_size > max_total_size:
        raise ValueError(
            f"Total batch size {total_size} exceeds maximum {max_total_size}"
        )

    return True
