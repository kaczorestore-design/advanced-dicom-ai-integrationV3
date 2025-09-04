import secrets
import string
from typing import Set
from sqlalchemy.orm import Session
from .database import Study


def generate_study_id(db: Session = None) -> str:
    """
    Generate a unique 8-digit alphanumeric study ID.
    Format: XXXXXXXX (8 characters, uppercase letters and digits)
    """
    # Define character set: uppercase letters and digits
    characters = string.ascii_uppercase + string.digits
    
    max_attempts = 100  # Prevent infinite loop
    attempts = 0
    
    while attempts < max_attempts:
        # Generate 8-character alphanumeric ID
        study_id = ''.join(secrets.choice(characters) for _ in range(8))
        
        # If no database session provided, return the generated ID
        if db is None:
            return study_id
            
        # Check if ID already exists in database
        existing_study = db.query(Study).filter(Study.id == study_id).first()
        if not existing_study:
            return study_id
            
        attempts += 1
    
    # Fallback if all attempts failed (very unlikely)
    raise RuntimeError("Failed to generate unique study ID after maximum attempts")


def validate_study_id(study_id: str) -> bool:
    """
    Validate that a study ID follows the correct format.
    Must be exactly 8 characters, containing only uppercase letters and digits.
    """
    if not isinstance(study_id, str):
        return False
        
    if len(study_id) != 8:
        return False
        
    # Check if all characters are uppercase letters or digits
    allowed_chars = set(string.ascii_uppercase + string.digits)
    return all(char in allowed_chars for char in study_id)