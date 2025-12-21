<script setup lang="ts">
import api from '@/services/accountApi';
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, onUnmounted, ref } from 'vue';

const status = ref<any>(null);
const loading = ref(true);
const switchLoading = ref(false); // 用于控制开关的加载状态
const activeAdminTab = ref('dashboard'); // 控制子 Tab
const fieldOptions = ref<any[]>([]);
const newOption = ref({ field_key: '', option_label: '', option_value: '' });
let pollInterval: any = null;

const fetchStatus = async () => {
  try {
    const response = await api.getSystemStatus();
    status.value = response.data;
  } catch (error) {
    console.error('Failed to fetch system status:', error);
    status.value = {
      computer: { isConnected: false, lastSeen: 'N/A' },
      plug: { power: '通信失败', isOn: false }
    };
  } finally {
    loading.value = false;
  }
};

// 开关状态改变时触发
const handleToggleSwitch = async () => {
  switchLoading.value = true;
  try {
    const response = await api.togglePlugSwitch();
    ElMessage.success(response.data.message);
    // 操作成功后，立即更新一次状态，确保UI同步
    await fetchStatus();
  } catch (error) {
    ElMessage.error('操作失败');
    // 如果操作失败，状态可能没变，也刷新一下以获取真实状态
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

const handleForceRestart = () => {
  ElMessageBox.confirm(
    '这将通过SSH尝试关机，然后强制断电重启。确定要执行吗？',
    '高危操作警告',
    {
      confirmButtonText: '确定执行',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await api.triggerForceRestart();
      ElMessage.info('强制重启流程已在后台启动');
    } catch (error) {
      ElMessage.error('操作失败');
    }
  });
};

// 新增正常关机处理函数
const handleShutdown = () => {
  ElMessageBox.confirm(
    '这将通过 SSH 向游戏电脑发送标准的关机指令。确定吗？',
    '正常关机',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    }
  ).then(async () => {
    try {
      await api.triggerShutdown();
      ElMessage.success('关机指令已发送');
    } catch (error: any) {
      const msg = error.response?.data?.message || '操作失败';
      ElMessage.error(msg);
    }
  });
};


// 加载字段选项
const fetchFieldOptions = async () => {
  try {
    const res = await api.getFieldOptions();
    fieldOptions.value = res.data;
  } catch (e) {
    console.error(e);
  }
};

// 添加选项
const handleAddOption = async () => {
  if (!newOption.value.field_key || !newOption.value.option_label || !newOption.value.option_value) {
    ElMessage.warning('请填写完整');
    return;
  }
  try {
    await api.addFieldOption(newOption.value);
    ElMessage.success('添加成功');
    fetchFieldOptions();
    newOption.value = { field_key: '', option_label: '', option_value: '' };
  } catch (e) {
    ElMessage.error('添加失败');
  }
};

// 删除选项
const handleDeleteOption = async (id: number) => {
  try {
    await api.deleteFieldOption(id);
    ElMessage.success('删除成功');
    fetchFieldOptions();
  } catch (e) {
    ElMessage.error('删除失败');
  }
};


// 新增状态
const fieldConfigs = ref<any[]>([]);
const newConfig = ref({ field_key: '', label: '', input_type: 'text', display_order: 0 });

// 加载配置
const fetchFieldConfigs = async () => {
  try {
    const res = await api.getFieldConfigs();
    fieldConfigs.value = res.data;
  } catch (e) { console.error(e); }
};

// 保存配置
const handleSaveConfig = async () => {
  if (!newConfig.value.field_key || !newConfig.value.label) {
    ElMessage.warning('字段名和显示名必填');
    return;
  }
  try {
    await api.saveFieldConfig(newConfig.value);
    ElMessage.success('配置保存成功');
    fetchFieldConfigs();
    // 清空表单但不清空 input_type，方便连续添加
    newConfig.value.field_key = '';
    newConfig.value.label = '';
  } catch (e) { ElMessage.error('保存失败'); }
};

// 删除配置
const handleDeleteConfig = async (id: number) => {
  try {
    await api.deleteFieldConfig(id);
    fetchFieldConfigs();
  } catch (e) { ElMessage.error('删除失败'); }
};

