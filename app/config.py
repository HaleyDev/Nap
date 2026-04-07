from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_title: str = "Metis Gastronomy Terminal"
    db_user: str = Field(default="xpeng", alias="DB_USER")
    db_password: str = Field(default="123456", alias="DB_PASSWORD")
    db_host: str = Field(default="10.99.65.75", alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_name: str = Field(default="metis", alias="DB_NAME")
    db_async_url: str | None = Field(default=None, alias="DB_ASYNC_URL")
    upload_max_bytes: int = Field(default=5 * 1024 * 1024, alias="UPLOAD_MAX_BYTES")
    wish_weight_5: int = Field(default=2, alias="WISH_WEIGHT_5")
    wish_weight_4: int = Field(default=10, alias="WISH_WEIGHT_4")
    wish_weight_3: int = Field(default=88, alias="WISH_WEIGHT_3")

    @model_validator(mode="after")
    def validate_wish_weights(self) -> "Settings":
        weights = [self.wish_weight_5, self.wish_weight_4, self.wish_weight_3]
        if any(weight < 0 for weight in weights):
            raise ValueError("抽奖权重不能为负数")
        if sum(weights) <= 0:
            raise ValueError("抽奖权重总和必须大于 0")
        return self

    @property
    def database_url(self) -> str:
        if self.db_async_url:
            return self.db_async_url
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}@"
            f"{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def upload_dir(self) -> Path:
        return Path(__file__).resolve().parent / "static" / "uploads"

    @property
    def rarity_weights(self) -> dict[int, int]:
        return {
            5: self.wish_weight_5,
            4: self.wish_weight_4,
            3: self.wish_weight_3,
        }

    @property
    def rarity_percentages(self) -> dict[int, float]:
        total = sum(self.rarity_weights.values())
        return {
            rarity: round(weight * 100 / total, 1)
            for rarity, weight in self.rarity_weights.items()
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
