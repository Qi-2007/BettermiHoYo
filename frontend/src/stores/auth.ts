import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'));

  // Getters
  const isAuthenticated = computed(() => !!token.value);

  // Actions
  function setAuth({ newToken, newUser }: { newToken: string, newUser: any }) {
    user.value = newUser; // newUser 对象现在应包含 id, username, role
    token.value = newToken;
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('token', newToken);
  }

  function clearAuth() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  return { token, user, isAuthenticated, setAuth, clearAuth };
});