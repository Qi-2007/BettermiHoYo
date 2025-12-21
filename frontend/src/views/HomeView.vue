<script setup lang="ts">
import accountApi from '@/services/accountApi';
import { useAuthStore } from '@/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

// -- 状态管理 --
const authStore = useAuthStore();
const router = useRouter();
const accounts = ref<any[]>([]); // 存放游戏账号列表
const loading = ref(true); // 页面加载状态
const dialogVisible = ref(false); // 添加账号对话框的显示状态
const newAccountForm = ref({ // 新账号表单数据
  game_type: 'GameA',
  game_username: '',
  game_password: '',
});

// -- 方法 --

// 获取游戏账号列表
const fetchAccounts = async () => {
  loading.value = true;
  try {
    const response = await accountApi.getAccounts();
    accounts.value = response.data;
  } catch (error) {
    ElMessage.error('加载账号列表失败');
  } finally {
    loading.value = false;
  }
};

// 提交新账号
const handleAddAccount = async () => {
  if (!newAccountForm.value.game_username || !newAccountForm.value.game_password) {
    ElMessage.warning('请填写用户名和密码');
    return;
  }
  try {
    await accountApi.addAccount(newAccountForm.value);
    ElMessage.success('添加成功');
    dialogVisible.value = false; // 关闭对话框
    newAccountForm.value = { game_type: 'GameA', game_username: '', game_password: '' }; // 重置表单
    await fetchAccounts(); // 重新加载列表
  } catch (error) {
    ElMessage.error('添加失败');
  }
};

// 处理删除账号
const handleDelete = (id: number) => {
  ElMessageBox.confirm('确定要删除这个游戏账号吗？此操作不可逆。', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await accountApi.deleteAccount(id);
      ElMessage.success('删除成功');
      await fetchAccounts(); // 重新加载列表
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};

const goToDetail = (row: any) => {
  router.push({ name: 'account-detail', params: { id: row.id } });
};

// 处理状态切换
const handleStatusChange = async (row: any) => {
  try {
    await accountApi.updateAccountStatus(row.id, row.is_enabled);
    ElMessage.success(`账号 ${row.game_username} 状态已更新`);
  } catch (error) {
    ElMessage.error('更新状态失败');
    // 失败时把开关状态切换回去
    row.is_enabled = !row.is_enabled;
  }
};

// 退出登录
const handleLogout = () => {
  authStore.clearAuth();
  router.push('/login');
};

// 组件挂载时自动加载数据
onMounted(() => {
  fetchAccounts();
});
</script>

<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>欢迎, {{ authStore.user?.username }}! - 游戏账号管理</span>
          <div>
            <el-button type="primary" @click="dialogVisible = true">添加账号</el-button>
            <el-button @click="handleLogout" type="danger">退出登录</el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="accounts" @row-click="goToDetail" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="game_type" label="游戏类型" width="120" />
        <el-table-column prop="game_username" label="游戏用户名" />
        <el-table-column label="是否启用" width="100">
          <template #default="{ row }">
            <el-switch @click.stop v-model="row.is_enabled" @change="() => handleStatusChange(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加账号对话框 -->
    <el-dialog v-model="dialogVisible" title="添加新游戏账号" width="400px">
      <el-form :model="newAccountForm" label-position="top">
        <el-form-item label="游戏类型">
          <el-select v-model="newAccountForm.game_type" placeholder="请选择游戏">
            <el-option label="游戏A (GameA)" value="GameA" />
            <el-option label="游戏B (GameB)" value="GameB" />
            <el-option label="游戏C (GameC)" value="GameC" />
          </el-select>
        </el-form-item>
        <el-form-item label="游戏用户名">
          <el-input v-model="newAccountForm.game_username" placeholder="请输入游戏登录账号" />
        </el-form-item>
        <el-form-item label="游戏密码">
          <el-input v-model="newAccountForm.game_password" type="password" placeholder="请输入游戏登录密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddAccount">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-container {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>