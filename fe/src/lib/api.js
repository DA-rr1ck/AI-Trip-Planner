import axios from 'axios';
import { API_BASE_URL } from '@/service/apiBaseConfig';

export const api = axios.create({ baseURL: `${API_BASE_URL}/api`, withCredentials: true });
