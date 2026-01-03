from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.services.org_service import org_service

router = APIRouter(prefix='/org', tags=['organizations'])


class CreateOrgRequest(BaseModel):
	name: str = Field(..., min_length=2, max_length=120)
	description: str | None = Field(default='', max_length=500)


class CreateOrgResponse(BaseModel):
	orgId: str
	joinCode: str


class JoinOrgRequest(BaseModel):
	joinCode: str = Field(..., min_length=6, max_length=6)


class JoinOrgResponse(BaseModel):
	orgId: str
	role: str


@router.post('/create', response_model=CreateOrgResponse, status_code=status.HTTP_201_CREATED)
async def create_org(request: CreateOrgRequest, current_user: dict = Depends(get_current_user)):
	name = request.name.strip()
	if not name:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Organization name is required')

	description = (request.description or '').strip()

	result = await org_service.create_organization(
		uid=current_user.get('uid'),
		email=current_user.get('email'),
		name=name,
		description=description,
	)
	return CreateOrgResponse(**result)


@router.post('/join', response_model=JoinOrgResponse)
async def join_org(request: JoinOrgRequest, current_user: dict = Depends(get_current_user)):
	join_code = request.joinCode.strip()
	if len(join_code) != 6 or not join_code.isdigit():
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Enter a valid 6-digit join code')

	result = await org_service.join_organization(
		uid=current_user.get('uid'),
		email=current_user.get('email'),
		join_code=join_code,
	)
	return JoinOrgResponse(**result)
