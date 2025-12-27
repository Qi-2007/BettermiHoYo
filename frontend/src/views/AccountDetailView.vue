<script setup lang="ts">
import api from '@/services/accountApi';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const accountId = parseInt(route.params.id as string);

const pageTitle = ref('');
const formFields = ref<any[]>([]); // 存储后端返回的字段元数据
const formData = ref<any>({}); // 存储表单的实际值
const tasks = ref<any[]>([]);
const loading = ref(true);
const baseInfo = ref<any>({}); // 新增一个 ref 专门存 baseInfo

// 密码重置相关
const newPassword = ref('');
const passwordLoading = ref(false);

const loadData = async () => {
    loading.value = true;
    try {
        const [accRes, taskRes] = await Promise.all([
            api.getAccountById(accountId),
            api.getTasksByAccountId(accountId)
        ]);

        // accRes.data 结构: { baseInfo: {...}, fields: [...] }
        pageTitle.value = accRes.data.baseInfo.game_username;
        formFields.value = accRes.data.fields;
        baseInfo.value = accRes.data.baseInfo; 

        // 初始化 formData
        const initialData: any = {};
        accRes.data.fields.forEach((field: any) => {
            initialData[field.key] = field.value;
        });
        formData.value = initialData;

        tasks.value = taskRes.data;
    } catch (error) {
        ElMessage.error('加载数据失败');
    } finally {
        loading.value = false;
    }
};

const saveSettings = async () => {
    try {
        await api.updateAccountSettings(accountId, formData.value);
        ElMessage.success('配置已保存');
    } catch (error) {
        ElMessage.error('保存失败');
    }
};

const handleResetPassword = async () => {
    if (!newPassword.value) {
        ElMessage.warning('请输入新密码');
        return;
    }
    passwordLoading.value = true;
    try {
        await api.resetPassword(accountId, newPassword.value);
        ElMessage.success('密码已重置');
        newPassword.value = ''; // 清空输入框
    } catch (error) {
        ElMessage.error('密码重置失败');
    } finally {
        passwordLoading.value = false;
    }
};

const goBack = () => {
    router.push('/');
};

onMounted(loadData);
</script>
<template>
    <div v-loading="loading" class="detail-container">
        <!-- 头部：使用 PageHeader，手机上稍微紧凑点 -->
        <el-page-header @back="goBack" class="page-header">
            <template #content>
                <div class="header-content">
                    <span class="title">{{ pageTitle }}</span>
                   <el-tag size="small" effect="plain">{{ baseInfo?.game_type_label }}</el-tag>
                </div>
            </template>
        </el-page-header>

        <el-row :gutter="20">

            <!-- 左侧 (手机上是上方): 数据 & 配置 -->
            <!-- xs=24 表示手机占满一行，md=10 表示电脑占 10/24 -->
            <el-col :xs="24" :md="10">

                <!-- 实时数据卡片 -->
                <el-card class="box-card" v-if="baseInfo.game_data_json">
                    <template #header>
                        <div class="card-header">
                            <span>实时状态</span>
                            <span class="time-tag">{{ baseInfo.last_game_data_sync || '' }}</span>
                        </div>
                    </template>
                    <!-- size="small" 让手机显示更紧凑 -->
                    <el-descriptions :column="1" border size="small">
                        <el-descriptions-item v-for="(val, key) in JSON.parse(baseInfo.game_data_json || '{}')"
                            :key="key" :label="String(key)">
                            <span class="data-value">{{ val }}</span>
                        </el-descriptions-item>
                    </el-descriptions>
                </el-card>

                <!-- 配置表单卡片 -->
                <el-card class="box-card">
                    <template #header>
                        <div class="card-header">
                            <span>账号配置</span>
                            <el-button type="primary" size="small" @click="saveSettings">保存</el-button>
                        </div>
                    </template>

                    <el-form label-position="top" size="large"> <!-- 手机上 input 大一点好点 -->
                        <el-form-item v-for="field in formFields" :key="field.key" :label="field.label">
                            <el-input v-if="field.type === 'text'" v-model="formData[field.key]" />
                            <el-switch v-if="field.type === 'boolean'" v-model="formData[field.key]" />
                            <el-select v-if="field.type === 'select'" v-model="formData[field.key]" style="width: 100%">
                                <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label"
                                    :value="opt.value" />
                            </el-select>
                        </el-form-item>

                        <el-divider content-position="left">密码管理</el-divider>
                        <div class="password-box">
                            <el-input v-model="newPassword" type="password" placeholder="新密码" show-password />
                            <el-button type="warning" @click="handleResetPassword"
                                :loading="passwordLoading">重置</el-button>
                        </div>
                    </el-form>
                </el-card>
            </el-col>

            <!-- 右侧 (手机上是下方): 任务流水 -> 改为时间轴 -->
            <el-col :xs="24" :md="14">
                <el-card class="box-card">
                    <template #header><span>任务记录</span></template>

                    <!-- 手机/电脑通用：时间轴视图 (比表格更适合移动端) -->
                    <el-timeline style="padding-left: 0;">
                        <!-- 只显示最近 10 条，避免手机卡顿，或者做分页 -->
                        <el-timeline-item v-for="task in tasks.slice(0, 20)" :key="task.id" :timestamp="task.task_date"
                            placement="top"
                            :type="task.status === 'SUCCESS' ? 'success' : task.status === 'FAILED' ? 'danger' : 'warning'">
                            <el-card shadow="hover" class="log-card">
                                <div class="log-header">
                                    <el-tag size="small"
                                        :type="task.status === 'SUCCESS' ? 'success' : task.status === 'FAILED' ? 'danger' : 'warning'">
                                        {{ task.status }}
                                    </el-tag>
                                    <span class="log-time" v-if="task.completed_at">
                                        {{ new Date(task.completed_at).toLocaleTimeString() }}
                                    </span>
                                </div>
                                <div class="log-content">
                                    {{ task.log_details || '暂无日志' }}
                                </div>
                            </el-card>
                        </el-timeline-item>
                    </el-timeline>

                    <el-empty v-if="tasks.length === 0" description="暂无记录" />
                </el-card>
            </el-col>
        </el-row>
    </div>
</template>

<style scoped>
/* 增加底部留白，防止手机底部导航栏遮挡 */
.detail-container {
    padding-bottom: 30px;
}

.box-card {
    margin-bottom: 15px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-content {
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;
}

.title {
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
}

.time-tag {
    font-size: 12px;
    color: #909399;
}

.data-value {
    font-weight: bold;
    color: #409eff;
}

.password-box {
    display: flex;
    gap: 10px;
}

/* 日志卡片优化 */
.log-card :deep(.el-card__body) {
    padding: 10px;
}

.log-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
}

.log-content {
    font-size: 13px;
    color: #606266;
    line-height: 1.4;
    word-break: break-all;
}
</style>