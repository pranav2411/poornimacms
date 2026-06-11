from typing import Any, Dict, Union
from httpx import Timeout
from postgrest._sync.client import SyncPostgrestClient
from postgrest._async.client import AsyncPostgrestClient
from postgrest.utils import SyncClient, AsyncClient

# Monkeypatch SyncPostgrestClient to disable HTTP/2 to avoid RemoteProtocolError connection drops
def sync_create_session(
    self,
    base_url: str,
    headers: Dict[str, str],
    timeout: Union[int, float, Timeout],
    verify: bool = True,
) -> SyncClient:
    return SyncClient(
        base_url=base_url,
        headers=headers,
        timeout=timeout,
        verify=verify,
        follow_redirects=True,
        http2=False,
    )

SyncPostgrestClient.create_session = sync_create_session

# Monkeypatch AsyncPostgrestClient to disable HTTP/2 to avoid RemoteProtocolError connection drops
def async_create_session(
    self,
    base_url: str,
    headers: Dict[str, str],
    timeout: Union[int, float, Timeout],
    verify: bool = True,
) -> AsyncClient:
    return AsyncClient(
        base_url=base_url,
        headers=headers,
        timeout=timeout,
        verify=verify,
        follow_redirects=True,
        http2=False,
    )

AsyncPostgrestClient.create_session = async_create_session

from supabase import Client, create_client

from app.core.config import settings

_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _supabase

