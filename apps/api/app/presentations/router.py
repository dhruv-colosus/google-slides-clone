from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.presentations import service
from app.presentations.models import Deck
from app.presentations.schemas import (
    DeckContentUpdate,
    DeckCreate,
    DeckDetail,
    DeckRename,
    DeckSetPublic,
    DeckSummary,
    DeckThumbnail,
)

router = APIRouter(prefix="/presentations", tags=["presentations"])


def _build_summary(deck: Deck) -> DeckSummary:
    content = deck.content or {}
    meta = content.get("meta") or {}
    slides = content.get("slides") or []
    first_slide = slides[0] if slides else None
    thumbnail = DeckThumbnail(
        slide=first_slide if isinstance(first_slide, dict) else None,
        page_width=int(meta.get("pageWidth") or 960),
        page_height=int(meta.get("pageHeight") or 540),
        theme_id=str(meta.get("themeId") or "default"),
    )
    return DeckSummary(
        id=deck.id,
        title=deck.title,
        is_public=deck.is_public,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
        thumbnail=thumbnail,
    )


@router.post(
    "",
    response_model=DeckDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_presentation(
    payload: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await service.create_deck(db, current_user.id, payload.title)
    return DeckDetail.model_validate(deck)


@router.get("", response_model=list[DeckSummary])
async def list_presentations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DeckSummary]:
    decks = await service.list_decks(db, current_user.id)
    return [_build_summary(d) for d in decks]


@router.get("/{deck_id}", response_model=DeckDetail)
async def get_presentation(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await service.get_deck(db, deck_id, current_user.id)
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return DeckDetail.model_validate(deck)


@router.patch("/{deck_id}", response_model=DeckDetail)
async def update_presentation_content(
    deck_id: UUID,
    payload: DeckContentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await service.update_deck_content(
        db, deck_id, current_user.id, payload.content, payload.title
    )
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return DeckDetail.model_validate(deck)


@router.patch("/{deck_id}/rename", response_model=DeckSummary)
async def rename_presentation(
    deck_id: UUID,
    payload: DeckRename,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckSummary:
    deck = await service.rename_deck(db, deck_id, current_user.id, payload.title)
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return _build_summary(deck)


@router.patch("/{deck_id}/visibility", response_model=DeckSummary)
async def set_presentation_visibility(
    deck_id: UUID,
    payload: DeckSetPublic,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckSummary:
    deck = await service.set_deck_public(
        db, deck_id, current_user.id, payload.is_public
    )
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return _build_summary(deck)


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_presentation(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    deleted = await service.delete_deck(db, deck_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{deck_id}/public", response_model=DeckDetail)
async def get_public_presentation(
    deck_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await service.get_deck_public(db, deck_id)
    if deck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )
    return DeckDetail.model_validate(deck)
