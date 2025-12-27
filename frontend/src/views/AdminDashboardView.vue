<script setup lang="ts">
import api from '@/services/accountApi';
import { CloseBold, Plus, Refresh, SwitchButton, VideoPlay, Warning } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, onUnmounted, ref } from 'vue';

// --- 状态定义 ---
const activeAdminTab = ref('dashboard');
const status = ref<any>(null);
const loading = ref(true);
const switchLoading = ref(false);
let pollInterval: any = null;

// 判断是否为手机端的简单逻辑 (用于 el-descriptions 的列数控制)
const isMobile = computed(() => window.innerWidth < 768);

// 字段配置相关
const fieldConfigs = ref<any[]>([]);
const fieldOptions = ref<any[]>([]);
const newConfig = ref({ field_key: '', label: '', input_type: 'text', display_order: 0 });
const newOption = ref({ field_key: '', option_label: '', option_value: '' });
const newColumn = ref({ name: '', type: 'TEXT', default: '' });
const isAddingColumn = ref(false);

// --- 1. 系统监控与控制逻辑 ---

const fetchStatus = async () => {
  try {
    const response = await api.getSystemStatus();
    status.value = response.data;
  } catch (error) {
    status.value = {
      computer: { isConnected: false, lastSeen: 'N/A' },
      plug: { power: '通信失败', isOn: false }
    };
  } finally {
    loading.value = false;
  }
};

const handleToggleSwitch = async () => {
  switchLoading.value = true;
  try {
    const response = await api.togglePlugSwitch();
    ElMessage.success(response.data.message);
    await fetchStatus();
  } catch (error) {
    ElMessage.error('操作失败');
    await fetchStatus();
  } finally {
    switchLoading.value = false;
  }
};

