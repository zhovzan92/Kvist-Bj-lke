import {
  Api,
  type HttpResponse,
  type ProblemDetails,
  type UserResponseDto,
} from "@/lib/generated/api";

import { getSession, setSession, type Session } from "./session";
import { toRole, type Role, type User } from "./users";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5041";

const api = new Api({
  baseUrl: API_URL,
  securityWorker: () => {
    const session = getSession();
    return session
      ? { headers: { Authorization: `Bearer ${session.token}` } }
      : {};
  },
});

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function call<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (err) {
    if (err instanceof Response) {
      throw toApiError(err as HttpResponse<unknown, ProblemDetails | null>);
    }
    if (err instanceof TypeError) {
      throw new ApiError("Couldn't reach the server. Check that the API is running.", 0);
    }
    throw err;
  }
}

function toApiError(res: HttpResponse<unknown, ProblemDetails | null>): ApiError {
  const problem = res.error && typeof res.error === "object" ? res.error : null;

  if (res.status === 401 && getSession()) {
    setSession(null);
    return new ApiError("Your session has expired. Log in again.", 401);
  }

  const message =
    res.status >= 500
      ? "Something went wrong on the server. Try again."
      : (problem?.detail ?? problem?.title ?? `Request failed (${res.status}).`);
  return new ApiError(message, res.status);
}

function toUser(dto: UserResponseDto | undefined): User {
  return {
    id: dto?.userId ?? "",
    username: dto?.username ?? "",
    email: dto?.email ?? "",
    role: toRole(dto?.role),
    createdAt: dto?.createdAt ?? "",
  };
}

export type Credentials = { username: string; password: string };

export const login = (credentials: Credentials) =>
  call(() => api.login.authLogin(credentials)).then(
    (res): Session => ({ token: res.token ?? "", user: toUser(res.user) })
  );

// Revokes the token on the server, then forgets it here. The local session is
// cleared even if the server can't be reached.
export async function logout() {
  try {
    await api.logout.authLogout();
  } catch {
    // Nothing to do: the token is dropped below either way.
  }
  setSession(null);
}

export const getMe = () => call(() => api.getMe.authGetMe()).then(toUser);

export const getUsers = () =>
  call(() => api.getUsers.userGetUsers()).then((list) => list.map(toUser));

export type NewUser = {
  username: string;
  email: string;
  role: Role;
  password: string;
};

export const createUser = (user: NewUser) =>
  call(() => api.createUser.userCreateUser(user)).then(toUser);

// format "json" so the error body is read; a successful delete returns no body.
export const deleteUser = (userId: string) =>
  call(() => api.deleteUser.userDeleteUser({ userId }, { format: "json" }));

export type UserUpdate = {
  username: string;
  email: string;
  role: Role;
  /** Leave empty to keep the current password. */
  newPassword: string;
};

export const updateUser = (userId: string, update: UserUpdate) =>
  call(() =>
    api.updateUser.userUpdateUser(
      { ...update, newPassword: update.newPassword || null },
      { userId }
    )
  ).then(toUser);
