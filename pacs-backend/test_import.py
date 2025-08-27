try:
    from app import schemas
    print("Schemas import successful")
    print(f"Available schemas: {dir(schemas)}")
except ImportError as e:
    print(f"Import error: {e}")
