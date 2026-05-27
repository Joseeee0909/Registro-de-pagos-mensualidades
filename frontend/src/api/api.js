import axios from 'axios';

const baseUrl = import.meta.env.DEV
  ? "/api"
  : import.meta.env.VITE_API_BASE_URL || "https://registro-de-pagos-mensualidades.onrender.com/api";

const api = axios.create({
  baseURL: baseUrl,
});

export default api;
