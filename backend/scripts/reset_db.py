from __future__ import annotations

import os
from pathlib import Path

import psycopg2


def load_schema() -> str:
    schema_path = Path(__file__).resolve().parents[1] / "supabase" / "schema.sql"
    return schema_path.read_text(encoding="utf-8")


def get_db_url() -> str:
    database_url = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("Set SUPABASE_DATABASE_URL or DATABASE_URL to your Supabase Postgres connection string.")
    return database_url


def main() -> None:
    schema_sql = load_schema()
    connection = psycopg2.connect(get_db_url())
    connection.autocommit = True

    with connection.cursor() as cursor:
        cursor.execute("""
            DO $$
            DECLARE
                record_name text;
            BEGIN
                FOR record_name IN
                    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
                LOOP
                    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(record_name) || ' CASCADE';
                END LOOP;
            END $$;
        """)
        cursor.execute(schema_sql)

    connection.close()
    print("Database reset and recreated from backend/supabase/schema.sql")


if __name__ == "__main__":
    main()