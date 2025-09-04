from celery import Celery
import os
from .ai_service import RealAIService
from .database import SessionLocal, Study
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    "pacs_tasks",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379"),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task
def process_dicom_study_async(study_id: int):
    """Process DICOM study with AI analysis in background"""
    db = SessionLocal()
    try:
        study = db.query(Study).filter(Study.id == study_id).first()
        if not study:
            logger.error(f"Study {study_id} not found")
            return

        ai_service = RealAIService()
        ai_report = ai_service.analyze_study(study_id)

        study.ai_report = ai_report
        db.commit()

        logger.info(f"AI analysis completed for study {study_id}")

    except Exception as e:
        logger.error(f"Error processing study {study_id}: {e}")
        db.rollback()
    finally:
        db.close()


@celery_app.task
def cleanup_old_sessions():
    """Clean up expired sessions and temporary files"""
    pass
