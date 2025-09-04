from datetime import datetime, timedelta
from typing import Dict, Optional, Set
import secrets
import time
from sqlalchemy.orm import Session
from .database import User, get_db


class SessionManager:
    """Manages user sessions and token blacklisting"""

    def __init__(self):
        self.active_sessions: Dict[str, Dict] = {}  # user_id -> session_info
        self.blacklisted_tokens: Set[str] = set()
        self.session_cleanup_interval = 3600  # 1 hour
        self.last_cleanup = time.time()

    def create_session(
        self, user_id: int, token: str, ip_address: str, user_agent: str
    ) -> str:
        """Create a new session for user"""
        session_id = secrets.token_urlsafe(32)

        session_info = {
            "session_id": session_id,
            "user_id": user_id,
            "token": token,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "is_active": True,
        }

        # Store session by user_id (allow multiple sessions per user)
        if user_id not in self.active_sessions:
            self.active_sessions[user_id] = {}

        self.active_sessions[user_id][session_id] = session_info
        return session_id

    def validate_session(self, user_id: int, session_id: str, token: str) -> bool:
        """Validate if session is active and token is not blacklisted"""
        if token in self.blacklisted_tokens:
            return False

        if user_id not in self.active_sessions:
            return False

        if session_id not in self.active_sessions[user_id]:
            return False

        session = self.active_sessions[user_id][session_id]
        if not session["is_active"]:
            return False

        # Update last activity
        session["last_activity"] = datetime.utcnow()
        return True

    def invalidate_session(self, user_id: int, session_id: str):
        """Invalidate a specific session"""
        if (
            user_id in self.active_sessions
            and session_id in self.active_sessions[user_id]
        ):
            session = self.active_sessions[user_id][session_id]
            session["is_active"] = False
            # Add token to blacklist
            self.blacklisted_tokens.add(session["token"])

    def invalidate_all_user_sessions(self, user_id: int):
        """Invalidate all sessions for a user"""
        if user_id in self.active_sessions:
            for session_id, session in self.active_sessions[user_id].items():
                session["is_active"] = False
                self.blacklisted_tokens.add(session["token"])

    def cleanup_expired_sessions(self):
        """Remove expired sessions and tokens"""
        current_time = time.time()
        if current_time - self.last_cleanup < self.session_cleanup_interval:
            return

        cutoff_time = datetime.utcnow() - timedelta(
            hours=24
        )  # Remove sessions older than 24 hours

        for user_id in list(self.active_sessions.keys()):
            sessions_to_remove = []
            for session_id, session in self.active_sessions[user_id].items():
                if session["last_activity"] < cutoff_time:
                    sessions_to_remove.append(session_id)
                    self.blacklisted_tokens.add(session["token"])

            for session_id in sessions_to_remove:
                del self.active_sessions[user_id][session_id]

            # Remove user entry if no sessions left
            if not self.active_sessions[user_id]:
                del self.active_sessions[user_id]

        self.last_cleanup = current_time

    def get_user_sessions(self, user_id: int) -> list:
        """Get all active sessions for a user"""
        if user_id not in self.active_sessions:
            return []

        return [
            {
                "session_id": session_id,
                "ip_address": session["ip_address"],
                "user_agent": session["user_agent"],
                "created_at": session["created_at"],
                "last_activity": session["last_activity"],
                "is_active": session["is_active"],
            }
            for session_id, session in self.active_sessions[user_id].items()
            if session["is_active"]
        ]


# Global session manager instance
session_manager = SessionManager()
