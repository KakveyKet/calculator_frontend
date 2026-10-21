import { reactive } from "vue";
import api from "../services/api.js";

const TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";

/* =========================================================
   READ STORED USER
========================================================= */

function readStoredUser() {
  try {
    const value = localStorage.getItem(USER_KEY);

    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error("READ STORED USER ERROR:", error);
    return null;
  }
}

/* =========================================================
   AUTH STATE
========================================================= */

export const authState = reactive({
  token: localStorage.getItem(TOKEN_KEY),
  user: readStoredUser(),
  loading: false,
});

/* =========================================================
   GET TOKEN
========================================================= */

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/* =========================================================
   GET STORED USER
========================================================= */

export function getStoredUser() {
  return readStoredUser();
}

/* =========================================================
   AUTH STATUS
========================================================= */

export function isAuthenticated() {
  return Boolean(getToken());
}

/* =========================================================
   SAVE AUTH
========================================================= */

function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  authState.token = token;
  authState.user = user;
}

/* =========================================================
   LOGIN
========================================================= */

export async function login(credentials) {
  try {
    authState.loading = true;

    const identifier = String(credentials.identifier || credentials.email || "")
      .trim()
      .toLowerCase();

    const response = await api.post("/auth/login", {
      identifier,
      password: credentials.password,
    });

    const token = response.data.accessToken;
    const user = response.data.user;

    if (!token) {
      throw new Error("Access token was not returned.");
    }

    if (!user) {
      throw new Error("User information was not returned.");
    }

    saveAuth(token, user);

    return user;
  } catch (error) {
    console.error("AUTH LOGIN ERROR:", error);

    throw error;
  } finally {
    authState.loading = false;
  }
}

/* =========================================================
   REFRESH CURRENT USER
========================================================= */

export async function refreshCurrentUser() {
  try {
    const token = getToken();

    if (!token) {
      authState.token = null;
      authState.user = null;

      return null;
    }

    const response = await api.get("/users/me");

    const user = response.data.data;

    if (!user) {
      return null;
    }

    localStorage.setItem(USER_KEY, JSON.stringify(user));

    authState.user = user;

    return user;
  } catch (error) {
    console.error("REFRESH CURRENT USER ERROR:", error);

    throw error;
  }
}

/* =========================================================
   LOGOUT

   No confirm.
   Immediately clears login data.
========================================================= */

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  authState.token = null;
  authState.user = null;
}
