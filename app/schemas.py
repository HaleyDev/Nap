from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


VALID_CATEGORIES = {"荤菜", "素菜", "汤", "主食"}
VALID_RARITIES = {3, 4, 5}


def _normalize_text_list(value: list[str], field_name: str) -> list[str]:
    cleaned = [item.strip() for item in value if item and item.strip()]
    if not cleaned:
        raise ValueError(f"{field_name} 不能为空")
    return cleaned


def _normalize_optional_text_list(value: list[str]) -> list[str]:
    return [item.strip() for item in value if item and item.strip()]


class RecipeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str
    rarity: int
    img_url: str = Field(min_length=1)
    keywords: list[str] = Field(default_factory=list)
    ingredients: list[str]

    @field_validator("name", "img_url")
    @classmethod
    def validate_non_empty_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("字段不能为空")
        return cleaned

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        cleaned = value.strip()
        if cleaned not in VALID_CATEGORIES:
            raise ValueError(f"category 必须是 {sorted(VALID_CATEGORIES)} 之一")
        return cleaned

    @field_validator("rarity")
    @classmethod
    def validate_rarity(cls, value: int) -> int:
        if value not in VALID_RARITIES:
            raise ValueError("rarity 只能是 3、4 或 5")
        return value

    @field_validator("keywords")
    @classmethod
    def validate_keywords(cls, value: list[str]) -> list[str]:
        return _normalize_optional_text_list(value)

    @field_validator("ingredients")
    @classmethod
    def validate_ingredients(cls, value: list[str]) -> list[str]:
        return _normalize_text_list(value, "ingredients")


class RecipeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    rarity: int
    img_url: str
    keywords: list[str]
    ingredients: list[str]
    last_cooked: datetime | None


class RecipeBatchImport(BaseModel):
    recipes: list[RecipeCreate]


class ImageUploadResponse(BaseModel):
    img_url: str
    original_filename: str
