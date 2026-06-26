from __future__ import annotations

import os
import json
import base64
import logging
import threading
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, messaging

from app.db.supabase import get_supabase

logger = logging.getLogger(__name__)

_fcm_initialized = False
_fcm_is_dummy = False
_fcm_lock = threading.Lock()

def _get_dummy_service_account() -> dict:
    try:
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=1024
        )
        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode("utf-8")
    except Exception:
        private_key_pem = (
            "-----BEGIN PRIVATE KEY-----\n"
            "MIICXAIBAAKBgQDC7V/r5bH6uQ41p2w8gD9J8c9s+E0lBv9sXn9s2E9sXn9sXn9s\n"
            "-----END PRIVATE KEY-----\n"
        )

    return {
        "type": "service_account",
        "project_id": "poornimacms",
        "private_key_id": "dummy_local_key",
        "private_key": private_key_pem,
        "client_email": "firebase-adminsdk-dummy@poornimacms.iam.gserviceaccount.com",
        "client_id": "1234567890",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-dummy%40poornimacms.iam.gserviceaccount.com"
    }

def init_fcm() -> bool:
    global _fcm_initialized, _fcm_is_dummy
    if _fcm_initialized:
        return True

    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_dir))
    dotenv_path = os.path.join(backend_dir, ".env")
    load_dotenv(dotenv_path, override=True)

    with _fcm_lock:
        if _fcm_initialized:
            return True

        service_account_info: Optional[Dict[str, Any]] = None

        # 1. Try to load from env variable FIREBASE_SERVICE_ACCOUNT_JSON
        sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if sa_json:
            try:
                # Try to base64 decode it first (common for cloud platforms)
                try:
                    decoded = base64.b64decode(sa_json).decode("utf-8")
                    service_account_info = json.loads(decoded)
                except Exception:
                    # Fallback to loading it directly as raw JSON
                    service_account_info = json.loads(sa_json)
            except Exception as e:
                logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON environment variable: {e}")

        # 2. Try individual environment variables if JSON config isn't available
        if not service_account_info:
            private_key = os.getenv("FIREBASE_PRIVATE_KEY")
            client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
            project_id = os.getenv("FIREBASE_PROJECT_ID")

            if private_key and client_email and project_id:
                # Unescape newline characters that commonly happen in env variables
                private_key_formatted = private_key.replace("\\n", "\n")
                service_account_info = {
                    "type": "service_account",
                    "project_id": project_id,
                    "private_key": private_key_formatted,
                    "client_email": client_email,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }

        # 3. Check for default json file if still no config
        if not service_account_info:
            default_path = "serviceAccountKey.json"
            if os.path.exists(default_path):
                try:
                    with open(default_path, "r") as f:
                        service_account_info = json.load(f)
                except Exception as e:
                    logger.error(f"Failed to read default serviceAccountKey.json file: {e}")

        if not service_account_info:
            logger.warning(
                "Firebase credentials (FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PRIVATE_KEY/CLIENT_EMAIL/PROJECT_ID) "
                "are not configured. Using dummy local fallback credentials for local token validation. "
                "FCM push notifications will be skipped."
            )
            _fcm_is_dummy = True
            service_account_info = _get_dummy_service_account()

        try:
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            _fcm_initialized = True
            logger.info("Firebase Admin SDK initialized successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK with credentials: {e}")
            return False


def get_tokens_for_users(user_ids: List[str]) -> List[str]:
    if not user_ids:
        return []
    try:
        supabase = get_supabase()
        resp = supabase.table("fcm_tokens").select("token").in_("user_id", user_ids).execute()
        return [item["token"] for item in (resp.data or [])]
    except Exception as e:
        logger.error(f"Error querying FCM tokens for user IDs {user_ids}: {e}")
        return []


def get_tokens_for_role(role: str) -> List[str]:
    try:
        supabase = get_supabase()
        users_resp = supabase.table("users").select("id").eq("role", role).execute()
        user_ids = [u["id"] for u in (users_resp.data or [])]
        return get_tokens_for_users(user_ids)
    except Exception as e:
        logger.error(f"Error querying FCM tokens for role {role}: {e}")
        return []


def get_all_tokens() -> List[str]:
    try:
        supabase = get_supabase()
        resp = supabase.table("fcm_tokens").select("token").execute()
        return [item["token"] for item in (resp.data or [])]
    except Exception as e:
        logger.error(f"Error querying all FCM tokens: {e}")
        return []


