from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List

app = FastAPI(title="Job Worker Service", version="0.1.0")


class MatchRequest(BaseModel):
    resume_text: str = Field(min_length=1)
    job_description: str = Field(min_length=1)


class MatchResponse(BaseModel):
    fit_score: int
    missing_keywords: List[str]
    reasons: List[str]


@app.get("/health")
def health():
    return {"status": "ok", "service": "worker"}


@app.post("/score", response_model=MatchResponse)
def score_match(payload: MatchRequest):
    resume_tokens = set(payload.resume_text.lower().split())
    job_tokens = [token for token in payload.job_description.lower().split() if len(token) > 2]
    unique_job_tokens = list(dict.fromkeys(job_tokens))[:30]

    matched = [token for token in unique_job_tokens if token in resume_tokens]
    missing = [token for token in unique_job_tokens if token not in resume_tokens][:12]

    fit = int((len(matched) / max(1, len(unique_job_tokens))) * 100)

    return MatchResponse(
        fit_score=fit,
        missing_keywords=missing,
        reasons=[
            f"Matched {len(matched)} keywords from {len(unique_job_tokens)} role keywords",
            "Worker scoring endpoint is active"
        ]
    )
