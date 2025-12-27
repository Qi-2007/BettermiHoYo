<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { CaretBottom, UserFilled } from '@element-plus/icons-vue'; // 需要引入图标
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
      <!-- 头部：使用 Flex 布局两端对齐 -->
      <el-header class="main-header">
        <div class="logo-area">
          <span class="title">BGI 面板</span>
        </div>

        <!-- 右侧用户信息：使用下拉菜单节省空间 -->
        <el-dropdown trigger="click">
          <span class="user-info">
            <el-icon class="avatar-icon">
              <UserFilled />
            </el-icon>
            <span class="username">{{ authStore.user?.username }}</span>
            <el-icon class="el-icon--right">
              <CaretBottom />
            </el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>角色: {{ authStore.user?.role }}</el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout" style="color: #f56c6c;">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="main-content">
        <!-- 标签页：设置 stretch 属性让标签在手机上自动撑满一行 -->
        <el-tabs v-model="activeTab" @tab-click="handleTabClick" stretch class="nav-tabs">
          <el-tab-pane label="账号" name="home"></el-tab-pane>
          <el-tab-pane label="日历" name="calendar"></el-tab-pane>
          <el-tab-pane v-if="isAdmin" label="管理" name="admin"></el-tab-pane>
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
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  padding: 0 15px;
  /* 减小内边距 */
  height: 50px;
  /* 减小高度 */
}

.title {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #606266;
}

.username {
  margin: 0 5px;
  max-width: 80px;
  /* 防止用户名太长撑开 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main-content {
  padding: 10px;
  /* 手机端不需要太大留白 */
  background-color: #f5f7fa;
  min-height: calc(100vh - 50px);
}

.nav-tabs {
  background: #fff;
  padding: 5px 10px 0 10px;
  border-radius: 4px;
}

.view-wrapper {
  margin-top: 15px;
}
</style>