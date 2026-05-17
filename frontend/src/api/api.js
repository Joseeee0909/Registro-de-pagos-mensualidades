import axios from 'axios';


const baseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api";

const api = axios.create({
  baseURL: baseUrl,
});

export default api;
