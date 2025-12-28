/**
 * 🦁 荣耀系统 v12.5.0 - 任务管理模块
 * 处理任务提交、审批、驳回、悬赏任务等
 * 🆕 支持管理员自定义任务、惩罚、商店
 */

const Tasks = {
    // 当前选中的孩子（管理员视角）
    selectedChildUsername: null,

    // ========== 设置选中的孩子 ==========
    setSelectedChild(username) {
        this.selectedChildUsername = username;
        Storage.saveChildFilter(username);
    },

    getSelectedChild() {
        if (!this.selectedChildUsername) {
            this.selectedChildUsername = Storage.getChildFilter();
        }
        return this.selectedChildUsername;
    },

    // ========== 获取任务列表（🆕 从 Storage 读取可配置数据）==========
    getAllTasks() {
        const coreTasks = this.getCoreTasks().filter(t => t.enabled !== false).map(t => ({ ...t, category: 'core' }));
        const dailyTasks = this.getDailyTasks().filter(t => t.enabled !== false).map(t => ({ ...t, category: 'daily' }));
        const bountyTasks = this.getBountyTasks().filter(t => t.enabled !== false).map(t => ({ ...t, category: 'bounty' }));
        return [...coreTasks, ...dailyTasks, ...bountyTasks];
    },

    getCoreTasks() {
        return Storage.getCoreTasks();
    },

    getDailyTasks() {
        return Storage.getDailyTasks();
    },

    getBountyTasks() {
        return Storage.getBountyTasks();
    },

    getPenalties() {
        return Storage.getPenalties().filter(p => p.enabled !== false);
    },

    getStoreItems() {
        return Storage.getStoreItems().filter(i => i.enabled !== false);
    },

    // ========== 🆕 任务 CRUD 操作 ==========
    
    // 添加任务
    addTask(category, taskData) {
        const id = `${category}_${Date.now()}`;
        const newTask = {
            id,
            name: taskData.name,
            reward: parseInt(taskData.reward, 10) || 5,
            icon: taskData.icon || '⭐',
            enabled: true,
            createdAt: Date.now()
        };

        let tasks;
        switch (category) {
            case 'core':
                tasks = Storage.getCoreTasks();
                tasks.push(newTask);
                Storage.saveCoreTasks(tasks);
                break;
            case 'daily':
                tasks = Storage.getDailyTasks();
                tasks.push(newTask);
                Storage.saveDailyTasks(tasks);
                break;
            case 'bounty':
                tasks = Storage.getBountyTasks();
                tasks.push(newTask);
                Storage.saveBountyTasks(tasks);
                break;
        }
        return newTask;
    },

    // 更新任务
    updateTask(category, taskId, updates) {
        let tasks, saveFunc;
        switch (category) {
            case 'core':
                tasks = Storage.getCoreTasks();
                saveFunc = Storage.saveCoreTasks.bind(Storage);
                break;
            case 'daily':
                tasks = Storage.getDailyTasks();
                saveFunc = Storage.saveDailyTasks.bind(Storage);
                break;
            case 'bounty':
                tasks = Storage.getBountyTasks();
                saveFunc = Storage.saveBountyTasks.bind(Storage);
                break;
            default:
                throw new Error('未知任务类别');
        }

        const index = tasks.findIndex(t => t.id === taskId);
        if (index === -1) throw new Error('任务不存在');

        tasks[index] = { ...tasks[index], ...updates };
        saveFunc(tasks);
        return tasks[index];
    },

    // 删除任务
    deleteTask(category, taskId) {
        let tasks, saveFunc;
        switch (category) {
            case 'core':
                tasks = Storage.getCoreTasks();
                saveFunc = Storage.saveCoreTasks.bind(Storage);
                break;
            case 'daily':
                tasks = Storage.getDailyTasks();
                saveFunc = Storage.saveDailyTasks.bind(Storage);
                break;
            case 'bounty':
                tasks = Storage.getBountyTasks();
                saveFunc = Storage.saveBountyTasks.bind(Storage);
                break;
            default:
                throw new Error('未知任务类别');
        }

        const index = tasks.findIndex(t => t.id === taskId);
        if (index === -1) throw new Error('任务不存在');

        tasks.splice(index, 1);
        saveFunc(tasks);
        return true;
    },

    // 切换任务启用状态
    toggleTask(category, taskId) {
        let tasks, saveFunc;
        switch (category) {
            case 'core':
                tasks = Storage.getCoreTasks();
                saveFunc = Storage.saveCoreTasks.bind(Storage);
                break;
            case 'daily':
                tasks = Storage.getDailyTasks();
                saveFunc = Storage.saveDailyTasks.bind(Storage);
                break;
            case 'bounty':
                tasks = Storage.getBountyTasks();
                saveFunc = Storage.saveBountyTasks.bind(Storage);
                break;
            default:
                throw new Error('未知任务类别');
        }

        const task = tasks.find(t => t.id === taskId);
        if (!task) throw new Error('任务不存在');

        task.enabled = !task.enabled;
        saveFunc(tasks);
        return task;
    },

    // ========== 🆕 惩罚 CRUD 操作 ==========
    addPenalty(data) {
        const penalties = Storage.getPenalties();
        const newPenalty = {
            id: `penalty_${Date.now()}`,
            name: data.name,
            cost: parseInt(data.cost, 10) || 10,
            icon: data.icon || '⚠️',
            enabled: true,
            createdAt: Date.now()
        };
        penalties.push(newPenalty);
        Storage.savePenalties(penalties);
        return newPenalty;
    },

    updatePenalty(penaltyId, updates) {
        const penalties = Storage.getPenalties();
        const index = penalties.findIndex(p => p.id === penaltyId);
        if (index === -1) throw new Error('惩罚项不存在');

        penalties[index] = { ...penalties[index], ...updates };
        Storage.savePenalties(penalties);
        return penalties[index];
    },

    deletePenalty(penaltyId) {
        const penalties = Storage.getPenalties();
        const index = penalties.findIndex(p => p.id === penaltyId);
        if (index === -1) throw new Error('惩罚项不存在');

        penalties.splice(index, 1);
        Storage.savePenalties(penalties);
        return true;
    },

    togglePenalty(penaltyId) {
        const penalties = Storage.getPenalties();
        const penalty = penalties.find(p => p.id === penaltyId);
        if (!penalty) throw new Error('惩罚项不存在');

        penalty.enabled = !penalty.enabled;
        Storage.savePenalties(penalties);
        return penalty;
    },

    // ========== 🆕 商店 CRUD 操作 ==========
    addStoreItem(data) {
        const items = Storage.getStoreItems();
        const newItem = {
            id: `store_${Date.now()}`,
            name: data.name,
            cost: parseInt(data.cost, 10) || 50,
            icon: data.icon || '🎁',
            enabled: true,
            createdAt: Date.now()
        };
        items.push(newItem);
        Storage.saveStoreItems(items);
        return newItem;
    },

    updateStoreItem(itemId, updates) {
        const items = Storage.getStoreItems();
        const index = items.findIndex(i => i.id === itemId);
        if (index === -1) throw new Error('商品不存在');

        items[index] = { ...items[index], ...updates };
        Storage.saveStoreItems(items);
        return items[index];
    },

    deleteStoreItem(itemId) {
        const items = Storage.getStoreItems();
        const index = items.findIndex(i => i.id === itemId);
        if (index === -1) throw new Error('商品不存在');

        items.splice(index, 1);
        Storage.saveStoreItems(items);
        return true;
    },

    toggleStoreItem(itemId) {
        const items = Storage.getStoreItems();
        const item = items.find(i => i.id === itemId);
        if (!item) throw new Error('商品不存在');

        item.enabled = !item.enabled;
        Storage.saveStoreItems(items);
        return item;
    },

    // ========== 提交任务 ==========
    async submitTask(taskId, taskName, reward, submitter, note = '') {
        const taskData = {
            taskId: taskId,
            name: taskName,
            reward: reward,
            submitterUsername: submitter.username,
            submitterName: submitter.nickname || submitter.username,
            childId: submitter.username,
            childName: submitter.nickname || submitter.username,
            note: note,
            status: 'pending',
            createTime: Date.now()
        };

        // 检查是否已提交
        if (FirebaseSync.isTaskPending(taskId, submitter.username)) {
            throw new Error('该任务已提交，等待审批中');
        }

        await FirebaseSync.submitTask(taskData);
        return true;
    },

    // ========== 审批任务 ==========
    async approveTask(taskKey, approver) {
        const result = await FirebaseSync.approveTask(taskKey, approver);

        // 更新本地分数
        const currentScore = Storage.getScore(result.childUsername);
        const newScore = currentScore + result.reward;
        Storage.saveScore(result.childUsername, newScore);

        // 同步到云端
        await FirebaseSync.syncScoreToCloud(result.childUsername, newScore);

        return {
            childName: result.childName,
            reward: result.reward,
            newScore: newScore
        };
    },

    // ========== 驳回任务 ==========
    async rejectTask(taskKey) {
        const result = await FirebaseSync.rejectTask(taskKey);
        return result;
    },

    // ========== 应用惩罚 ==========
    async applyPenalty(penaltyId, childUsername, admin) {
        const penalties = Storage.getPenalties();
        const penalty = penalties.find(p => p.id === penaltyId);
        if (!penalty) {
            throw new Error('惩罚项不存在');
        }

        if (!childUsername) {
            throw new Error('请先选择要惩罚的孩子');
        }

        const currentScore = Storage.getScore(childUsername);
        const newScore = Math.max(0, currentScore - penalty.cost);
        Storage.saveScore(childUsername, newScore);

        // 同步到云端
        await FirebaseSync.syncScoreToCloud(childUsername, newScore);

        // 记录到历史
        const historyItem = {
            taskId: penalty.id,
            name: penalty.name,
            reward: -penalty.cost,
            childId: childUsername,
            submitterUsername: admin.username,
            submitterName: admin.nickname,
            status: 'approved',
            category: 'penalty',
            finishTime: Date.now()
        };

        const historyRef = FirebaseSync.getHistoryRef();
        if (historyRef) {
            await historyRef.push().set(historyItem);
        }

        return {
            penaltyName: penalty.name,
            cost: penalty.cost,
            newScore: newScore
        };
    },

    // ========== 商店兑换 ==========
    async buyItem(itemId, childUsername) {
        const items = Storage.getStoreItems();
        const item = items.find(i => i.id === itemId);
        if (!item) {
            throw new Error('商品不存在');
        }

        const currentScore = Storage.getScore(childUsername);
        if (currentScore < item.cost) {
            throw new Error(`星星不足！需要 ${item.cost} 颗，当前只有 ${currentScore} 颗`);
        }

        const newScore = currentScore - item.cost;
        Storage.saveScore(childUsername, newScore);

        // 同步到云端
        await FirebaseSync.syncScoreToCloud(childUsername, newScore);

        // 记录到历史
        const historyItem = {
            taskId: item.id,
            name: `兑换：${item.name}`,
            reward: -item.cost,
            childId: childUsername,
            submitterUsername: childUsername,
            status: 'approved',
            category: 'store',
            finishTime: Date.now()
        };

        const historyRef = FirebaseSync.getHistoryRef();
        if (historyRef) {
            await historyRef.push().set(historyItem);
        }

        return {
            itemName: item.name,
            cost: item.cost,
            newScore: newScore
        };
    },

    // ========== 添加悬赏任务（兼容旧版）==========
    addBountyTask(name, reward, creatorUsername) {
        if (!name || name.trim() === '') {
            throw new Error('请输入任务名称');
        }

        const rewardNum = parseInt(reward, 10);
        if (isNaN(rewardNum) || rewardNum < 1) {
            throw new Error('请输入有效的奖励数量');
        }

        const bountyTasks = Storage.getBountyTasks();
        const newTask = {
            id: 'bounty_' + Date.now(),
            name: name.trim(),
            reward: rewardNum,
            icon: '🎯',
            enabled: true,
            createdBy: creatorUsername,
            createdAt: Date.now()
        };

        bountyTasks.push(newTask);
        localStorage.setItem(STORAGE.BOUNTY_TASKS, JSON.stringify(bountyTasks));

        return newTask;
    },

    // ========== 删除悬赏任务 ==========
    removeBountyTask(taskId) {
        const bountyTasks = Storage.getBountyTasks();
        const index = bountyTasks.findIndex(t => t.id === taskId);
        
        if (index === -1) {
            throw new Error('任务不存在');
        }

        bountyTasks.splice(index, 1);
        localStorage.setItem(STORAGE.BOUNTY_TASKS, JSON.stringify(bountyTasks));

        return true;
    },

    // ========== 获取历史记录 ==========
    async getHistory(childUsername) {
        const filter = childUsername 
            ? (item) => item.childId === childUsername
            : null;
        
        return await FirebaseSync.getHistory(filter);
    },

    // ========== 获取待审批任务 ==========
    getPendingTasks(childUsername) {
        let tasks = FirebaseSync.cloudTasks.filter(t => t.status === 'pending');
        
        if (childUsername) {
            tasks = tasks.filter(t => 
                t.childId === childUsername || 
                t.submitterUsername === childUsername
            );
        }

        return tasks;
    }
};
