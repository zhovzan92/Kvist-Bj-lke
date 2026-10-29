"""Create, edit and delete permissions.

User: none. SuperUser: Users only, and can't assign SuperUser or Admin.
Admin: any role. Nobody can delete their own account.
"""

import pytest
import requests

from conftest import ROLES

# ---------- create ----------


@pytest.mark.parametrize("caller_role, new_role, allowed", [
    ("Admin", "User", True),
    ("Admin", "SuperUser", True),
    ("Admin", "Admin", True),
    ("SuperUser", "User", True),
    ("SuperUser", "SuperUser", False),
    ("SuperUser", "Admin", False),
    ("User", "User", False),
])
def test_create_follows_role_permissions(callers, admin, caller_role, new_role, allowed):
    response = callers[caller_role].create(new_role)

    if allowed:
        assert response.status_code == 200, response.text
        created = response.json()
        assert created["role"] == new_role
        admin.delete("DeleteUser", params={"userId": created["userId"]})
    else:
        assert response.status_code == 403
        assert response.json()["detail"]


def test_create_requires_a_password(admin):
    assert admin.create("User", password="").status_code == 400


def test_create_requires_at_least_12_characters(admin):
    assert admin.create("User", password="elevenchars").status_code == 400


def test_created_account_can_log_in_and_has_no_password_in_responses(base_url, admin):
    response = admin.create("User", password="long-enough-pw")
    assert response.status_code == 200
    created = response.json()
    try:
        assert "password" not in response.text.lower()
        assert "hash" not in response.text.lower()
        login = requests.post(f"{base_url}/Login", json={
            "username": created["username"], "password": "long-enough-pw",
        })
        assert login.status_code == 200
    finally:
        admin.delete("DeleteUser", params={"userId": created["userId"]})


# ---------- edit ----------


@pytest.mark.parametrize("new_role", ["SuperUser", "Admin"])
def test_superuser_cannot_assign_a_higher_role(callers, admin, temp_user, new_role):
    target = temp_user("User")

    response = callers["SuperUser"].update(target["userId"], target["username"], target["email"], new_role)

    assert response.status_code == 403
    stored = next(u for u in admin.users() if u["userId"] == target["userId"])
    assert stored["role"] == "User"


def test_superuser_can_edit_a_user(callers, temp_user):
    target = temp_user("User")
    new_name = target["username"] + "x"

    response = callers["SuperUser"].update(target["userId"], new_name, target["email"], "User")

    assert response.status_code == 200, response.text
    assert response.json()["username"] == new_name


@pytest.mark.parametrize("target_role", ROLES)
def test_admin_can_edit_any_role(admin, temp_user, target_role):
    target = temp_user(target_role)

    response = admin.update(target["userId"], target["username"], target["email"], "User")

    assert response.status_code == 200, response.text
    assert response.json()["role"] == "User"


def test_blank_password_on_edit_keeps_the_old_one(base_url, admin, temp_user):
    target = temp_user("User")

    response = admin.update(target["userId"], target["username"], target["email"], "User", new_password="")

    assert response.status_code == 200
    login = requests.post(f"{base_url}/Login", json={
        "username": target["username"], "password": "long-enough-pw",
    })
    assert login.status_code == 200


def test_short_new_password_on_edit_is_refused(admin, temp_user):
    target = temp_user("User")

    response = admin.update(target["userId"], target["username"], target["email"], "User", new_password="short")

    assert response.status_code == 400


# ---------- delete ----------


@pytest.mark.parametrize("caller_role, target_role, expected", [
    ("Admin", "User", 204),
    ("Admin", "SuperUser", 204),
    ("Admin", "Admin", 204),
    ("SuperUser", "User", 204),
    ("User", "User", 403),
])
def test_delete_follows_role_permissions(callers, admin, temp_user, caller_role, target_role, expected):
    target = temp_user(target_role)

    response = callers[caller_role].delete("DeleteUser", params={"userId": target["userId"]})

    assert response.status_code == expected
    still_there = target["userId"] in {u["userId"] for u in admin.users()}
    assert still_there == (expected != 204)


@pytest.mark.parametrize("role", ["Admin", "SuperUser"])
def test_nobody_can_delete_their_own_account(callers, role):
    me = callers[role].user

    response = callers[role].delete("DeleteUser", params={"userId": me["userId"]})

    # A SuperUser can't see their own account, so for them it doesn't exist.
    assert response.status_code == (400 if role == "Admin" else 404)


def test_requests_without_a_token_are_refused(base_url):
    assert requests.get(f"{base_url}/GetUsers").status_code == 401
    assert requests.post(f"{base_url}/CreateUser", json={}).status_code == 401
