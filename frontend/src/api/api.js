import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: baseUrl,
});

export default api;
