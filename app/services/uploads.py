from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import anyio
from fastapi import HTTPException, UploadFile, status

from app.config import get_settings


settings = get_settings()
ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
CHUNK_SIZE = 1024 * 1024


async def save_recipe_image(file: UploadFile) -> str:
    filename = file.filename or "recipe-image"
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 JPG、PNG、WEBP 或 GIF 图片",
        )

    extension = Path(filename).suffix.lower() or ALLOWED_CONTENT_TYPES[content_type]
    if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        extension = ALLOWED_CONTENT_TYPES[content_type]

    target_dir = settings.upload_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    generated_name = f"recipe-{uuid4().hex}{extension}"
    temp_path = target_dir / f".{generated_name}.tmp"
    target_path = target_dir / generated_name

    written = 0
    try:
        async with await anyio.open_file(temp_path, "wb") as stream:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                written += len(chunk)
                if written > settings.upload_max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"图片大小不能超过 {settings.upload_max_bytes // (1024 * 1024)}MB",
                    )
                await stream.write(chunk)

        if written == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="上传文件为空")

        temp_path.replace(target_path)
    except Exception:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    return f"/static/uploads/{generated_name}"


def delete_local_recipe_image(img_url: str) -> None:
    prefix = "/static/uploads/"
    if not img_url.startswith(prefix):
        return

    file_name = Path(img_url.removeprefix(prefix)).name
    if not file_name:
        return

    target_path = settings.upload_dir / file_name
    if target_path.exists() and target_path.is_file():
        target_path.unlink(missing_ok=True)