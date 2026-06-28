from __future__ import annotations
from typing import Any

def generate_prefixed_no(supabase: Any, org_id: str, org_code: str, entity_type: str) -> str:
    """
    Calls the get_next_sequence stored function on Supabase RPC and returns
    the formatted identifier (e.g. 'PCE-USR-0001').
    """
    response = supabase.rpc("get_next_sequence", {
        "p_org_id": org_id,
        "p_entity_type": entity_type
    }).execute()
    
    # RPC returns the integer sequence value
    val = response.data if response.data is not None else 1
    
    # Uppercase code and entity type
    org_code_clean = str(org_code).strip().upper()
    entity_type_clean = str(entity_type).strip().upper()
    
    return f"{org_code_clean}-{entity_type_clean}-{val:04d}"
