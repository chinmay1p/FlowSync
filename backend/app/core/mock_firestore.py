import uuid
import time
import logging

logger = logging.getLogger(__name__)

class MockDocumentSnapshot:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self._data = data
        self.exists = data is not None

    def to_dict(self):
        return self._data or {}

class MockDocumentReference:
    def __init__(self, doc_id, collection_name, db):
        self.id = doc_id
        self.collection_name = collection_name
        self.db = db

    def get(self):
        data = self.db._store.get(self.collection_name, {}).get(self.id)
        return MockDocumentSnapshot(self.id, data)

    def set(self, data, merge=True):
        if self.collection_name not in self.db._store:
            self.db._store[self.collection_name] = {}
        if merge and self.id in self.db._store[self.collection_name]:
            self.db._store[self.collection_name][self.id].update(data)
        else:
            self.db._store[self.collection_name][self.id] = data

    def update(self, data):
        self.set(data, merge=True)

    def delete(self):
        if self.collection_name in self.db._store:
            self.db._store[self.collection_name].pop(self.id, None)

class MockQuery:
    def __init__(self, collection_name, db, filters=None, limit_val=None):
        self.collection_name = collection_name
        self.db = db
        self.filters = filters or []
        self.limit_val = limit_val

    def where(self, field, op, value):
        new_filters = self.filters + [(field, op, value)]
        return MockQuery(self.collection_name, self.db, new_filters, self.limit_val)

    def limit(self, val):
        return MockQuery(self.collection_name, self.db, self.filters, val)

    def stream(self):
        docs = []
        col_data = self.db._store.get(self.collection_name, {})
        for doc_id, data in col_data.items():
            match = True
            for field, op, value in self.filters:
                actual_val = data.get(field)
                if op == '==':
                    if actual_val != value:
                        match = False
                        break
                elif op == 'in':
                    if (value is None) or (actual_val not in value):
                        match = False
                        break
            if match:
                docs.append(MockDocumentSnapshot(doc_id, data))
        
        if self.limit_val is not None:
            docs = docs[:self.limit_val]
        return docs

class MockCollectionReference(MockQuery):
    def __init__(self, collection_name, db):
        super().__init__(collection_name, db)

    def document(self, doc_id=None):
        if not doc_id:
            doc_id = str(uuid.uuid4())
        return MockDocumentReference(doc_id, self.collection_name, self.db)

    def add(self, data):
        doc_id = str(uuid.uuid4())
        doc_ref = self.document(doc_id)
        doc_ref.set(data)
        return time.time(), doc_ref

class MockFirestoreClient:
    def __init__(self):
        self._store = {
            'organizations': {
                'local-dev-org': {
                    'name': 'Local Dev Org',
                    'description': 'Development Environment Workspace',
                    'joinCode': '123456'
                }
            },
            'org_members': {
                'membership_1': {
                    'uid': 'local-dev-user',
                    'email': 'developer_test@example.com',
                    'orgId': 'local-dev-org',
                    'role': 'ORG_ADMIN'
                }
            },
            'teams': {
                'local-dev-team': {
                    'name': 'Dev Team',
                    'description': 'Engineering & Development',
                    'orgId': 'local-dev-org'
                }
            },
            'team_members': {
                'teammember_1': {
                    'uid': 'local-dev-user',
                    'email': 'developer_test@example.com',
                    'teamId': 'local-dev-team',
                    'role': 'MANAGER'
                }
            }
        }

    def collection(self, collection_name):
        return MockCollectionReference(collection_name, self)

_client_instance = MockFirestoreClient()

def get_mock_client():
    return _client_instance
