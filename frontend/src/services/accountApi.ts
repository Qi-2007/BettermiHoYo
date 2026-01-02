import router from '@/router'; // 引入路由实例
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import { ElMessage } from 'element-plus';

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

// --- 新增：响应拦截器 ---
apiClient.interceptors.response.use(
  (response) => {
    // 如果响应成功 (2xx)，直接返回数据
    return response;
  },
  (error) => {
    // 如果响应出错
    if (error.response && error.response.status === 401) {
      // 获取当前路由路径
      const currentPath = router.currentRoute.value.path;
      // 特殊处理：如果是登录页面本身的 401 (比如密码错误)，不要执行全局登出逻辑，让 LoginView 自己处理报错信息。
      if (currentPath !== '/login') {
        const authStore = useAuthStore();
        // 1. 清除 Pinia 和 LocalStorage 中的登录状态
        authStore.clearAuth();
        // 2. 提示用户
        ElMessage.error('登录已过期，请重新登录');
        // 3. 强制跳转回登录页
        router.push('/login');
      }
    }
    // 继续把错误抛给具体的组件，以便组件处理 Loading 状态等
    return Promise.reject(error);
  }
);

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
  // User Management
  getAllUsers() { return apiClient.get('/users'); },
  createUser(data: any) { return apiClient.post('/users', data); },
  deleteUser(id: number) { return apiClient.delete(`/users/${id}`); },
  resetUserPassword(id: number, password: string) { return apiClient.put(`/users/${id}/password`, { password }); },
};