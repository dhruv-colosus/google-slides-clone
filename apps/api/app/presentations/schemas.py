from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DeckCreate(BaseModel):
    title: str = "Untitled presentation"


class DeckRename(BaseModel):
    title: str = Field(min_length=1, max_length=512)


class DeckContentUpdate(BaseModel):
    content: dict[str, Any]
    title: str = Field(min_length=1, max_length=512)


class DeckSetPublic(BaseModel):
    is_public: bool


class DeckThumbnail(BaseModel):
    """Minimal slice of a deck's content needed to render a static thumbnail.

    Carries slide-1 plus the deck-level rendering metadata so the landing page
    can preview a presentation without fetching (and deserializing) the full
    deck content for every card.
    """

    slide: dict[str, Any] | None = None
    page_width: int = 960
    page_height: int = 540
    theme_id: str = "default"


class DeckSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    is_public: bool
    created_at: datetime
    updated_at: datetime
    thumbnail: DeckThumbnail | None = None


class DeckDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: int
    title: str
    content: dict[str, Any]
    is_public: bool
    created_at: datetime
    updated_at: datetime
