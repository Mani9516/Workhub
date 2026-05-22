import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("workhub_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail;
    if (Array.isArray(msg)) {
      err.displayMessage = msg.map((m) => m.msg || JSON.stringify(m)).join("; ");
    } else if (typeof msg === "string") {
      err.displayMessage = msg;
    } else {
      err.displayMessage = err.message;
    }
    return Promise.reject(err);
  },
);

export default api;
