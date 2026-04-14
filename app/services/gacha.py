from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from random import Random

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Recipe


randomizer = Random()
settings = get_settings()


def _match_keyword(recipe: Recipe, keyword: str) -> bool:
    kw = keyword.lower()
    if any(kw in ingredient.lower() for ingredient in (recipe.ingredients or [])):
        return True
    if any(kw in tag.lower() for tag in (recipe.keywords or [])):
        return True
    return False


def _pick_weighted_rarity(available: dict[int, list[Recipe]], allowed: set[int] | None = None) -> int:
    rarity_candidates = [
        rarity for rarity, recipes in available.items() if recipes and (allowed is None or rarity in allowed)
    ]
    if not rarity_candidates:
        raise ValueError("没有可用于抽取的食谱")

    rarity_weights = settings.rarity_weights
    total_weight = sum(rarity_weights[rarity] for rarity in rarity_candidates)
    hit = randomizer.uniform(0, total_weight)
    cursor = 0.0
    for rarity in sorted(rarity_candidates, reverse=True):
        cursor += rarity_weights[rarity]
        if hit <= cursor:
            return rarity
    return rarity_candidates[-1]


def _pick_recipe(available: dict[int, list[Recipe]], allowed: set[int] | None = None) -> Recipe:
    rarity = _pick_weighted_rarity(available, allowed=allowed)
    return randomizer.choice(available[rarity])


async def wish_recipes(
    session: AsyncSession,
    count: int,
    category: str | None = None,
    keyword: str | None = None,
) -> list[Recipe]:
    statement = select(Recipe)
    if category:
        statement = statement.where(Recipe.category == category)

    result = await session.execute(statement)
    recipes = list(result.scalars().all())

    if keyword:
        recipes = [r for r in recipes if _match_keyword(r, keyword)]

    if not recipes:
        return []

    available: dict[int, list[Recipe]] = defaultdict(list)
    for recipe in recipes:
        available[recipe.rarity].append(recipe)

    drawn = [_pick_recipe(available) for _ in range(count)]

    high_rarity_pool = {4, 5}
    if count >= 10 and all(recipe.rarity < 4 for recipe in drawn):
        if any(available.get(rarity) for rarity in high_rarity_pool):
            drawn[-1] = _pick_recipe(available, allowed=high_rarity_pool)

    now = datetime.now(timezone.utc)
    drawn_ids = [recipe.id for recipe in drawn]
    await session.execute(
        update(Recipe)
        .where(Recipe.id.in_(drawn_ids))
        .values(last_cooked=now)
    )
    await session.commit()

    for recipe in drawn:
        recipe.last_cooked = now

    return drawn


async def recommend_per_category(session: AsyncSession) -> list[Recipe]:
    result = await session.execute(select(Recipe))
    recipes = list(result.scalars().all())
    if not recipes:
        return []

    by_category: dict[str, list[Recipe]] = defaultdict(list)
    for recipe in recipes:
        by_category[recipe.category].append(recipe)

    picks: list[Recipe] = []
    for _category, group in sorted(by_category.items()):
        picks.append(randomizer.choice(group))
    return picks
