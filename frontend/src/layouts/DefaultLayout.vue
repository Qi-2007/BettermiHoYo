<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'admin'); // <-- 新增 computed 属性
const activeTab = ref(route.name || 'home');

const handleTabClick = (pane: any) => {
  router.push({ name: pane.props.name });
};

const handleLogout = () => {
  authStore.clearAuth();
  router.push('/login');
};
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-header class="main-header">
        <div class="title">BGI 控制面板</div>
        <div>
          <span>欢迎, {{ authStore.user?.username }}</span>
          <el-button @click="handleLogout" type="danger" link>退出登录</el-button>
        </div>
      </el-header>
      <el-main class="main-content">
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <el-tab-pane label="账号管理" name="home"></el-tab-pane>
          <el-tab-pane label="任务日历" name="calendar"></el-tab-pane>
          <!-- 使用 v-if 来条件性渲染管理员标签页 -->
          <el-tab-pane v-if="isAdmin" label="管理员面板" name="admin"></el-tab-pane>
        </el-tabs>
        <div class="view-wrapper">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color);
}
.title {
  font-size: 20px;
  font-weight: bold;
}
.main-content {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px); /* 减去 header 高度 */
}
.view-wrapper {
  margin-top: 20px;
}
</style>