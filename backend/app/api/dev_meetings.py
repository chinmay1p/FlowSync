"""Development-only no-auth endpoints for quick meeting transcript workflows."""
import os

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.meeting_transcript_service import meeting_transcript_service

router = APIRouter(prefix='/dev/meetings', tags=['dev-meetings'])

DEV_NO_AUTH = os.getenv('DEV_NO_AUTH', 'false').lower() in {'1', 'true', 'yes'}
DEV_ORG_ID = os.getenv('DEV_ORG_ID', 'local-dev-org')
DEV_USER_ID = os.getenv('DEV_USER_ID', 'local-dev-user')


class StartMeetingRequest(BaseModel):
	title: str | None = None
	meetingUrl: str | None = None


class StartMeetingResponse(BaseModel):
	meetingId: str
	status: str


class EndMeetingRequest(BaseModel):
	generateSummary: bool = True


class EndMeetingResponse(BaseModel):
	meetingId: str
	status: str
	summaryGenerated: bool = False


class AppendTranscriptRequest(BaseModel):
	text: str
	timestamp: int
	speaker: str | None = None


class AppendTranscriptResponse(BaseModel):
	success: bool
	segmentCount: int = 0


def _guard_dev_mode() -> None:
	if not DEV_NO_AUTH:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail='Set DEV_NO_AUTH=true to use /dev/meetings endpoints',
		)


@router.post('/start', response_model=StartMeetingResponse)
async def start_meeting(request: StartMeetingRequest):
	"""Start a meeting without auth (dev-only)."""
	_guard_dev_mode()
	return await meeting_transcript_service.start_meeting(
		org_id=DEV_ORG_ID,
		team_id=None,
		created_by=DEV_USER_ID,
		title=request.title,
		meeting_url=request.meetingUrl,
	)


@router.post('/{meeting_id}/transcript', response_model=AppendTranscriptResponse)
async def append_transcript(meeting_id: str, request: AppendTranscriptRequest):
	"""Append transcript segment without auth (dev-only)."""
	_guard_dev_mode()
	result = await meeting_transcript_service.append_transcript(
		meeting_id=meeting_id,
		text=request.text,
		timestamp=request.timestamp,
		speaker=request.speaker,
		org_id=DEV_ORG_ID,
	)
	return result


@router.post('/{meeting_id}/end', response_model=EndMeetingResponse)
async def end_meeting(meeting_id: str, request: EndMeetingRequest = EndMeetingRequest()):
	"""End meeting and optionally generate summary without auth (dev-only)."""
	_guard_dev_mode()
	result = await meeting_transcript_service.end_meeting(
		meeting_id=meeting_id,
		user_id=DEV_USER_ID,
		org_id=DEV_ORG_ID,
		generate_summary=request.generateSummary,
	)
	return result


@router.get('/{meeting_id}/transcript')
async def get_transcript(meeting_id: str):
	"""Get transcript without auth (dev-only)."""
	_guard_dev_mode()
	return await meeting_transcript_service.get_transcript(
		meeting_id=meeting_id,
		user_id=DEV_USER_ID,
		org_id=DEV_ORG_ID,
	)


@router.get('/{meeting_id}/summary')
async def get_summary(meeting_id: str):
	"""Get summary without auth (dev-only)."""
	_guard_dev_mode()
	return await meeting_transcript_service.get_summary(
		meeting_id=meeting_id,
		user_id=DEV_USER_ID,
		org_id=DEV_ORG_ID,
	)
