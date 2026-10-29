"""Read permissions: who can see which accounts.

User and SuperUser only see accounts with the User role. Admin sees everyone.
The dashboard's search, role filter, count and paging all work on the list
GetUsers returns, so that list must never contain a hidden account.
"""

import math

import pytest

from conftest import ROLES

VISIBLE = {
    "Admin": {"User", "SuperUser", "Admin"},
    "SuperUser": {"User"},
    "User": {"User"},
}
PAGE_SIZE = 10  # The dashboard's page size.


def all_accounts(admin):
    return admin.users()


def hidden_accounts(admin, role):
    return [u for u in all_accounts(admin) if u["role"] not in VISIBLE[role]]


# ---------- the users list ----------


@pytest.mark.parametrize("role", ROLES)
def test_list_contains_only_visible_roles(callers, admin, role):
    listed = callers[role].users()

    assert {u["role"] for u in listed} == VISIBLE[role]
    expected_ids = {u["userId"] for u in all_accounts(admin) if u["role"] in VISIBLE[role]}
    assert {u["userId"] for u in listed} == expected_ids


@pytest.mark.parametrize("role", ["SuperUser", "User"])
def test_hidden_accounts_never_appear_in_the_response(callers, admin, role):
    hidden = hidden_accounts(admin, role)
    assert hidden, "the sample data should include hidden accounts"

    body = callers[role].get("GetUsers").text
    for account in hidden:
        assert account["userId"] not in body
        assert account["username"] not in body
        assert account["email"] not in body


def test_superuser_does_not_see_their_own_account(callers):
    me = callers["SuperUser"].user
    assert me["userId"] not in {u["userId"] for u in callers["SuperUser"].users()}


# ---------- search and the role filter ----------


@pytest.mark.parametrize("role", ["SuperUser", "User"])
def test_search_cannot_find_hidden_accounts(callers, admin, role):
    listed = callers[role].users()
    for account in hidden_accounts(admin, role):
        # What the dashboard search matches: ID prefix, username or email.
        for term in (account["userId"][:8], account["username"], account["email"]):
            assert not [
                u for u in listed
                if u["userId"].startswith(term) or term in u["username"] or term in u["email"]
            ]


@pytest.mark.parametrize("role", ["SuperUser", "User"])
@pytest.mark.parametrize("filter_role", ["SuperUser", "Admin"])
def test_role_filter_cannot_reveal_hidden_roles(callers, role, filter_role):
    assert [u for u in callers[role].users() if u["role"] == filter_role] == []


@pytest.mark.parametrize("role", ["SuperUser", "User"])
def test_query_parameters_cannot_widen_the_list(callers, admin, role):
    expected = {u["userId"] for u in callers[role].users()}
    hidden = hidden_accounts(admin, role)[0]

    for params in ({"role": "Admin"}, {"role": "SuperUser"}, {"search": hidden["username"]},
                   {"userId": hidden["userId"]}, {"all": "true"}):
        assert {u["userId"] for u in callers[role].users(**params)} == expected


# ---------- count and paging ----------


@pytest.mark.parametrize("role", ROLES)
def test_total_count_and_paging_only_include_visible_rows(callers, admin, role):
    listed = callers[role].users()
    visible_total = len([u for u in all_accounts(admin) if u["role"] in VISIBLE[role]])

    # The count under the table is the length of this list.
    assert len(listed) == visible_total

    pages = [listed[i:i + PAGE_SIZE] for i in range(0, len(listed), PAGE_SIZE)]
    assert len(pages) == max(1, math.ceil(visible_total / PAGE_SIZE))
    assert all(u["role"] in VISIBLE[role] for page in pages for u in page)
    assert sum(len(page) for page in pages) == visible_total


def test_new_accounts_count_only_for_roles_that_can_see_them(callers, temp_user):
    before = {role: len(callers[role].users()) for role in ROLES}

    temp_user("Admin")

    after = {role: len(callers[role].users()) for role in ROLES}
    assert after == {"Admin": before["Admin"] + 1, "SuperUser": before["SuperUser"], "User": before["User"]}


# ---------- direct requests for a hidden account: 404, not 403 ----------


@pytest.mark.parametrize("hidden_role", ["SuperUser", "Admin"])
def test_superuser_editing_a_hidden_account_gets_404(callers, temp_user, hidden_role):
    target = temp_user(hidden_role)

    response = callers["SuperUser"].update(target["userId"], target["username"], target["email"], hidden_role)

    assert response.status_code == 404


@pytest.mark.parametrize("hidden_role", ["SuperUser", "Admin"])
def test_superuser_deleting_a_hidden_account_gets_404(callers, admin, temp_user, hidden_role):
    target = temp_user(hidden_role)

    response = callers["SuperUser"].delete("DeleteUser", params={"userId": target["userId"]})

    assert response.status_code == 404
    assert target["userId"] in {u["userId"] for u in admin.users()}


@pytest.mark.parametrize("role", ["SuperUser", "User"])
def test_hidden_account_looks_the_same_as_a_missing_one(callers, temp_user, role):
    target = temp_user("Admin")
    caller = callers[role]

    hidden = caller.update(target["userId"], "someone", "someone@example.com", "User")
    missing = caller.update("00000000-0000-0000-0000-000000000000", "someone", "someone@example.com", "User")

    assert hidden.status_code == missing.status_code == 404
    assert hidden.json() == missing.json()


def test_user_editing_a_hidden_account_gets_404(callers, temp_user):
    target = temp_user("SuperUser")

    response = callers["User"].update(target["userId"], target["username"], target["email"], "SuperUser")

    assert response.status_code == 404


def test_user_editing_a_visible_account_gets_403(callers, temp_user):
    target = temp_user("User")

    response = callers["User"].update(target["userId"], target["username"], target["email"], "User")

    assert response.status_code == 403


def test_admin_can_reach_every_account(admin, temp_user):
    for role in ROLES:
        target = temp_user(role)
        response = admin.update(target["userId"], target["username"], target["email"], role)
        assert response.status_code == 200, response.text