// 数据库结构管理
const newColumn = ref({ name: '', type: 'TEXT', default: '' });
const isAddingColumn = ref(false);

const handleAddColumn = () => {
  if (!newColumn.value.name) {
    ElMessage.warning('请输入字段名');
    return;
  }
  // 简单的前端正则校验
  if (!/^[a-zA-Z0-9_]+$/.test(newColumn.value.name)) {
    ElMessage.error('字段名只能包含字母、数字和下划线');
    return;
  }

  ElMessageBox.confirm(
    `确定要向数据库 GameAccounts 表添加字段 "${newColumn.value.name}" 吗？此操作不可撤销。`,
    '高危操作确认',
    {
      confirmButtonText: '确定添加',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    isAddingColumn.value = true;
    try {
      await api.addDatabaseColumn({
        column_name: newColumn.value.name,
        data_type: newColumn.value.type,
        default_value: newColumn.value.default
      });
      ElMessage.success('字段添加成功');

      // 清空表单
      newColumn.value = { name: '', type: 'TEXT', default: '' };
      // 刷新下方的配置列表，因为后端自动插入了默认配置
      fetchFieldConfigs();
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || '添加失败');
    } finally {
      isAddingColumn.value = false;
    }
  });
};

// --- 生命周期钩子 ---
onMounted(() => {
  fetchStatus(); // 立即获取一次
  fetchFieldOptions(); // 加载选项数据
  fetchFieldConfigs(); // 别忘了调用
  pollInterval = setInterval(fetchStatus, 5000); // 每5秒轮询一次
});

onUnmounted(() => {
  clearInterval(pollInterval); // 组件销毁时清除定时器，防止内存泄漏
});
</script>

