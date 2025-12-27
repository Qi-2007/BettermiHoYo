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
    ElMessage.error('用户名和密码不能为空');
    return;
  }
  loading.value = true;
  try {
    const response = await axios.post('/api/auth/login', {
      username: username.value,
      password: password.value,
    });

    // 从 response.data 中获取 id, username 和 role
    authStore.setAuth({
      newToken: response.data.accessToken,
      newUser: {
        id: response.data.id,
        username: response.data.username,
        role: response.data.role
      }
    });

    ElMessage.success('登录成功!');
    router.push('/');

  } catch (error: any) {
    const errorMessage = error.response?.data?.message || '登录失败，请重试。';
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
          <span>Better miHoYo Panel</span>
        </div>
      </template>
      <el-form @submit.prevent="handleLogin" label-position="left" class="login-form" label-width="60px">
        <el-form-item label="用户名">
          <el-input v-model="username" placeholder="Enter your username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="password" type="password" placeholder="Enter your password" show-password />
        </el-form-item>
        <el-button type="primary" @click="handleLogin" :loading="loading" native-type="submit" style="width: 100%;">
          登录
        </el-button>
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
  width: 100%;
  /* 默认占满 */
  max-width: 400px;
  /* 最大不超过 400px */
  margin: 0 20px;
  /* 左右留点缝隙 */
}
</style>