// API 基础地址
const API_BASE = '/api';

// 工具函数
function showMessage(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `message ${type} show`;
    setTimeout(() => {
        element.className = 'message';
    }, 5000);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

// API 请求函数
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include' // 包含cookie
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    }
}

// 获取版本信息
async function loadVersion() {
    try {
        const data = await apiRequest('/version');
        if (data.code === 200) {
            document.getElementById('version').textContent = data.data.webVersion || '-';
        }
    } catch (error) {
        console.error('获取版本失败:', error);
    }
}

// 加载配置
async function loadConfig() {
    try {
        const data = await apiRequest('/config');
        if (data.code === 200) {
            const config = data.data || {};
            
            document.getElementById('username').value = config.username || '';
            document.getElementById('password').value = config.password || '';
            document.getElementById('workList').value = (config.workList || []).join('\n');
            document.getElementById('descList').value = (config.descList || []).join('\n');
            
            if (config.workConfig) {
                document.getElementById('projectId').value = config.workConfig.project_id || '';
                document.getElementById('hours').value = config.workConfig.hours || '8';
                document.getElementById('workType').value = config.workConfig.work_type || '';
            }
            
            showMessage('configMessage', '配置加载成功', 'success');
        } else {
            showMessage('configMessage', '加载配置失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('configMessage', '加载配置失败: ' + error.message, 'error');
    }
}

// 保存配置
async function saveConfig() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const workListText = document.getElementById('workList').value.trim();
    const projectId = document.getElementById('projectId').value.trim();
    const hours = document.getElementById('hours').value.trim();
    const descListText = document.getElementById('descList').value.trim();
    const workType = document.getElementById('workType').value.trim();

    if (!username || !password) {
        showMessage('configMessage', '用户名和密码不能为空', 'error');
        return;
    }

    if (!workListText) {
        showMessage('configMessage', '工作日期列表不能为空', 'error');
        return;
    }

    // 解析工作日期列表
    const workList = workListText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // 解析描述列表
    const descList = descListText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // 构建工作配置
    const workConfig = {};
    if (projectId) workConfig.project_id = projectId;
    if (hours) workConfig.hours = hours;
    if (workType) workConfig.work_type = workType;

    const config = {
        username,
        password,
        workList,
        workConfig,
        descList: descList.length > 0 ? descList : undefined
    };

    try {
        const data = await apiRequest('/config', {
            method: 'POST',
            body: JSON.stringify(config)
        });

        if (data.code === 200) {
            showMessage('configMessage', '配置保存成功！', 'success');
        } else {
            showMessage('configMessage', '保存配置失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('configMessage', '保存配置失败: ' + error.message, 'error');
    }
}

// 加载任务状态
async function loadTaskStatus() {
    try {
        const data = await apiRequest('/taskStatus');
        if (data.code === 200) {
            const status = data.data || {};
            
            document.getElementById('lastExecuteTime').textContent = formatDate(status.lastExecuteTime);
            document.getElementById('lastSuccessTime').textContent = formatDate(status.lastSuccessTime);
            document.getElementById('isRunning').textContent = status.isRunning ? '是' : '否';
            
            if (status.lastResult) {
                const result = status.lastResult;
                const resultText = result.success 
                    ? `✓ 成功 - ${result.message} (${formatDate(result.executeTime)})`
                    : `✗ 失败 - ${result.message} (${formatDate(result.executeTime)})`;
                document.getElementById('lastResult').textContent = resultText;
            } else {
                document.getElementById('lastResult').textContent = '-';
            }
        }
    } catch (error) {
        console.error('获取任务状态失败:', error);
    }
}

// 同步工作信息
async function syncWorkInfo() {
    showMessage('statusMessage', '正在同步工作信息...', 'info');
    try {
        const data = await apiRequest('/SyncWorkInfo');
        if (data.code === 200) {
            const workInfoSection = document.getElementById('workInfoSection');
            const workInfo = document.getElementById('workInfo');
            
            workInfo.innerHTML = '<pre>' + JSON.stringify(data.data, null, 2) + '</pre>';
            workInfoSection.style.display = 'block';
            showMessage('statusMessage', '同步工作信息成功', 'success');
        } else {
            showMessage('statusMessage', '同步失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('statusMessage', '同步失败: ' + error.message, 'error');
    }
}

// 手动填写工时
async function manualFillWorkTime() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const workListText = document.getElementById('workList').value.trim();
    const projectId = document.getElementById('projectId').value.trim();
    const hours = document.getElementById('hours').value.trim();
    const descListText = document.getElementById('descList').value.trim();
    const workType = document.getElementById('workType').value.trim();

    if (!username || !password || !workListText || !projectId) {
        showMessage('actionMessage', '请先填写完整配置', 'error');
        return;
    }

    const workList = workListText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const descList = descListText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const workConfig = {
        project_id: projectId,
        hours: hours || '8'
    };
    if (workType) workConfig.work_type = workType;

    showMessage('actionMessage', '正在填写工时...', 'info');

    try {
        const data = await apiRequest('/AutoWorkTime', {
            method: 'POST',
            body: JSON.stringify({
                username,
                password,
                workList,
                workConfig,
                descList: descList.length > 0 ? descList : undefined
            })
        });

        if (data.code === 200) {
            showMessage('actionMessage', '填写工时成功！', 'success');
            // 刷新任务状态
            setTimeout(() => {
                loadTaskStatus();
            }, 1000);
        } else {
            showMessage('actionMessage', '填写失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('actionMessage', '填写失败: ' + error.message, 'error');
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 加载版本信息
    loadVersion();

    // 加载配置
    loadConfig();

    // 加载任务状态
    loadTaskStatus();

    // 定期刷新任务状态
    setInterval(() => {
        loadTaskStatus();
    }, 30000); // 每30秒刷新一次

    // 绑定事件
    document.getElementById('loadConfig').addEventListener('click', loadConfig);
    document.getElementById('saveConfig').addEventListener('click', saveConfig);
    document.getElementById('refreshStatus').addEventListener('click', loadTaskStatus);
    document.getElementById('syncWorkInfo').addEventListener('click', syncWorkInfo);
    document.getElementById('manualFill').addEventListener('click', manualFillWorkTime);
});

