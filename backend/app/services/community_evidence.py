"""Normalize target-node posts and replies for build-guide synthesis."""

from __future__ import annotations

from collections.abc import Iterable

from app.core.config import settings
from app.models.schemas import (
    CommunityEvidence,
    CommunityObservation,
    CommunityPost,
)
from app.services import community_service

_TYPE_MAP = {
    "text": "note",
    "image": "image",
    "sketch": "drawing",
    "voice": "voice",
    "video": "video",
    "blueprint": "blueprint",
}


def filter_observations(
    observations: Iterable[CommunityObservation | dict],
) -> list[CommunityObservation]:
    """Apply the one confidence threshold used by all visual build evidence."""
    accepted: list[CommunityObservation] = []
    for raw in observations:
        observation = (
            raw
            if isinstance(raw, CommunityObservation)
            else CommunityObservation.model_validate(raw)
        )
        if observation.confidence >= settings.build_guide_evidence_confidence_threshold:
            accepted.append(observation)
    return accepted


def normalize_post(
    post: CommunityPost,
    observations: Iterable[CommunityObservation | dict] = (),
) -> CommunityEvidence:
    """Convert one stored post without leaking placeholder transcription text."""
    text = post.body.strip() or None
    if not post.transcribed:
        text = None
    return CommunityEvidence(
        id=post.id,
        type=_TYPE_MAP[post.kind],
        text=text,
        observations=filter_observations(observations),
        author=post.author,
        created_at=post.createdAt,
        source_url=post.mediaUrl,
    )


def for_node(node_id: str) -> list[CommunityEvidence]:
    """Return posts plus their written discussions in one evidence collection."""
    evidence: list[CommunityEvidence] = []
    for post in community_service.posts_for(node_id):
        evidence.append(normalize_post(post))
        for reply in community_service.replies_for(post.id):
            evidence.append(
                CommunityEvidence(
                    id=reply.id,
                    type="discussion",
                    text=reply.body.strip() or None,
                    author=reply.author,
                    created_at=reply.createdAt,
                    source_url=None,
                )
            )
    return evidence
