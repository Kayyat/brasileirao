import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:4000";

const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      error.userMessage = error.response.data.error;
    }
    return Promise.reject(error);
  }
);

export function getApiUrl(path = "") {
  if (!path) return baseURL;
  return `${baseURL}${path.startsWith("/") ? path : `/${path}`}`;
}

export default api;
