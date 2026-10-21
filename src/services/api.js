import axios from "axios";

/* =========================================================
   API
========================================================= */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",

  headers: {
    "Content-Type": "application/json",
  },
});

/* =========================================================
   REQUEST INTERCEPTOR

   Attach JWT on every authenticated request.
========================================================= */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

/* =========================================================
   RESPONSE INTERCEPTOR
========================================================= */

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    /*
     * Do not automatically redirect here.
     *
     * Let the page/router decide what to do.
     * This prevents redirect loops.
     */

    return Promise.reject(error);
  },
);

export default api;
