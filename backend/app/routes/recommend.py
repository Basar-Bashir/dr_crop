import asyncio

from fastapi import APIRouter, HTTPException

from app.models.schemas import RecommendRequest, RecommendResponse
from app.services.exa_service import search_agriculture_context
from app.services.llm_service import generate_recommendation
from app.services.open_meteo_service import (
    fetch_air_quality,
    fetch_field_conditions,
    format_agro_context_for_llm,
    format_air_quality_for_llm,
)

router = APIRouter()


@router.post("/recommend", response_model=RecommendResponse)
async def get_recommendation(req: RecommendRequest):
    context = await search_agriculture_context(req.disease, req.crop)

    field_conditions = None
    air_quality = None
    agro_text = ""
    air_text = ""

    if req.latitude is not None and req.longitude is not None:
        field_conditions, air_quality = await asyncio.gather(
            fetch_field_conditions(req.latitude, req.longitude),
            fetch_air_quality(req.latitude, req.longitude),
        )
        if field_conditions is not None:
            agro_text = format_agro_context_for_llm(field_conditions)
        if air_quality is not None:
            air_text = format_air_quality_for_llm(air_quality)

    blocks: list[str] = []
    if agro_text.strip():
        blocks.append("Field weather & soil (model estimates):\n" + agro_text)
    if air_text.strip():
        blocks.append("Live air quality (model estimates):\n" + air_text)
    field_context = "\n\n".join(blocks)

    try:
        rec = await generate_recommendation(
            context, req.disease, req.crop, field_context, air_quality
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    return RecommendResponse(
        field_conditions=field_conditions,
        air_quality=air_quality,
        **rec,
    )