<template>
  <el-tabs v-model="activeAdminTab" type="card">
    <el-tab-pane label="系统监控与控制" name="dashboard">
      <el-row :gutter="20">
        <!-- 系统状态 -->
        <el-col :span="16">
          <el-card>
            <template #header><span>游戏电脑状态</span></template>
            <div v-loading="loading">
              <el-descriptions v-if="status" :column="2" border>
                <!-- 电脑状态 -->
                <el-descriptions-item label="连接状态">
                  <el-tag :type="status.computer.isConnected ? 'success' : 'danger'">
                    {{ status.computer.isConnected ? '已连接' : '已断开' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="上次心跳">{{ status.computer.lastSeen || '无' }}</el-descriptions-item>

                <template v-if="status.computer.isConnected && status.computer.data">
                  <!-- ... (CPU, 内存, GPU 等信息保持不变) ... -->
                  <el-descriptions-item label="CPU 负载">{{ status.computer.data.cpu_load }} %</el-descriptions-item>
                  <el-descriptions-item label="内存使用">{{ status.computer.data.memory_usage }} %</el-descriptions-item>
                  <el-descriptions-item label="GPU 温度">{{ status.computer.data.gpu_stats?.temperature }}
                    °C</el-descriptions-item>
                  <el-descriptions-item label="GPU 功耗">{{ status.computer.data.gpu_stats?.power }}
                    W</el-descriptions-item>
                </template>

                <!-- 排插状态 -->
                <el-descriptions-item label="排插开关状态" :span="2">
                  <el-tag :type="status.plug.isOn ? 'success' : 'info'">
                    {{ status.plug.isOn ? '已开启' : '已关闭' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="实时总功率" :span="2">
                  <span style="font-size: 1.2em; font-weight: bold;">{{ status.plug.power }}</span>
                </el-descriptions-item>

              </el-descriptions>
              <el-empty v-else description="暂无状态数据"></el-empty>
            </div>
          </el-card>
        </el-col>

        <!-- 控制操作 -->
        <el-col :span="8">
          <el-card>
            <template #header><span>远程控制</span></template>
            <div class="control-grid">
              <div class="control-item">
                <span class="control-label">智能排插</span>
                <el-switch v-if="status" v-model="status.plug.isOn" :loading="switchLoading"
                  @change="handleToggleSwitch" size="large" inline-prompt active-text="ON" inactive-text="OFF" />
                <el-skeleton v-else :rows="0" animated />
              </div>
              <el-button type="primary" @click="handleWakeup">网络唤醒 (WOL)</el-button>
              <el-button type="warning" @click="handleShutdown">正常关机 (SSH)</el-button> <!-- 新增按钮 -->
              <el-button type="danger" @click="handleForceRestart">强制重启电脑</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-tab-pane>

    <el-tab-pane label="字段元数据管理" name="metadata">
      <!-- 区域 0: 数据库结构操作 (新增) -->
      <el-card style="margin-bottom: 20px; border-color: #e6a23c;">
        <template #header>
          <span style="color: #e6a23c; font-weight: bold;">
            <el-icon>
              <Warning />
            </el-icon> 数据库结构变更 (DDL)
          </span>
        </template>
        <div class="add-option-box">
          <el-input v-model="newColumn.name" placeholder="字段英文名" style="width: 300px">
            <template #prepend>GameAccounts.</template>
          </el-input>

          <el-select v-model="newColumn.type" placeholder="类型" style="width: 160px">
            <el-option label="文本 (TEXT)" value="TEXT" />
            <el-option label="数字 (INTEGER)" value="INTEGER" />
            <el-option label="布尔 (BOOLEAN)" value="BOOLEAN" />
          </el-select>

          <el-input v-model="newColumn.default" placeholder="默认值 (可选)" style="width: 150px" />

          <el-button type="warning" @click="handleAddColumn" :loading="isAddingColumn">
            添加字段
          </el-button>
        </div>
        <div style="font-size: 12px; color: #909399; margin-top: 5px;">
          注意：字段名只能包含字母、数字和下划线。添加后请在下方配置其中文名和显示类型。
        </div>
      </el-card>
      <!-- 区域 1: 字段属性配置 (Label, Type, Order) -->
      <el-card style="margin-bottom: 20px;">
        <template #header><span>字段显示配置 (Label & Type)</span></template>

        <div class="add-option-box">
          <el-input v-model="newConfig.field_key" placeholder="字段名 (game_username)" style="width: 180px" />
          <el-input v-model="newConfig.label" placeholder="中文显示名 (游戏账号)" style="width: 180px" />
          <el-select v-model="newConfig.input_type" placeholder="类型" style="width: 100px">
            <el-option label="文本" value="text" />
            <el-option label="开关" value="boolean" />
            <el-option label="下拉" value="select" />
          </el-select>
          <el-input v-model.number="newConfig.display_order" placeholder="排序" type="number" style="width: 80px" />
          <el-button type="primary" @click="handleSaveConfig">保存配置</el-button>
        </div>

        <el-table :data="fieldConfigs" stripe height="250">
          <el-table-column prop="field_key" label="字段名" />
          <el-table-column prop="label" label="显示名" />
          <el-table-column prop="input_type" label="类型" />
          <el-table-column prop="display_order" label="排序" />
          <el-table-column label="操作">
            <template #default="{ row }">
              <el-button type="danger" link @click="handleDeleteConfig(row.id)">恢复默认</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 区域 2: 下拉选项配置 (保持原样) -->
     <el-card>
        <template #header><span>下拉选项值 (用于 Select 类型)</span></template>
        <!-- 添加区 -->
        <div class="add-option-box">
          <el-input v-model="newOption.field_key" placeholder="数据库字段名 (如 game_type)" style="width: 200px" />
          <el-input v-model="newOption.option_label" placeholder="显示名称 (如 原神)" style="width: 150px" />
          <el-input v-model="newOption.option_value" placeholder="存入值 (如 Genshin)" style="width: 150px" />
          <el-button type="primary" @click="handleAddOption">添加选项</el-button>
        </div>

        <el-divider />

        <!-- 列表区 -->
        <el-table :data="fieldOptions" stripe style="width: 100%">
          <el-table-column prop="field_key" label="目标字段" sortable />
          <el-table-column prop="option_label" label="显示名称" />
          <el-table-column prop="option_value" label="实际值" />
          <el-table-column label="操作">
            <template #default="{ row }">
              <el-button type="danger" link @click="handleDeleteOption(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-tab-pane>

  </el-tabs>
</template>

<style scoped>
.add-option-box {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.control-grid {
  display: grid;
  gap: 20px;
}

.control-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.control-label {
  font-weight: 500;
}
</style>