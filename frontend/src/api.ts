import axios from "axios";

// Extend axios config type to include metadata
declare module "axios" {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
  }
}

const root = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

export const api = axios.create({
  baseURL: root || "",
  withCredentials: true,
  timeout: 30000, // 30 second timeout
});

// Request interceptor for better error handling
api.interceptors.request.use(
  (config) => {
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const endTime = new Date();
    const startTime = response.config.metadata?.startTime?.getTime();
    const duration = startTime ? endTime.getTime() - startTime : 0;

    // Log slow requests in development
    if (import.meta.env.DEV && duration > 2000) {
      console.warn(
        `Slow API request: ${response.config.url} took ${duration}ms`,
      );
    }

    return response;
  },
  (error) => {
    // Standardize error handling
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      // Create user-friendly error message
      let userMessage = "An unexpected error occurred";

      if (data?.message) {
        userMessage = data.message;
      } else if (status === 400) {
        userMessage = "Invalid request. Please check your input and try again.";
      } else if (status === 401) {
        userMessage = "Your session has expired. Please log in again.";
      } else if (status === 403) {
        userMessage = "You do not have permission to perform this action.";
      } else if (status === 404) {
        userMessage = "The requested resource was not found.";
      } else if (status >= 500) {
        userMessage = "Server error. Please try again later.";
      }

      // Enhance error object with user-friendly message
      error.userMessage = userMessage;
      error.status = status;
      error.data = data;
    } else if (error.request) {
      // Request was made but no response received
      error.userMessage =
        "Network error. Please check your connection and try again.";
      error.status = 0;
    } else {
      // Something else happened
      error.userMessage = "An unexpected error occurred. Please try again.";
      error.status = -1;
    }

    return Promise.reject(error);
  },
);

// Cookie-based auth: backend reads JWT from httpOnly cookie.
