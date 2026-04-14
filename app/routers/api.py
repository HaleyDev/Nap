from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Recipe
from app.schemas import (
    ImageUploadResponse,
    RecipeBatchImport,
    RecipeCreate,
    RecipeRead,
    VALID_CATEGORIES,
)
from app.services.gacha import recommend_per_category, wish_recipes
from app.services.uploads import delete_local_recipe_image, save_recipe_image


router = APIRouter(prefix="/api/v1", tags=["recipes"])


@router.post("/uploads/recipe-image", response_model=ImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_recipe_image(file: UploadFile = File(...)) -> ImageUploadResponse:
    img_url = await save_recipe_image(file)
    return ImageUploadResponse(img_url=img_url, original_filename=file.filename or "")


@router.get("/wish", response_model=list[RecipeRead])
async def get_wish_result(
    count: int = Query(..., ge=1, le=50, description="抽取次数"),
    category: str | None = Query(default=None, description="按菜品分类抽取"),
    keyword: str | None = Query(default=None, description="按关键字筛选（匹配食材和关键描述词）"),
    session: AsyncSession = Depends(get_session),
) -> list[RecipeRead]:
    normalized_category = category.strip() if category else None
    normalized_keyword = keyword.strip() if keyword else None
    if normalized_category and normalized_category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"category 必须是 {sorted(VALID_CATEGORIES)} 之一",
        )

    results = await wish_recipes(
        session, count=count, category=normalized_category, keyword=normalized_keyword,
    )
    if not results:
        if normalized_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"当前分类"{normalized_category}"还没有可抽取的菜谱",
            )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="当前没有可抽取的食谱，请先录入数据")
    return [RecipeRead.model_validate(item) for item in results]


@router.get("/recommend", response_model=list[RecipeRead])
async def get_recommendation(session: AsyncSession = Depends(get_session)) -> list[RecipeRead]:
    results = await recommend_per_category(session)
    return [RecipeRead.model_validate(item) for item in results]


@router.post("/recipes", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    payload: RecipeCreate,
    session: AsyncSession = Depends(get_session),
) -> RecipeRead:
    recipe = Recipe(**payload.model_dump())
    session.add(recipe)
    await session.commit()
    await session.refresh(recipe)
    return RecipeRead.model_validate(recipe)


@router.post("/recipes/batch", response_model=list[RecipeRead], status_code=status.HTTP_201_CREATED)
async def batch_import_recipes(
    payload: RecipeBatchImport,
    session: AsyncSession = Depends(get_session),
) -> list[RecipeRead]:
    created: list[Recipe] = []
    for item in payload.recipes:
        recipe = Recipe(**item.model_dump())
        session.add(recipe)
        created.append(recipe)
    await session.commit()
    for recipe in created:
        await session.refresh(recipe)
    return [RecipeRead.model_validate(recipe) for recipe in created]


@router.put("/recipes/{recipe_id}", response_model=RecipeRead)
async def update_recipe(
    recipe_id: int,
    payload: RecipeCreate,
    session: AsyncSession = Depends(get_session),
) -> RecipeRead:
    recipe = await session.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="食谱不存在")

    previous_img_url = recipe.img_url
    for field_name, field_value in payload.model_dump().items():
        setattr(recipe, field_name, field_value)

    await session.commit()
    await session.refresh(recipe)

    if previous_img_url != recipe.img_url:
        delete_local_recipe_image(previous_img_url)

    return RecipeRead.model_validate(recipe)


@router.get("/recipes", response_model=list[RecipeRead])
async def list_recipes(session: AsyncSession = Depends(get_session)) -> list[RecipeRead]:
    result = await session.execute(select(Recipe).order_by(Recipe.rarity.desc(), Recipe.name.asc()))
    recipes = result.scalars().all()
    return [RecipeRead.model_validate(recipe) for recipe in recipes]


@router.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(recipe_id: int, session: AsyncSession = Depends(get_session)) -> None:
    recipe = await session.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="食谱不存在")

    img_url = recipe.img_url
    await session.delete(recipe)
    await session.commit()
    delete_local_recipe_image(img_url)
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Recipe
from app.schemas import ImageUploadResponse, RecipeCreate, RecipeRead, VALID_CATEGORIES
from app.services.gacha import wish_recipes
from app.services.uploads import delete_local_recipe_image, save_recipe_image


router = APIRouter(prefix="/api/v1", tags=["recipes"])


@router.post("/uploads/recipe-image", response_model=ImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_recipe_image(file: UploadFile = File(...)) -> ImageUploadResponse:
    img_url = await save_recipe_image(file)
    return ImageUploadResponse(img_url=img_url, original_filename=file.filename or "")


@router.get("/wish", response_model=list[RecipeRead])
async def get_wish_result(
    count: int = Query(..., ge=1, le=10, description="抽取次数，建议使用 1 或 10"),
    category: str | None = Query(default=None, description="按菜品分类抽取，可选：荤菜、素菜、汤、主食"),
    session: AsyncSession = Depends(get_session),
) -> list[RecipeRead]:
    normalized_category = category.strip() if category else None
    if normalized_category and normalized_category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"category 必须是 {sorted(VALID_CATEGORIES)} 之一",
        )

    results = await wish_recipes(session, count=count, category=normalized_category)
    if not results:
        if normalized_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"当前分类“{normalized_category}”还没有可抽取的菜谱",
            )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="当前没有可抽取的食谱，请先录入数据")
    return [RecipeRead.model_validate(item) for item in results]


@router.post("/recipes", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    payload: RecipeCreate,
    session: AsyncSession = Depends(get_session),
) -> RecipeRead:
    recipe = Recipe(**payload.model_dump())
    session.add(recipe)
    await session.commit()
    await session.refresh(recipe)
    return RecipeRead.model_validate(recipe)


@router.put("/recipes/{recipe_id}", response_model=RecipeRead)
async def update_recipe(
    recipe_id: int,
    payload: RecipeCreate,
    session: AsyncSession = Depends(get_session),
) -> RecipeRead:
    recipe = await session.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="食谱不存在")

    previous_img_url = recipe.img_url
    for field_name, field_value in payload.model_dump().items():
        setattr(recipe, field_name, field_value)

    await session.commit()
    await session.refresh(recipe)

    if previous_img_url != recipe.img_url:
        delete_local_recipe_image(previous_img_url)

    return RecipeRead.model_validate(recipe)


@router.get("/recipes", response_model=list[RecipeRead])
async def list_recipes(session: AsyncSession = Depends(get_session)) -> list[RecipeRead]:
    result = await session.execute(select(Recipe).order_by(Recipe.rarity.desc(), Recipe.name.asc()))
    recipes = result.scalars().all()
    return [RecipeRead.model_validate(recipe) for recipe in recipes]


@router.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(recipe_id: int, session: AsyncSession = Depends(get_session)) -> None:
    recipe = await session.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="食谱不存在")

    img_url = recipe.img_url
    await session.delete(recipe)
    await session.commit()
    delete_local_recipe_image(img_url)
