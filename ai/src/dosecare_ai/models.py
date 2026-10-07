from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re


class Medicine(BaseModel):
    name: str = Field(min_length=1)
    dose: str = Field(min_length=1)
    times: list[str] = Field(min_length=1)
    days: int = Field(gt=0)
    instructions: Optional[str] = None
    unclear: bool = False

    @field_validator("times")
    @classmethod
    def validate_times(cls, times: list[str]) -> list[str]:
        for time in times:
            if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", time):
                raise ValueError(f"Invalid time format: {time}")
        return times


class Extraction(BaseModel):
    medicines: list[Medicine]
    warnings: list[str] = Field(default_factory=list)