import os
import json
import logging
import firebase_admin
from firebase_admin import credentials, auth
from google.auth import exceptions as google_auth_exceptions
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
logger = logging.getLogger(__name__)

_firebase_app = None


def _resolve_service_account_path() -> str:
	"""Resolve service account path from env or known local defaults."""
	configured_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
	if configured_path and os.path.exists(configured_path):
		return configured_path

	for candidate in ('./firebase_service_account.json', './service-account.json'):
		if os.path.exists(candidate):
			return candidate

	if configured_path:
		raise RuntimeError(f'Firebase service account file not found at: {configured_path}')

	raise RuntimeError(
		'FIREBASE_SERVICE_ACCOUNT_PATH environment variable not set, and no default service account file found. '
		'Expected one of: ./firebase_service_account.json or ./service-account.json'
	)


def _normalize_private_key(service_account_info: dict) -> dict:
	"""Normalize private key formatting to avoid invalid JWT signature errors."""
	private_key = service_account_info.get('private_key')
	if not private_key:
		return service_account_info

	if '\\n' in private_key:
		service_account_info['private_key'] = private_key.replace('\\n', '\n')

	return service_account_info


def _load_certificate(path: str):
	"""Load and normalize Firebase certificate data."""
	with open(path, 'r', encoding='utf-8-sig') as file:
		service_account_info = json.load(file)

	normalized = _normalize_private_key(service_account_info)
	return credentials.Certificate(normalized)


def ensure_firebase_initialized():
	"""Ensure Firebase Admin app is initialized before any auth call."""
	global _firebase_app
	if _firebase_app is None:
		initialize_firebase()
	return _firebase_app


def initialize_firebase():
	"""Initialize Firebase Admin SDK once at app startup."""
	global _firebase_app
	
	if _firebase_app is not None:
		return _firebase_app
	
	DEV_NO_AUTH = os.getenv('DEV_NO_AUTH', 'false').lower() in {'1', 'true', 'yes'}
	if DEV_NO_AUTH:
		# Patch firestore client
		from firebase_admin import firestore
		from app.core.mock_firestore import get_mock_client
		firestore.client = get_mock_client
		
		class DummyApp:
			pass
		_firebase_app = DummyApp()
		logger.info('Firebase Admin SDK mocked for local dev (DEV_NO_AUTH=true)')
		return _firebase_app
	
	service_account_path = _resolve_service_account_path()
	cred = _load_certificate(service_account_path)
	_firebase_app = firebase_admin.initialize_app(cred)
	logger.info('Firebase Admin SDK initialized with credentials file: %s', service_account_path)
	return _firebase_app


def verify_firebase_token(token: str) -> dict:
	"""Verify Firebase ID token and return decoded claims. Raises HTTPException for REST endpoints."""
	DEV_NO_AUTH = os.getenv('DEV_NO_AUTH', 'false').lower() in {'1', 'true', 'yes'}
	if DEV_NO_AUTH:
		return {
			'uid': os.getenv('DEV_USER_ID', 'local-dev-user'),
			'email': 'developer_test@example.com',
			'name': 'Developer Test',
			'picture': ''
		}
	ensure_firebase_initialized()
	try:
		claims = auth.verify_id_token(token)
		return claims
	except auth.InvalidIdTokenError:
		raise HTTPException(status_code=401, detail='Invalid ID token')
	except auth.ExpiredIdTokenError:
		raise HTTPException(status_code=401, detail='ID token has expired')
	except google_auth_exceptions.RefreshError as err:
		err_msg = str(err)
		if 'invalid_grant' in err_msg and 'Invalid JWT Signature' in err_msg:
			logger.error(
				'Firebase Admin credentials rejected by Google OAuth (invalid JWT signature). '
				'Regenerate Firebase service account key and update FIREBASE_SERVICE_ACCOUNT_PATH.'
			)
		raise HTTPException(status_code=500, detail='Firebase Admin credential error')
	except Exception as err:
		raise HTTPException(status_code=401, detail='Token verification failed')


def verify_firebase_token_ws(token: str) -> tuple[bool, dict | None, str]:
	"""Verify Firebase ID token for WebSocket. Returns (success, claims, error_reason)."""
	DEV_NO_AUTH = os.getenv('DEV_NO_AUTH', 'false').lower() in {'1', 'true', 'yes'}
	if DEV_NO_AUTH:
		return True, {
			'uid': os.getenv('DEV_USER_ID', 'local-dev-user'),
			'email': 'developer_test@example.com',
			'name': 'Developer Test',
			'picture': ''
		}, ''
	ensure_firebase_initialized()
	if not token:
		return False, None, 'Token is required'
	
	try:
		claims = auth.verify_id_token(token)
		logger.info(f'WebSocket token verified for uid: {claims.get("uid")}')
		return True, claims, ''
	except auth.InvalidIdTokenError as err:
		logger.warning(f'WebSocket auth failed: invalid token - {err}')
		return False, None, 'Invalid ID token'
	except auth.ExpiredIdTokenError as err:
		logger.warning(f'WebSocket auth failed: expired token - {err}')
		return False, None, 'ID token has expired'
	except auth.RevokedIdTokenError as err:
		logger.warning(f'WebSocket auth failed: revoked token - {err}')
		return False, None, 'ID token has been revoked'
	except google_auth_exceptions.RefreshError as err:
		err_msg = str(err)
		if 'invalid_grant' in err_msg and 'Invalid JWT Signature' in err_msg:
			logger.error(
				'Firebase Admin credentials rejected by Google OAuth (invalid JWT signature). '
				'Regenerate Firebase service account key and update FIREBASE_SERVICE_ACCOUNT_PATH.'
			)
		return False, None, 'Firebase Admin credential error'
	except Exception as err:
		logger.error(f'WebSocket token verification error: {type(err).__name__}: {err}', exc_info=True)
		return False, None, f'Token verification failed: {type(err).__name__}'


security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
	"""Dependency to extract and verify Firebase token from Authorization header."""
	DEV_NO_AUTH = os.getenv('DEV_NO_AUTH', 'false').lower() in {'1', 'true', 'yes'}
	if DEV_NO_AUTH:
		return {
			'uid': os.getenv('DEV_USER_ID', 'local-dev-user'),
			'email': 'developer_test@example.com',
			'name': 'Developer Test',
			'picture': ''
		}
	token = credentials.credentials
	if not token:
		raise HTTPException(status_code=401, detail='Missing authentication token')
	return verify_firebase_token(token)


