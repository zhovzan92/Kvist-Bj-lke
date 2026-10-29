"""Starts the real API against a throwaway SQLite database for the test run.

The API runs in Development, so it seeds the sample accounts from
server/Api/appsettings.Development.json:
  admin / admin-password         (Admin)
  sofie.lund / user-password     (SuperUser)
  freja.madsen / user-password   (User)

Run from the repo root:
  pip install -r tests/requirements.txt
  pytest tests
"""

import os
import socket
import subprocess
import time
import uuid
from pathlib import Path

import pytest
import requests

REPO = Path(__file__).resolve().parents[1]
API_DIR = REPO / "server" / "Api"
API_DLL = API_DIR / "bin" / "Debug" / "net10.0" / "Api.dll"

ACCOUNTS = {
    "Admin": ("admin", "admin-password"),
    "SuperUser": ("sofie.lund", "user-password"),
    "User": ("freja.madsen", "user-password"),
}
ROLES = list(ACCOUNTS)


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def base_url(tmp_path_factory):
    subprocess.run(["dotnet", "build", str(API_DIR / "Api.csproj")], check=True, capture_output=True)

    port = _free_port()
    db_path = tmp_path_factory.mktemp("db") / "test.db"
    env = {
        **os.environ,
        "ASPNETCORE_ENVIRONMENT": "Development",
        "ASPNETCORE_URLS": f"http://127.0.0.1:{port}",
        "ConnectionStrings__Default": f"Data Source={db_path}",
        # The tests log in many times; the per-IP limit is not what they test.
        "RateLimit__LoginPerMinute": "100000",
    }
    # Don't start the Next.js client alongside the API.
    env.pop("ASPNETCORE_HOSTINGSTARTUPASSEMBLIES", None)

    process = subprocess.Popen(
        ["dotnet", str(API_DLL)], cwd=API_DIR, env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    url = f"http://127.0.0.1:{port}"
    try:
        for _ in range(120):
            try:
                if requests.get(f"{url}/GetUsers", timeout=1).status_code == 401:
                    break
            except requests.ConnectionError:
                pass
            time.sleep(0.5)
        else:
            raise RuntimeError("The API did not start")
        yield url
    finally:
        process.terminate()
        process.wait(timeout=10)


class Api:
    """A logged-in caller."""

    def __init__(self, base_url, username, password):
        self.base_url = base_url
        response = requests.post(f"{base_url}/Login", json={"username": username, "password": password})
        assert response.status_code == 200, response.text
        body = response.json()
        self.user = body["user"]
        self.headers = {"Authorization": f"Bearer {body['token']}"}

    def get(self, path, **kwargs):
        return requests.get(f"{self.base_url}/{path}", headers=self.headers, **kwargs)

    def post(self, path, **kwargs):
        return requests.post(f"{self.base_url}/{path}", headers=self.headers, **kwargs)

    def put(self, path, **kwargs):
        return requests.put(f"{self.base_url}/{path}", headers=self.headers, **kwargs)

    def delete(self, path, **kwargs):
        return requests.delete(f"{self.base_url}/{path}", headers=self.headers, **kwargs)

    def users(self, **params):
        response = self.get("GetUsers", params=params)
        assert response.status_code == 200, response.text
        return response.json()

    def create(self, role, password="long-enough-pw"):
        name = f"t.{uuid.uuid4().hex[:10]}"
        return self.post("CreateUser", json={
            "username": name,
            "email": f"{name}@example.com",
            "role": role,
            "password": password,
        })

    def update(self, user_id, username, email, role, new_password=""):
        return self.put("UpdateUser", params={"userId": user_id}, json={
            "username": username, "email": email, "role": role, "newPassword": new_password,
        })


@pytest.fixture(scope="session")
def callers(base_url):
    return {role: Api(base_url, *ACCOUNTS[role]) for role in ROLES}


@pytest.fixture(scope="session")
def admin(callers):
    return callers["Admin"]


@pytest.fixture
def temp_user(admin):
    """Creates an account with the given role through the Admin, and deletes it afterwards."""
    created = []

    def make(role):
        response = admin.create(role)
        assert response.status_code == 200, response.text
        created.append(response.json()["userId"])
        return response.json()

    yield make
    for user_id in created:
        admin.delete("DeleteUser", params={"userId": user_id})
