import { useAuthStore } from '@/stores/auth';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
});

// 使用请求拦截器，在每个请求头中自动添加 Token
apiClient.interceptors.request.use(config => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers['x-access-token'] = authStore.token;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default {
  getAccounts() {
    return apiClient.get('/accounts');
  },
  addAccount(data: { game_type: string; game_username: string; game_password: any; }) {
    return apiClient.post('/accounts', data);
  },
  deleteAccount(id: number) {
    return apiClient.delete(`/accounts/${id}`);
  },
  updateAccountStatus(id: number, is_enabled: boolean) {
    return apiClient.put(`/accounts/${id}`, { is_enabled });
  },
  getCalendar(month: string) {
    return apiClient.get(`/tasks/calendar?month=${month}`);
  },
  getTasksByDate(date: string) {
    return apiClient.get(`/tasks/by-date?date=${date}`);
  },
  getSystemStatus() {
    return apiClient.get('/admin/status');
  },
  triggerWakeup() {
    return apiClient.post('/admin/wakeup');
  },
  triggerForceRestart() {
    return apiClient.post('/admin/force-restart');
  },
  triggerShutdown() {
    return apiClient.post('/admin/shutdown');
  },
  // 新增
  togglePlugSwitch() {
    return apiClient.post('/admin/plug/toggle');
  },
  getAccountById(id: number) {
    return apiClient.get(`/accounts/${id}`);
  },
  updateAccountSettings(id: number, data: any) {
    return apiClient.put(`/accounts/${id}/settings`, data);
  },
  resetPassword(id: number, password: string) {
    return apiClient.put(`/accounts/${id}/password`, { password });
  },
  getTasksByAccountId(accountId: number) {
    return apiClient.get(`/tasks/account/${accountId}`);
  },
  // Admin Metadata APIs
  getFieldOptions() {
    return apiClient.get('/admin/metadata');
  },
  addFieldOption(data: any) {
    return apiClient.post('/admin/metadata', data);
  },
  deleteFieldOption(id: number) {
    return apiClient.delete(`/admin/metadata/${id}`);
  },
  // Field Config APIs
  getFieldConfigs() { return apiClient.get('/admin/field-config'); },
  saveFieldConfig(data: any) { return apiClient.post('/admin/field-config', data); },
  deleteFieldConfig(id: number) { return apiClient.delete(`/admin/field-config/${id}`); },
  // Database Schema APIs
  addDatabaseColumn(data: any) {
    return apiClient.post('/admin/schema/add-column', data);
  },
};