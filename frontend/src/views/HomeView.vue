<script setup lang="ts">
import accountApi from '@/services/accountApi';
import { useAuthStore } from '@/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

// -- 状态管理 --
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'admin');
const router = useRouter();
const gameTypeOptions = ref<any[]>([]);
const accounts = ref<any[]>([]); // 存放游戏账号列表
const loading = ref(true); // 页面加载状态
const dialogVisible = ref(false); // 添加账号对话框的显示状态
const newAccountForm = ref({ // 新账号表单数据
  game_type: '',
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

// 新增：获取动态选项
const fetchOptions = async () => {
  try {
    const res = await accountApi.getFieldOptions();
    // 过滤出所有属于 game_type 字段的选项
    gameTypeOptions.value = res.data.filter((opt: any) => opt.field_key === 'game_type');
  } catch (e) {
    console.error('获取选项失败', e);
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
    newAccountForm.value = { game_type: '', game_username: '', game_password: '' }; // 重置表单
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

// 辅助函数：根据状态返回 Tag 类型
const getStatusType = (status: string) => {
  switch (status) {
    case 'SUCCESS': return 'success';
    case 'FAILED': return 'danger';
    case 'RUNNING': return 'primary'; // 蓝色
    case 'PENDING': return 'warning'; // 黄色
    default: return 'info'; // 灰色 (NONE)
  }
};

// 辅助函数：根据状态返回中文
const getStatusText = (status: string) => {
  switch (status) {
    case 'SUCCESS': return '已完成';
    case 'FAILED': return '失败';
    case 'RUNNING': return '进行中';
    case 'PENDING': return '等待中';
    default: return '未计划';
  }
};

// 组件挂载时自动加载数据
onMounted(() => {
  fetchAccounts();
  fetchOptions();
});
</script>
<template>
  <div class="page-container">

    <!-- 顶部操作栏 -->
    <div class="action-bar">
      <span class="page-title">游戏账号列表</span>
      <el-button type="primary" size="small" @click="dialogVisible = true" >添加</el-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-box" v-loading="true"></div>

    <div v-else>
      <!-- 视图 A: PC端 表格视图 (屏幕宽时显示) -->
      <div class="pc-view">
        <el-card shadow="never">
          <el-table :data="accounts" stripe style="width: 100%" @row-click="goToDetail">
            <el-table-column prop="id" label="ID" width="60" /><el-table-column label="游戏" width="100">
              <template #default="{ row }">{{ row.game_type_label }}</template>
            </el-table-column>
            <el-table-column v-if="isAdmin" prop="owner_name" label="所属用户" width="100">
              <template #default="{ row }">
                <!-- 为了明显，可以用个 Tag -->
                <el-tag type="info" size="small">{{ row.owner_name }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="game_username" label="账号" />
            <el-table-column label="今日任务" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="getStatusType(row.today_task_status)">
                  {{ getStatusText(row.today_task_status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-switch v-model="row.is_enabled" size="small" @change="() => handleStatusChange(row)" @click.stop />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="right">
              <template #default="{ row }">
                <el-button type="danger" size="small" link @click.stop="handleDelete(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <!-- 视图 B: 移动端 卡片列表视图 (屏幕窄时显示) -->
      <div class="mobile-view">
        <el-empty v-if="accounts.length === 0" description="暂无账号" />

        <div v-for="item in accounts" :key="item.id" class="mobile-card" @click="goToDetail(item)">
          <div class="card-top">
            <div class="game-info">
              <el-tag size="small" effect="plain">{{ item.game_type_label }}</el-tag>
              <span class="username">{{ item.game_username }}</span>
            </div>
            <!-- 新增：状态小标签 -->
            <el-tag size="small" :type="getStatusType(item.today_task_status)" effect="dark"
              style="margin-left: auto; margin-right: 10px;">
              {{ getStatusText(item.today_task_status) }}
            </el-tag>
            <div class="status-switch" @click.stop>
              <el-switch v-model="item.is_enabled" size="default" @change="() => handleStatusChange(item)" />
            </div>
          </div>

          <div class="card-bottom">
            <span class="id-text">ID: {{ item.id }}</span>
            <el-button type="danger" size="small" plain @click.stop="handleDelete(item.id)">删除</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加账号对话框 (保持不变) -->
    <el-dialog v-model="dialogVisible" title="添加账号" width="90%" style="max-width: 400px;">
      <el-form :model="newAccountForm" label-position="top">
        <el-form-item label="游戏类型">
         <el-select v-model="newAccountForm.game_type" placeholder="请选择" style="width: 100%">
            <el-option v-for="opt in gameTypeOptions" :key="opt.id" :label="opt.option_label"
              :value="opt.option_value" />
          </el-select>
        </el-form-item>
        <el-form-item label="游戏用户名">
          <el-input v-model="newAccountForm.game_username" />
        </el-form-item>
        <el-form-item label="游戏密码">
          <el-input v-model="newAccountForm.game_password" type="password" show-password />
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
  /* 移除不必要的 padding */
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  background: #fff;
  padding: 10px 15px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.page-title {
  font-weight: bold;
  color: #303133;
}

/* --- 响应式控制的核心 --- */

/* 默认显示 PC 视图，隐藏 Mobile 视图 */
.pc-view {
  display: block;
}

.mobile-view {
  display: none;
}

/* 当屏幕宽度小于 768px (手机/iPad竖屏) 时 */
@media (max-width: 768px) {
  .pc-view {
    display: none;
  }

  .mobile-view {
    display: block;
  }
}

/* --- 移动端卡片样式 --- */
.mobile-card {
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 12px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  border: 1px solid #ebeef5;
  cursor: pointer;
  transition: transform 0.1s;
}

.mobile-card:active {
  background-color: #f9f9f9;
  transform: scale(0.98);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.game-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.username {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f0f2f5;
  padding-top: 10px;
}

.id-text {
  font-size: 12px;
  color: #909399;
}

.loading-box {
  height: 200px;
}
</style>