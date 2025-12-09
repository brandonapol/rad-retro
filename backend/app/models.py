from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


CategoryType = Literal["well", "badly", "continue", "kudos", "actionables"]


class CreateCardRequest(BaseModel):
    category: CategoryType
    content: str = Field(..., min_length=1)
    author: str = Field(..., min_length=1)


class UpdateCardRequest(BaseModel):
    content: Optional[str] = None
    completed: Optional[bool] = None


class Card(BaseModel):
    id: int
    session_id: str
    category: CategoryType
    content: str
    author: str
    created_at: datetime
    completed: Optional[bool] = None


class Session(BaseModel):
    session_id: str
    created_at: datetime


class SessionResponse(BaseModel):
    session: Session
    cards: list[Card]


class CreateSessionResponse(BaseModel):
    session_id: str
