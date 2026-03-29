import httpx
from fastapi import APIRouter, HTTPException

from app.models.schemas import CopilotRequest, CopilotResponse
from app.services.llm_service import generate_copilot_answer

router = APIRouter()


@router.post("/copilot", response_model=CopilotResponse)
async def farm_copilot(req: CopilotRequest):
    try:
        answer = await generate_copilot_answer(req.question, req.locale)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Copilot request failed: {e!s}",
        ) from e
    if not answer:
        raise HTTPException(status_code=503, detail="Empty copilot response.")
    return CopilotResponse(answer=answer)
