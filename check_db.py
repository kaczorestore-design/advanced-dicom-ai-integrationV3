import sqlite3

try:
    conn = sqlite3.connect('pacs.db')
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print('Tables:', tables)
    
    # Check studies count
    cursor.execute('SELECT COUNT(*) FROM studies;')
    study_count = cursor.fetchone()[0]
    print(f'Studies count: {study_count}')
    
    # Check DICOM files count
    cursor.execute('SELECT COUNT(*) FROM dicom_files;')
    file_count = cursor.fetchone()[0]
    print(f'DICOM files count: {file_count}')
    
    # Show some sample data if exists
    if study_count > 0:
        cursor.execute('SELECT id, patient_id, study_description FROM studies LIMIT 3;')
        studies = cursor.fetchall()
        print('Sample studies:', studies)
    
    if file_count > 0:
        cursor.execute('SELECT id, study_id, file_path FROM dicom_files LIMIT 3;')
        files = cursor.fetchall()
        print('Sample DICOM files:', files)
    
    conn.close()
except Exception as e:
    print(f'Error: {e}')