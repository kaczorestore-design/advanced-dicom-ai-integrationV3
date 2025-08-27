from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi import Response
import time
from functools import wraps

REQUEST_COUNT = Counter('pacs_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('pacs_request_duration_seconds', 'Request duration')
ACTIVE_USERS = Gauge('pacs_active_users', 'Number of active users')
DICOM_UPLOADS = Counter('pacs_dicom_uploads_total', 'Total DICOM uploads')
DICOM_PROCESSING_TIME = Histogram('pacs_dicom_processing_seconds', 'DICOM processing time')
AI_ANALYSIS_COUNT = Counter('pacs_ai_analysis_total', 'Total AI analyses', ['status'])
STORAGE_USAGE = Gauge('pacs_storage_bytes', 'Storage usage in bytes')

def monitor_endpoint(func):
    """Decorator to monitor endpoint performance"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            REQUEST_COUNT.labels(method='POST', endpoint=func.__name__, status='success').inc()
            return result
        except Exception as e:
            REQUEST_COUNT.labels(method='POST', endpoint=func.__name__, status='error').inc()
            raise
        finally:
            REQUEST_DURATION.observe(time.time() - start_time)
    return wrapper

def get_metrics():
    """Get Prometheus metrics"""
    return Response(generate_latest(), media_type="text/plain")
