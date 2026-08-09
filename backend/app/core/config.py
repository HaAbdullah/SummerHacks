from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "SummerHacks API"
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = "/api"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS — comma-separated origins in env, e.g. http://localhost:3000
    cors_origins: str = "http://localhost:3000"

    # Supabase. Leave blank and the app falls back to the local JSON store, so it runs
    # with no setup. Set both and it switches to Postgres — no code change.
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_bucket: str = "community-media"

    # LangChain comparison orchestrator. The model only selects deterministic tools;
    # comparison, mutation, pricing, and validation remain application code.
    ai_api_key: str = ""
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = "gpt-4o-mini"
    ai_timeout_seconds: float = 20.0
    compare_agent_recursion_limit: int = 20

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def use_supabase(self) -> bool:
        return bool(self.supabase_url.strip() and self.supabase_service_key.strip())

    @property
    def storage_backend(self) -> str:
        return "supabase" if self.use_supabase else "json"


settings = Settings()
