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

// 存储当前拉取到的项目列表
let currentProjects = [];
// 存储当前拉取到的任务列表
let currentTasks = [];
// 存储所有项目数据（包含完整信息）
let allProjectsData = {};
// 存储所有任务数据
let allTasksData = {};
// 存储原始数据（用于调试和分析）
let rawProjectsData = null;
// 存储待恢复的配置（用于拉取项目后恢复选中状态）
let pendingRestoreConfig = null;

// 加载配置
async function loadConfig() {
    try {
        const data = await apiRequest('/config');
        if (data.code === 200) {
            const config = data.data || {};
            
            document.getElementById('username').value = config.username || '';
            document.getElementById('password').value = config.password || '';
            
            if (config.workConfig) {
                document.getElementById('hours').value = config.workConfig.hours || '8';
                document.getElementById('description').value = config.workConfig.description || config.description || '';
            }
            
            // 保存待恢复的配置
            if (config.selectedProject || config.workConfig?.project_id || config.selectedTask || config.workConfig?.task_id) {
                pendingRestoreConfig = {
                    projectId: config.selectedProject?.project_id || config.selectedProject?.id || config.workConfig?.project_id,
                    taskId: config.selectedTask?.task_id || config.selectedTask?.ts_id || config.selectedTask?.id || config.workConfig?.task_id
                };
                
                // 如果已经拉取过项目，立即恢复选中状态
                if (currentProjects.length > 0 && pendingRestoreConfig.projectId) {
                    restoreProjectSelection();
                }
                // 如果已经拉取过任务，立即恢复选中状态
                if (currentTasks.length > 0 && pendingRestoreConfig.taskId) {
                    setTimeout(() => {
                        const taskSelect = document.getElementById('taskSelect');
                        if (taskSelect && taskSelect.querySelector(`option[value="${pendingRestoreConfig.taskId}"]`)) {
                            taskSelect.value = pendingRestoreConfig.taskId;
                        }
                    }, 100);
                }
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
    const projectSelect = document.getElementById('projectSelect');
    const taskSelect = document.getElementById('taskSelect');
    const hours = document.getElementById('hours').value.trim();
    const description = document.getElementById('description').value.trim();

    // 验证必填项
    if (!username || !password) {
        showMessage('configMessage', '用户名和密码不能为空', 'error');
        return;
    }

    if (!projectSelect.value) {
        showMessage('configMessage', '请先拉取并选择项目', 'error');
        return;
    }

    if (!taskSelect.value) {
        showMessage('configMessage', '请选择任务', 'error');
        return;
    }

    if (!hours || parseFloat(hours) <= 0) {
        showMessage('configMessage', '工时必须大于0', 'error');
        return;
    }

    if (!description) {
        showMessage('configMessage', '工作描述不能为空', 'error');
        return;
    }

    // 获取选中的项目和任务信息
    const selectedProjectId = projectSelect.value;
    const selectedTaskId = taskSelect.value;
    const selectedProject = allProjectsData[selectedProjectId];
    const selectedTask = allTasksData[selectedTaskId];

    // 构建工作配置
    const workConfig = {
        project_id: selectedProjectId,
        task_id: selectedTaskId,
        hours: hours,
        description: description
    };

    const config = {
        username,
        password,
        workConfig,
        selectedProject: selectedProject || undefined,
        selectedTask: selectedTask || undefined
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

// 拉取项目列表
async function fetchProjects() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showMessage('fetchProjectsMessage', '请先填写用户名和密码', 'error');
        return;
    }

    showMessage('fetchProjectsMessage', '正在拉取项目...', 'info');
    
    try {
        const data = await apiRequest('/fetchProjects', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (data.code === 200) {
            // 处理项目数据
            const projectsData = data.data;
            rawProjectsData = projectsData; // 保存原始数据
            
            // 输出完整数据结构用于调试
            console.log('完整项目数据:', projectsData);
            console.log('数据类型:', typeof projectsData, Array.isArray(projectsData) ? '数组' : '对象');
            
            // 按照express-ts的逻辑：项目和任务在同级，需要分别解析
            let projects = [];
            let tasks = [];
            
            if (typeof projectsData === 'object' && !Array.isArray(projectsData)) {
                console.log('数据的所有键:', Object.keys(projectsData));
                
                // 查找项目数据 - 可能的字段名
                const projectKeys = ['project', 'projects', 'project_list', 'projectList', 'data'];
                for (const key of projectKeys) {
                    if (projectsData[key]) {
                        if (Array.isArray(projectsData[key])) {
                            projects = projectsData[key];
                            console.log(`在字段 ${key} 中找到项目列表，数量: ${projects.length}`);
                            break;
                        }
                    }
                }
                
                // 查找任务数据 - 可能的字段名
                const taskKeys = ['task', 'tasks', 'task_list', 'taskList', 'ts', 'ts_list', 'ts_data'];
                for (const key of taskKeys) {
                    if (projectsData[key]) {
                        if (Array.isArray(projectsData[key])) {
                            tasks = projectsData[key];
                            console.log(`在字段 ${key} 中找到任务列表，数量: ${tasks.length}`);
                            break;
                        }
                    }
                }
                
                // 如果还是没找到，尝试遍历所有字段
                if (projects.length === 0 || tasks.length === 0) {
                    for (const key in projectsData) {
                        if (Array.isArray(projectsData[key]) && projectsData[key].length > 0) {
                            const firstItem = projectsData[key][0];
                            // 判断是项目还是任务
                            if (firstItem) {
                                // 项目通常有 project_id 或 projectId
                                if (firstItem.project_id || firstItem.projectId) {
                                    if (projects.length === 0) {
                                        projects = projectsData[key];
                                        console.log(`在字段 ${key} 中找到项目列表（通过project_id判断），数量: ${projects.length}`);
                                    }
                                }
                                // 任务通常有 task_id 或 taskId 或 ts_id
                                if (firstItem.task_id || firstItem.taskId || firstItem.ts_id) {
                                    if (tasks.length === 0) {
                                        tasks = projectsData[key];
                                        console.log(`在字段 ${key} 中找到任务列表（通过task_id判断），数量: ${tasks.length}`);
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (Array.isArray(projectsData)) {
                // 如果数据本身就是数组，需要判断是项目数组还是任务数组
                if (projectsData.length > 0) {
                    const firstItem = projectsData[0];
                    if (firstItem.project_id || firstItem.projectId) {
                        projects = projectsData;
                        console.log('数据是项目数组，数量:', projects.length);
                    } else if (firstItem.task_id || firstItem.taskId || firstItem.ts_id) {
                        tasks = projectsData;
                        console.log('数据是任务数组，数量:', tasks.length);
                    }
                }
            }
            
            currentProjects = projects;
            currentTasks = tasks;
            
            console.log('解析后的项目列表:', currentProjects);
            console.log('解析后的任务列表:', currentTasks);
            console.log('项目数量:', currentProjects.length);
            console.log('任务数量:', currentTasks.length);
            
            if (currentProjects.length === 0 && currentTasks.length === 0) {
                showMessage('fetchProjectsMessage', '未找到项目和任务数据，请查看控制台查看数据结构', 'error');
                return;
            }
            
            // 存储项目数据
            allProjectsData = {};
            currentProjects.forEach((project, index) => {
                const projectId = project.project_id || project.projectId || project.id || project.value || index;
                if (projectId !== undefined && projectId !== null && projectId !== '') {
                    allProjectsData[projectId] = project;
                }
            });
            
            // 存储任务数据
            allTasksData = {};
            currentTasks.forEach((task, index) => {
                const taskId = task.task_id || task.taskId || task.ts_id || task.id || task.value || index;
                if (taskId !== undefined && taskId !== null && taskId !== '') {
                    allTasksData[taskId] = task;
                }
            });

            // 显示项目下拉列表
            if (currentProjects.length > 0) {
                displayProjectSelect(currentProjects);
                document.getElementById('projectSelectionGroup').style.display = 'block';
            }
            
            // 显示任务下拉列表
            if (currentTasks.length > 0) {
                displayTaskSelect(currentTasks);
                document.getElementById('taskSelectionGroup').style.display = 'block';
            }
            
            // 如果有待恢复的配置，恢复选中状态
            if (pendingRestoreConfig) {
                if (pendingRestoreConfig.projectId && currentProjects.length > 0) {
                    restoreProjectSelection();
                }
                if (pendingRestoreConfig.taskId && currentTasks.length > 0) {
                    setTimeout(() => {
                        const taskSelect = document.getElementById('taskSelect');
                        if (taskSelect && taskSelect.querySelector(`option[value="${pendingRestoreConfig.taskId}"]`)) {
                            taskSelect.value = pendingRestoreConfig.taskId;
                        }
                    }, 100);
                }
            }
            
            const projectCount = currentProjects.length;
            const taskCount = currentTasks.length;
            let successMsg = '';
            if (projectCount > 0 && taskCount > 0) {
                successMsg = `成功拉取 ${projectCount} 个项目和 ${taskCount} 个任务`;
            } else if (projectCount > 0) {
                successMsg = `成功拉取 ${projectCount} 个项目`;
            } else if (taskCount > 0) {
                successMsg = `成功拉取 ${taskCount} 个任务`;
            }
            showMessage('fetchProjectsMessage', successMsg, 'success');
        } else {
            showMessage('fetchProjectsMessage', '拉取项目失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('fetchProjectsMessage', '拉取项目失败: ' + error.message, 'error');
    }
}

// 显示项目下拉列表
function displayProjectSelect(projects) {
    const projectSelect = document.getElementById('projectSelect');
    projectSelect.innerHTML = '<option value="">-- 请选择项目 --</option>';

    projects.forEach((project) => {
        // 按照express-ts的逻辑：project_id 和 name
        const projectId = project.project_id || project.projectId || project.id;
        const projectName = project.name || project.project_name || project.projectName || '';
        
        if (projectId !== undefined && projectId !== null && projectId !== '') {
            const option = document.createElement('option');
            option.value = projectId;
            
            // 格式：project_id - name
            if (projectName) {
                option.textContent = `${projectId} - ${projectName}`;
            } else {
                option.textContent = projectId.toString();
            }
            
            projectSelect.appendChild(option);
        }
    });

    // 任务不再依赖项目，所以不需要项目选择事件
}

// 显示任务下拉列表
function displayTaskSelect(tasks) {
    const taskSelect = document.getElementById('taskSelect');
    taskSelect.innerHTML = '<option value="">-- 请选择任务 --</option>';

    tasks.forEach((task) => {
        // 按照express-ts的逻辑：task_id 和 name
        const taskId = task.task_id || task.taskId || task.ts_id || task.id;
        const taskName = task.name || task.task_name || task.taskName || task.ts_name || '';
        
        if (taskId !== undefined && taskId !== null && taskId !== '') {
            const option = document.createElement('option');
            option.value = taskId;
            
            // 格式：task_id - name
            if (taskName) {
                option.textContent = `${taskId} - ${taskName}`;
            } else {
                option.textContent = taskId.toString();
            }
            
            taskSelect.appendChild(option);
        }
    });
    
    console.log(`任务下拉列表已生成，共 ${taskSelect.options.length - 1} 个任务选项`);
    
    // 如果有待恢复的任务ID，恢复选中状态
    if (pendingRestoreConfig && pendingRestoreConfig.taskId) {
        const taskId = pendingRestoreConfig.taskId;
        setTimeout(() => {
            if (taskSelect.querySelector(`option[value="${taskId}"]`)) {
                taskSelect.value = taskId;
            }
            pendingRestoreConfig.taskId = null;
        }, 100);
    }
}

// 恢复项目选择状态
function restoreProjectSelection() {
    if (!pendingRestoreConfig || !pendingRestoreConfig.projectId) {
        return;
    }
    
    const projectSelect = document.getElementById('projectSelect');
    if (projectSelect && projectSelect.querySelector(`option[value="${pendingRestoreConfig.projectId}"]`)) {
        projectSelect.value = pendingRestoreConfig.projectId;
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
    const projectSelect = document.getElementById('projectSelect');
    const taskSelect = document.getElementById('taskSelect');
    const hours = document.getElementById('hours').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!username || !password || !projectSelect.value || !taskSelect.value || !hours || !description) {
        showMessage('actionMessage', '请先填写完整配置', 'error');
        return;
    }

    // 获取选中的项目和任务信息
    const selectedProjectId = projectSelect.value;
    const selectedTaskId = taskSelect.value;
    const selectedProject = allProjectsData[selectedProjectId];
    const selectedTask = allTasksData[selectedTaskId];

    const workConfig = {
        project_id: selectedProjectId,
        task_id: selectedTaskId,
        hours: hours || '8',
        description: description
    };

    showMessage('actionMessage', '正在填写工时...', 'info');

    try {
        const data = await apiRequest('/AutoWorkTime', {
            method: 'POST',
            body: JSON.stringify({
                username,
                password,
                workList: [], // 不提供workList，让后端自动获取未填报的日期
                workConfig,
                selectedProject: selectedProject || undefined,
                selectedTask: selectedTask || undefined
            })
        });

        if (data.code === 200) {
            const result = data.data || {};
            const message = result.message || `成功填写 ${result.successCount || 0} 天的工时`;
            showMessage('actionMessage', message, 'success');
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
    document.getElementById('fetchProjects').addEventListener('click', fetchProjects);
    document.getElementById('refreshStatus').addEventListener('click', loadTaskStatus);
    document.getElementById('syncWorkInfo').addEventListener('click', syncWorkInfo);
    document.getElementById('manualFill').addEventListener('click', manualFillWorkTime);
});


