<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const loading = ref(false);

const handleLogin = async () => {
  if (!username.value || !password.value) {
    ElMessage.error('Please enter username and password');
    return;
  }
  loading.value = true;
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      username: username.value,
      password: password.value,
    });
    
    // 修正：从 response.data 中完整地获取 id, username 和 role
    authStore.setAuth({
      newToken: response.data.accessToken,
      newUser: { 
        id: response.data.id, 
        username: response.data.username,
        role: response.data.role // <-- 把 role 加上！
      }
    });

    ElMessage.success('Login successful!');
    router.push('/');

  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
    ElMessage.error(errorMessage);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <span>BGI Control Panel Login</span>
        </div>
      </template>
      <el-form @submit.prevent="handleLogin">
        <el-form-item label="Username">
          <el-input v-model="username" placeholder="Enter your username" />
        </el-form-item>
        <el-form-item label="Password">
          <el-input v-model="password" type="password" placeholder="Enter your password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLogin" :loading="loading" native-type="submit" style="width: 100%;">
            Login
          </el-button>
        </el-form-item>
      </el-form>
      <!-- We can add a link to a registration page later -->
    </el-card>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
}
.login-card {
  width: 400px;
}
</style>