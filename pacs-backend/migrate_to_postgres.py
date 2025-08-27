import sqlite3
import psycopg2
from sqlalchemy import create_engine
from app.database import Base
import os

def migrate_sqlite_to_postgres():
    """Migrate data from SQLite to PostgreSQL"""
    
    postgres_url = os.getenv("DATABASE_URL", "postgresql://pacs_user:pacs_password@localhost:5432/pacs_db")
    engine = create_engine(postgres_url)
    Base.metadata.create_all(bind=engine)
    
    sqlite_conn = sqlite3.connect("pacs.db")
    sqlite_conn.row_factory = sqlite3.Row
    
    postgres_conn = psycopg2.connect(postgres_url)
    postgres_cur = postgres_conn.cursor()
    
    tables = ['diagnostic_centers', 'users', 'patients', 'studies', 'dicom_files', 'annotations']
    
    for table in tables:
        print(f"Migrating {table}...")
        sqlite_cur = sqlite_conn.execute(f"SELECT * FROM {table}")
        rows = sqlite_cur.fetchall()
        
        if rows:
            columns = [description[0] for description in sqlite_cur.description]
            placeholders = ','.join(['%s'] * len(columns))
            
            insert_sql = f"INSERT INTO {table} ({','.join(columns)}) VALUES ({placeholders})"
            
            for row in rows:
                postgres_cur.execute(insert_sql, tuple(row))
    
    postgres_conn.commit()
    postgres_conn.close()
    sqlite_conn.close()
    
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate_sqlite_to_postgres()
