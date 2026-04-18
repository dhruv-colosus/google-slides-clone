from typing import Any
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.presentations.models import Deck


def _blank_content(deck_id: str, title: str) -> dict[str, Any]:
    """Mirror of createMockDeck in apps/web/src/features/editor/model/mockDeck.ts.

    The editor hydrates the Y.Doc from this shape on first load.
    """
    return {
        "id": deck_id,
        "meta": {
            "title": title,
            "themeId": "default",
            "pageWidth": 960,
            "pageHeight": 540,
            "schemaVersion": 1,
        },
        "slides": [
            {
                "id": "slide-1",
                "layoutId": "title",
                "background": {"kind": "theme"},
                "elements": [
                    {
                        "id": "el-title",
                        "type": "text",
                        "x": 80,
                        "y": 170,
                        "w": 800,
                        "h": 130,
                        "z": 1,
                        "text": {
                            "align": "center",
                            "fontSize": 48,
                            "placeholder": "Click to add title",
                        },
                    },
                    {
                        "id": "el-subtitle",
                        "type": "text",
                        "x": 80,
                        "y": 330,
                        "w": 800,
                        "h": 60,
                        "z": 2,
                        "text": {
                            "align": "center",
                            "fontSize": 22,
                            "color": "#5f6368",
                            "placeholder": "Click to add subtitle",
                        },
                    },
                ],
            }
        ],
    }


async def create_deck(db: AsyncSession, owner_id: int, title: str) -> Deck:
    deck = Deck(owner_id=owner_id, title=title, content={})
    db.add(deck)
    await db.flush()
    deck.content = _blank_content(str(deck.id), title)
    await db.commit()
    await db.refresh(deck)
    return deck


async def list_decks(db: AsyncSession, owner_id: int) -> list[Deck]:
    result = await db.execute(
        select(Deck)
        .where(Deck.owner_id == owner_id)
        .order_by(Deck.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_deck(
    db: AsyncSession, deck_id: UUID, owner_id: int
) -> Deck | None:
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.owner_id == owner_id)
    )
    return result.scalar_one_or_none()


async def get_deck_public(db: AsyncSession, deck_id: UUID) -> Deck | None:
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.is_public.is_(True))
    )
    return result.scalar_one_or_none()


async def update_deck_content(
    db: AsyncSession,
    deck_id: UUID,
    owner_id: int,
    content: dict[str, Any],
    title: str,
) -> Deck | None:
    deck = await get_deck(db, deck_id, owner_id)
    if deck is None:
        return None
    deck.content = content
    deck.title = title
    await db.commit()
    await db.refresh(deck)
    return deck


async def rename_deck(
    db: AsyncSession, deck_id: UUID, owner_id: int, title: str
) -> Deck | None:
    deck = await get_deck(db, deck_id, owner_id)
    if deck is None:
        return None
    deck.title = title
    # Keep content.meta.title in sync so the hydrated editor shows the new title.
    content = dict(deck.content or {})
    meta = dict(content.get("meta") or {})
    meta["title"] = title
    content["meta"] = meta
    deck.content = content
    await db.commit()
    await db.refresh(deck)
    return deck


async def set_deck_public(
    db: AsyncSession, deck_id: UUID, owner_id: int, is_public: bool
) -> Deck | None:
    deck = await get_deck(db, deck_id, owner_id)
    if deck is None:
        return None
    deck.is_public = is_public
    await db.commit()
    await db.refresh(deck)
    return deck


async def delete_deck(
    db: AsyncSession, deck_id: UUID, owner_id: int
) -> bool:
    result = await db.execute(
        delete(Deck).where(Deck.id == deck_id, Deck.owner_id == owner_id)
    )
    await db.commit()
    return (result.rowcount or 0) > 0
