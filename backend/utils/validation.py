from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, EmailStr, Field, ValidationError as PydanticValidationError, conint

from .error_handler import ValidationError
#!/usr/bin/env python3
"""Request schema validation helpers using Pydantic.

Provides lightweight request validation utilities for Flask routes.
"""

class ReviewCreateSchema(BaseModel):
    restaurantId: conint(gt=0)  # type: ignore
    rating: conint(ge=1, le=5)  # type: ignore
    content: str = Field(min_length=1)
    userId: Optional[str] = None
    userName: Optional[str] = None
    userEmail: Optional[EmailStr] = None
    title: Optional[str] = None
    images: Optional[list[str]] = None


def validate_payload(schema: type[BaseModel], data: Dict[str, Any]) -> BaseModel:
    """Validate payload with a Pydantic schema and raise app ValidationError on failure."""
    try:
        return schema.model_validate(data)
    except PydanticValidationError as exc:
        # Convert to our standardized ValidationError
        errors = []
        for e in exc.errors():
            loc = '.'.join([str(x) for x in e.get('loc', [])])
            msg = e.get('msg', 'Invalid value')
            errors.append(f"{loc}: {msg}" if loc else msg)
        raise ValidationError("Validation failed", {"validation_errors": errors})