def send_fcm_notification(tokens: List[str], title: str, body: str, data: Optional[Dict[str, str]] = None):
    if not tokens:
        return

    if not init_fcm():
        logger.debug("FCM initialization skipped or failed. Push notification not sent.")
        return

    if _fcm_is_dummy:
        logger.info(f"FCM: Dummy mode active. Skipping push notification: '{title}' - '{body}'")
        return

    # Resolve absolute HTTPS base URL for WebpushConfig
    base_url = "https://poornimacms.vercel.app"
    try:
        from app.core.config import settings
        for origin in settings.allowed_origins_list:
            if origin.startswith("https://"):
                base_url = origin
                break
    except Exception:
        pass

    webpush_config = messaging.WebpushConfig(
        notification=messaging.WebpushNotification(
            title=title,
            body=body,
            icon=f"{base_url}/PCElogo.png",
            badge=f"{base_url}/PCElogo.png",
        ),
        fcm_options=messaging.WebpushFCMOptions(
            link=f"{base_url}/login"
        )
    )

    # Chunk tokens into maximum 500 per batch (FCM multicast API limit)
    for i in range(0, len(tokens), 500):
        chunk = tokens[i : i + 500]
        
        # Ensure data is dict of strings as required by Firebase SDK
        data_str: Dict[str, str] = {}
        if data:
            for k, v in data.items():
                data_str[k] = str(v)

        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data_str,
            webpush=webpush_config,
            tokens=chunk,
        )

        try:
            response = messaging.send_each_for_multicast(message)
            logger.info(f"FCM: Sent to {len(chunk)} tokens. Success: {response.success_count}, Failure: {response.failure_count}")
            
            # Identify invalid tokens that need to be cleaned up
            if response.failure_count > 0:
                invalid_tokens = []
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        # Common token expiry/invalid error conditions
                        if resp.exception and (
                            (hasattr(resp.exception, 'code') and str(resp.exception.code).lower() in ("invalid-argument", "invalid_argument"))
                            or "registration-token-not-registered" in str(resp.exception).lower()
                            or "not-found" in str(resp.exception).lower()
                        ):
                            invalid_tokens.append(chunk[idx])

                if invalid_tokens:
                    logger.info(f"FCM: Cleaning up {len(invalid_tokens)} invalid/expired tokens from DB.")
                    supabase = get_supabase()
                    supabase.table("fcm_tokens").delete().in_("token", invalid_tokens).execute()
        except Exception as e:
            logger.error(f"Error sending multicast FCM push notifications: {e}")


def send_fcm_notification_async(tokens: List[str], title: str, body: str, data: Optional[Dict[str, str]] = None):
    """
    Sends the push notification asynchronously in a background thread to prevent blocking API responses.
    """
    if not tokens:
        return
    thread = threading.Thread(
        target=send_fcm_notification,
        args=(tokens, title, body, data),
        daemon=True
    )
    thread.start()


# Helper routines for common workflows
def notify_users(user_ids: List[str], title: str, body: str, data: Optional[Dict[str, str]] = None):
    if user_ids:
        try:
            supabase = get_supabase()
            inserts = [{"user_id": uid, "title": title, "message": body} for uid in user_ids]
            supabase.table("notifications").insert(inserts).execute()
        except Exception as e:
            logger.error(f"Error inserting DB notifications for users {user_ids}: {e}")

    tokens = get_tokens_for_users(user_ids)
    if tokens:
        send_fcm_notification_async(tokens, title, body, data)


def notify_role(role: str, title: str, body: str, data: Optional[Dict[str, str]] = None):
    try:
        supabase = get_supabase()
        # Find user IDs with this role
        users_resp = supabase.table("users").select("id").eq("role", role).execute()
        user_ids = [u["id"] for u in (users_resp.data or [])]
        if user_ids:
            inserts = [{"user_id": uid, "title": title, "message": body} for uid in user_ids]
            supabase.table("notifications").insert(inserts).execute()
    except Exception as e:
        logger.error(f"Error inserting DB notifications for role {role}: {e}")

    tokens = get_tokens_for_role(role)
    if tokens:
        send_fcm_notification_async(tokens, title, body, data)


def notify_all(title: str, body: str, data: Optional[Dict[str, str]] = None):
    try:
        supabase = get_supabase()
        # Find all active users
        users_resp = supabase.table("users").select("id").eq("is_active", True).execute()
        user_ids = [u["id"] for u in (users_resp.data or [])]
        if user_ids:
            inserts = [{"user_id": uid, "title": title, "message": body} for uid in user_ids]
            supabase.table("notifications").insert(inserts).execute()
    except Exception as e:
        logger.error(f"Error inserting DB notifications for all users: {e}")

    tokens = get_all_tokens()
    if tokens:
        send_fcm_notification_async(tokens, title, body, data)
