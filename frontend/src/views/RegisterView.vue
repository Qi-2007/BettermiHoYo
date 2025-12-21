<script setup lang="ts">
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const form = ref({
  username: '',
  password: '',
  confirmPassword: ''
});
const loading = ref(false);

const handleRegister = async () => {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  if (form.value.password !== form.value.confirmPassword) {
    ElMessage.error('两次输入的密码不一致');
    return;
  }

  loading.value = true;
  try {
    // 调用后端注册接口
    await axios.post('http://localhost:3000/api/auth/register', {
      username: form.value.username,
      password: form.value.password,
    });
    
    ElMessage.success('注册成功！请登录');
    router.push('/login'); // 注册成功后跳回登录页

  } catch (error: any) {
    const msg = error.response?.data?.message || '注册失败';
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="register-container">
    <el-card class="register-card">
      <template #header>
        <div class="card-header">
          <span>注册新账号</span>
        </div>
      </template>
      <el-form label-position="top">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleRegister" :loading="loading" style="width: 100%;">
            立即注册
          </el-button>
        </el-form-item>
        <div style="text-align: center; margin-top: 10px;">
          <router-link to="/login">已有账号？去登录</router-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
}
.register-card {
  width: 400px;
}
</style>