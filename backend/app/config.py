from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TrustStack API"
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = ""

    database_url: str = "sqlite:///./truststack.db"
    chroma_persist_dir: str = "./data/chroma"
    upload_dir: str = "./data/uploads"
    max_upload_size_mb: int = 20
    allowed_extensions: str = ".pdf,.docx,.txt,.md"

    embedding_provider: str = "ollama"
    embedding_model: str = "nomic-embed-text"

    llm_provider: str = "ollama"
    llm_model: str = "qwen2.5:7b-instruct"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    ollama_base_url: str = "http://localhost:11434"

    top_k: int = 5
    max_context_chunks: int = 5
    min_retrieval_score: float = 0.30
    weak_retrieval_score: float = 0.45

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    def ensure_dirs(self) -> None:
        Path(self.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
        Path(self.upload_dir).mkdir(parents=True, exist_ok=True)

    @property
    def allowed_extension_set(self) -> set[str]:
        return {ext.strip().lower() for ext in self.allowed_extensions.split(",") if ext.strip()}


settings = Settings()
settings.ensure_dirs()
