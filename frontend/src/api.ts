import axios from 'axios';

const root = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';

export const api = axios.create({
  baseURL: root ? `${root}/api` : '/api',
  withCredentials: true,
});

// Cookie-based auth: backend reads JWT from httpOnly cookie.
