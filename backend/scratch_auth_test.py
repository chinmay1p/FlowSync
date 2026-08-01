import os
import time
import datetime
from google.auth import _helpers
import firebase_admin
from firebase_admin import credentials, firestore

# Print current time
print("Current system time:", datetime.datetime.now())

# Try standard initialization
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate("./firebase_service_account.json")
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    # Try a simple read
    docs = list(db.collection('organizations').limit(1).stream())
    print("Success! Read organizations count:", len(docs))
except Exception as e:
    print("Standard auth failed:", e)

# Try patching the clock back to 2024 or 2025
print("\n--- Testing with patched clock (2025-01-01) ---")
original_utcnow = _helpers.utcnow
# 2025-01-01 12:00:00 UTC
fake_now = datetime.datetime(2025, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc)

def mock_utcnow():
    return fake_now

_helpers.utcnow = mock_utcnow

try:
    # Reset firebase admin app to re-auth
    if firebase_admin._apps:
        for app_name in list(firebase_admin._apps.keys()):
            firebase_admin.delete_app(firebase_admin._apps[app_name])
            
    cred = credentials.Certificate("./firebase_service_account.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    docs = list(db.collection('organizations').limit(1).stream())
    print("Success with patched clock! Read organizations count:", len(docs))
except Exception as e:
    print("Patched auth failed:", e)
