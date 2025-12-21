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
    <div v-loading="loading">
        <el-page-header @back="goBack" class="page-header">
            <template #content>
                <span class="text-large font-600 mr-3">账号配置: {{ pageTitle }}</span>
            </template>
        </el-page-header>

        <el-row :gutter="20">
            <!-- 左侧：通用配置面板 -->
            <el-col :span="10">
                <!-- 新增：实时游戏数据卡片 -->
                <el-card style="margin-bottom: 20px; background-color: #f0f9eb; border-color: #b3e19d;"
                    v-if="baseInfo.game_data_json">
                    <template #header>
                        <div class="card-header">
                            <span>
                                <el-icon style="vertical-align: middle; margin-right: 5px;">
                                    <DataAnalysis />
                                </el-icon>
                                实时状态
                            </span>
                            <el-tag type="success" size="small" effect="dark">
                                {{ baseInfo.last_game_data_sync ? new
                                    Date(baseInfo.last_game_data_sync).toLocaleString() : '' }}
                            </el-tag>
                        </div>
                    </template>

                    <el-descriptions :column="1" border size="small">
                        <!-- 使用 v-for 遍历 JSON 对象 -->
                        <el-descriptions-item v-for="(val, key) in JSON.parse(baseInfo.game_data_json || '{}')"
                            :key="key" :label="String(key)">
                            <span style="font-weight: bold;">{{ val }}</span>
                        </el-descriptions-item>
                    </el-descriptions>
                </el-card>
                <el-card>
                    <template #header>
                        <div class="card-header">
                            <span>账号信息与配置</span>
                            <el-button type="primary" @click="saveSettings">保存修改</el-button>
                        </div>
                    </template>

                    <el-form label-position="top">
                        <el-form-item v-for="field in formFields" :key="field.key" :label="field.label">
                            <!-- Case 1: 文本输入框 -->
                            <el-input v-if="field.type === 'text'" v-model="formData[field.key]" />

                            <!-- Case 2: 开关 -->
                            <el-switch v-if="field.type === 'boolean'" v-model="formData[field.key]" />

                            <!-- Case 3: 新增下拉选择框 -->
                            <el-select v-if="field.type === 'select'" v-model="formData[field.key]" placeholder="请选择"
                                style="width: 100%">
                                <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label"
                                    :value="opt.value" />
                            </el-select>

                        </el-form-item>



                        <el-divider />

                        <!-- 单独的密码修改区域 -->
                        <div class="password-section">
                            <h4>重置游戏密码</h4>
                            <div style="display: flex; gap: 10px;">
                                <el-input v-model="newPassword" type="password" placeholder="输入新密码" show-password />
                                <el-button type="warning" @click="handleResetPassword" :loading="passwordLoading">
                                    重置
                                </el-button>
                            </div>
                        </div>

                    </el-form>
                </el-card>
            </el-col>

            <!-- 右侧：任务历史 -->
            <el-col :span="14">
                <el-card>
                    <template #header><span>任务记录</span></template>
                    <el-table :data="tasks" stripe height="600px">
                        <el-table-column prop="task_date" label="日期" width="120" sortable />
                        <el-table-column prop="status" label="状态" width="100">
                            <template #default="{ row }">
                                <el-tag
                                    :type="row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'danger' : 'warning'">
                                    {{ row.status }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column prop="log_details" label="日志详情" show-overflow-tooltip />
                    </el-table>
                </el-card>
            </el-col>
        </el-row>
    </div>
</template>

<style scoped>
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.password-section {
    background-color: #fff6f6;
    padding: 15px;
    border-radius: 4px;
    border: 1px solid #ffdede;
}

.password-section h4 {
    margin-top: 0;
    color: #f56c6c;
}
</style>