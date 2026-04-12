import axios from "axios";
import Cookies from "js-cookie";

/**
 * Single axios instance for whole app
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost/api",
  withCredentials: true,
  headers: {
    "ngrok-skip-browser-warning": "69420",
  },
});

/**
 * Access token stored in memory
 * prevents XSS token leaks
 */
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
  Cookies.remove("token");
};

/**
 * Attach token to every request
 */
api.interceptors.request.use((config) => {
  // If we have a memory token, use it. Otherwise fallback to js-cookie
  const token = accessToken || Cookies.get("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Auto refresh token on 401
 */
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    // Don't intercept auth/refresh to avoid infinite loops
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== "/auth/refresh") {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost/api"}/auth/refresh`,
          {},
          { 
            withCredentials: true,
            headers: { "ngrok-skip-browser-warning": "69420" }
          }
        );

        accessToken = refreshRes.data.accessToken || refreshRes.data.token;
        if (accessToken) Cookies.set("token", accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (err) {
        accessToken = null;
        Cookies.remove("token");
        if (typeof window !== "undefined" && window.location.pathname !== "/auth/login" && window.location.pathname !== "/auth/register") {
          window.location.href = "/auth/login";
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { api };