const handleWakeup = async () => {
  try {
    await api.triggerWakeup();
    ElMessage.success('网络唤醒指令已发送');
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleShutdown = () => {
  ElMessageBox.confirm(
    '这将通过 SSH 向游戏电脑发送标准的关机指令。确定吗？',
    '正常关机',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' }
  ).then(async () => {
    try {
      await api.triggerShutdown();
      ElMessage.success('关机指令已发送');
    } catch (error: any) {
      ElMessage.error('操作失败');
    }
  });
};

const handleForceRestart = () => {
  ElMessageBox.confirm(
    '这将通过SSH尝试关机，然后强制断电重启。确定要执行吗？',
    '高危操作警告',
    { confirmButtonText: '确定执行', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      await api.triggerForceRestart();
      ElMessage.info('强制重启流程已在后台启动');
    } catch (error) {
      ElMessage.error('操作失败');
    }
  });
};

const beforePlugChange = () => {
  return new Promise((resolve) => {
    ElMessageBox.confirm(
      '确定要切换排插电源状态吗？如果电脑正在运行，这可能会导致数据丢失！',
      '电源操作警告',
      {
        confirmButtonText: '确定切换',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(() => {
      resolve(true); // 用户点击确定，允许切换
    }).catch(() => {
      resolve(false); // 用户取消，阻止切换
    });
  });
};

// --- 2. 字段元数据管理逻辑 ---

const fetchMetadata = async () => {
  try {
    const [configs, options] = await Promise.all([
      api.getFieldConfigs(),
      api.getFieldOptions()
    ]);
    fieldConfigs.value = configs.data;
    fieldOptions.value = options.data;
  } catch (e) { console.error(e); }
};

const handleSaveConfig = async () => {
  if (!newConfig.value.field_key || !newConfig.value.label) return ElMessage.warning('不完整');
  try {
    await api.saveFieldConfig(newConfig.value);
    ElMessage.success('保存成功');
    fetchMetadata();
    newConfig.value.field_key = ''; newConfig.value.label = '';
  } catch (e) { ElMessage.error('保存失败'); }
};

const handleDeleteConfig = async (id: number) => {
  try { await api.deleteFieldConfig(id); fetchMetadata(); } catch (e) { ElMessage.error('失败'); }
};

const handleAddOption = async () => {
  if (!newOption.value.field_key || !newOption.value.option_label) return ElMessage.warning('不完整');
  try {
    await api.addFieldOption(newOption.value);
    ElMessage.success('添加成功');
    fetchMetadata();
    newOption.value = { field_key: '', option_label: '', option_value: '' };
  } catch (e) { ElMessage.error('添加失败'); }
};

const handleDeleteOption = async (id: number) => {
  try { await api.deleteFieldOption(id); fetchMetadata(); } catch (e) { ElMessage.error('失败'); }
};

const handleAddColumn = () => {
  if (!newColumn.value.name) return ElMessage.warning('请输入字段名');
  ElMessageBox.confirm(`确定添加字段 "${newColumn.value.name}" 吗？此操作不可撤销。`, '高危操作', { type: 'warning' })
    .then(async () => {
      isAddingColumn.value = true;
      try {
        await api.addDatabaseColumn({
          column_name: newColumn.value.name,
          data_type: newColumn.value.type,
          default_value: newColumn.value.default
        });
        ElMessage.success('字段添加成功');
        newColumn.value = { name: '', type: 'TEXT', default: '' };
        fetchMetadata();
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '添加失败');
      } finally {
        isAddingColumn.value = false;
      }
    });
};

// --- 生命周期 ---
onMounted(() => {
  fetchStatus();
  fetchMetadata();
  pollInterval = setInterval(fetchStatus, 5000);
});

onUnmounted(() => {
  clearInterval(pollInterval);
});
</script>

<template>
  <div class="admin-container">
    <el-tabs v-model="activeAdminTab" type="card">

      <!-- Tab 1: 监控与控制 -->
      <el-tab-pane label="监控与控制" name="dashboard">
        <el-row :gutter="20">

          <!-- 控制面板 (手机端优先显示: order-xs-1) -->
          <el-col :xs="24" :md="8" class="mb-20 order-xs-1">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>远程控制</span>
                  <el-tag type="info" size="small">操作</el-tag>
                </div>
              </template>
              <div class="control-grid">

                <div class="control-item plug-control">
                  <div class="plug-info">
                    <span class="label">智能排插</span>
                    <span class="power-val" v-if="status">{{ status.plug.power }}</span>
                  </div>
                  <el-switch v-if="status" v-model="status.plug.isOn" :loading="switchLoading" :before-change="beforePlugChange"
                    @change="handleToggleSwitch" size="large" inline-prompt active-text="ON" inactive-text="OFF"
                    style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949;" />
                </div>

                <el-divider style="margin: 10px 0;" />

                <div class="btn-grid">
                  <el-button type="primary" size="large" @click="handleWakeup" :icon="VideoPlay">网络唤醒</el-button>
                  <el-button type="warning" size="large" @click="handleShutdown" :icon="SwitchButton">正常关机</el-button>
                  <el-button type="danger" size="large" @click="handleForceRestart" :icon="Refresh">强制重启</el-button>
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 系统状态 (手机端次序显示: order-xs-2) -->
          <el-col :xs="24" :md="16" class="mb-20 order-xs-2">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>游戏电脑状态</span>
                  <el-tag :type="status?.computer.isConnected ? 'success' : 'danger'" effect="dark">
                    {{ status?.computer.isConnected ? '在线' : '离线' }}
                  </el-tag>
                </div>
              </template>

              <div v-loading="loading">
                <el-descriptions :column="isMobile ? 1 : 2" border>
                  <el-descriptions-item label="上次心跳">{{ status?.computer.lastSeen || 'N/A' }}</el-descriptions-item>
                  <template v-if="status?.computer.isConnected && status?.computer.data">
                    <el-descriptions-item label="CPU 负载">{{ status.computer.data.cpu_load }} %</el-descriptions-item>
                    <el-descriptions-item label="内存使用">{{ status.computer.data.memory_usage }} %</el-descriptions-item>
                    <el-descriptions-item label="GPU 温度">{{ status.computer.data.gpu_stats?.temperature }}
                      °C</el-descriptions-item>
                    <el-descriptions-item label="GPU 功耗">{{ status.computer.data.gpu_stats?.power }}
                      W</el-descriptions-item>
                  </template>
                </el-descriptions>
                <el-empty v-if="!status?.computer.isConnected" description="等待 Agent 心跳..." :image-size="60" />
              </div>
            </el-card>
          </el-col>

        </el-row>
      </el-tab-pane>

      <!-- Tab 2: 字段元数据管理 -->
      <el-tab-pane label="字段配置" name="metadata">

        <!-- 数据库结构变更 -->
        <el-card class="mb-20 warning-card">
          <template #header>
            <div class="card-header warning-header">
              <span><el-icon>
                  <Warning />
                </el-icon> 添加数据库字段 (DDL)</span>
            </div>
          </template>
          <div class="flex-wrap-box">
            <el-input v-model="newColumn.name" placeholder="字段名 (英文)" class="input-item"></el-input>
            <el-select v-model="newColumn.type" placeholder="类型" class="select-item">
              <el-option label="文本" value="TEXT" />
              <el-option label="数字" value="INTEGER" />
              <el-option label="布尔" value="BOOLEAN" />
            </el-select>
            <el-input v-model="newColumn.default" placeholder="默认值" class="input-item-small" />
            <el-button type="warning" @click="handleAddColumn" :loading="isAddingColumn" :icon="Plus">物理添加</el-button>
          </div>
        </el-card>

        <el-row :gutter="20">
          <!-- 字段显示配置 -->
          <el-col :xs="24" :md="12" class="mb-20">
            <el-card>
              <template #header><span>字段显示配置</span></template>
              <div class="flex-wrap-box mb-10">
                <el-input v-model="newConfig.field_key" placeholder="字段名" class="input-item-small" />
                <el-input v-model="newConfig.label" placeholder="显示名" class="input-item-small" />
                <el-select v-model="newConfig.input_type" placeholder="控件" class="select-item-small">
                  <el-option label="文本" value="text" />
                  <el-option label="开关" value="boolean" />
                  <el-option label="下拉" value="select" />
                </el-select>
                <el-input v-model.number="newConfig.display_order" placeholder="序" type="number" style="width: 60px" />
                <el-button type="primary" circle :icon="Plus" @click="handleSaveConfig"></el-button>
              </div>
              <el-table :data="fieldConfigs" stripe height="300" size="small">
                <el-table-column prop="field_key" label="字段" show-overflow-tooltip />
                <el-table-column prop="label" label="显示名" />
                <el-table-column prop="input_type" label="类型" width="60" />
                <el-table-column label="操作" width="60">
                  <template #default="{ row }">
                    <el-button type="danger" link :icon="CloseBold" @click="handleDeleteConfig(row.id)"></el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>

          <!-- 下拉选项值 -->
          <el-col :xs="24" :md="12" class="mb-20">
            <el-card>
              <template #header><span>下拉选项值</span></template>
              <div class="flex-wrap-box mb-10">
                <el-input v-model="newOption.field_key" placeholder="字段名" class="input-item-small" />
                <el-input v-model="newOption.option_label" placeholder="标签" class="input-item-small" />
                <el-input v-model="newOption.option_value" placeholder="值" class="input-item-small" />
                <el-button type="primary" circle :icon="Plus" @click="handleAddOption"></el-button>
              </div>
              <el-table :data="fieldOptions" stripe height="300" size="small">
                <el-table-column prop="field_key" label="字段" show-overflow-tooltip />
                <el-table-column prop="option_label" label="标签" />
                <el-table-column prop="option_value" label="值" />
                <el-table-column label="操作" width="60">
                  <template #default="{ row }">
                    <el-button type="danger" link :icon="CloseBold" @click="handleDeleteOption(row.id)"></el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>

      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.admin-container {
  padding-bottom: 30px;
}

.mb-20 {
  margin-bottom: 20px;
}

.mb-10 {
  margin-bottom: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Flex 排序：手机上让控制卡片在前面 */
@media (max-width: 768px) {
  .order-xs-1 {
    order: 1;
  }

  .order-xs-2 {
    order: 2;
  }
}

/* 控制面板样式 */
.control-grid {
  display: flex;
  flex-direction: column;
}

.plug-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
}

.plug-info {
  display: flex;
  flex-direction: column;
}

.plug-info .label {
  font-weight: bold;
  color: #606266;
}

.plug-info .power-val {
  font-size: 18px;
  color: #409eff;
  font-weight: bold;
}

.btn-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.btn-grid .el-button {
  margin-left: 0 !important;
  /* 强制移除左边距 */
  width: 100%;
  /* 确保按钮填满网格单元 */
}

@media (min-width: 768px) {
  .btn-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

/* 配置面板样式 */
.warning-card {
  border: 1px solid #e6a23c;
}

.warning-header {
  color: #e6a23c;
  font-weight: bold;
}

.flex-wrap-box {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.input-item {
  width: 100%;
  max-width: 250px;
}

.input-item-small {
  flex: 1;
  min-width: 80px;
}

.select-item {
  width: 100px;
}

.select-item-small {
  width: 90px;
}
</style>