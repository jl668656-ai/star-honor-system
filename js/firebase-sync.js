/**
 * 🦁 荣耀系统 v12.2.0 - Firebase 同步模块
 * 处理云端数据同步：任务、分数、历史记录
 */

const FirebaseSync = {
    // 监听器状态
    tasksListenerAttached: false,
    
    // 云端任务缓存
    cloudTasks: [],
    cloudTasksByKey: {},

    // ========== 获取引用 ==========
    getTasksRef() {
        if (typeof database === 'undefined') return null;
        return database.ref('/tasks');
    },

    getHistoryRef() {
        if (typeof database === 'undefined') return null;
        return database.ref('/history');
    },

    getScoresRef(username) {
        if (typeof database === 'undefined') return null;
        return database.ref('/scores/' + username);
    },

    // ========== 任务实时监听 ==========
    startTasksListener(onUpdate) {
        const ref = this.getTasksRef();
        if (!ref) {
            console.log('⚠️ Firebase 未配置，跳过 /tasks 监听');
            return;
        }
        
        if (this.tasksListenerAttached) return;
        this.tasksListenerAttached = true;

        ref.on('value', (snapshot) => {
            const list = [];
            const map = {};
            
            snapshot.forEach(child => {
                const val = child.val();
                if (!val) return;
                const item = { ...val, _key: child.key };
                list.push(item);
                map[item._key] = item;
            });

            // pending 置顶排序
            list.sort((a, b) => {
                const ap = (a.status === 'pending') ? 0 : 1;
                const bp = (b.status === 'pending') ? 0 : 1;
                if (ap !== bp) return ap - bp;
                return (b.createTime || 0) - (a.createTime || 0);
            });

            this.cloudTasks = list;
            this.cloudTasksByKey = map;

            // 回调通知 UI 更新
            if (typeof onUpdate === 'function') {
                onUpdate(list, map);
            }
        }, (err) => {
            console.error('❌ /tasks onValue 监听失败:', err);
        });
    },

    stopTasksListener() {
        const ref = this.getTasksRef();
        if (ref && this.tasksListenerAttached) {
            try { ref.off('value'); } catch (_) {}
        }
        this.tasksListenerAttached = false;
        this.cloudTasks = [];
        this.cloudTasksByKey = {};
    },

    // ========== 提交任务 ==========
    async submitTask(taskData) {
        const ref = this.getTasksRef();
        if (!ref) {
            throw new Error('云端未配置，无法提交');
        }

        const payload = {
            ...taskData,
            status: 'pending',
            createTime: Date.now()
        };

        await ref.push().set(payload);
        return true;
    },

    // ========== 批准任务 ==========
    async approveTask(taskKey, approver) {
        const task = this.cloudTasksByKey[taskKey];
        if (!task) {
            throw new Error('任务不存在或已被处理');
        }

        const tasksRef = this.getTasksRef();
        const historyRef = this.getHistoryRef();
        if (!tasksRef || !historyRef) {
            throw new Error('云端未配置');
        }

        const historyItem = {
            ...task,
            status: 'approved',
            approverUsername: approver.username,
            approverName: approver.nickname,
            finishTime: Date.now()
        };
        delete historyItem._key;

        await historyRef.push().set(historyItem);
        await tasksRef.child(taskKey).remove();

        return {
            childUsername: task.childId || task.submitterUsername,
            childName: task.childName || task.submitterName,
            reward: parseInt(task.reward, 10) || 0
        };
    },

    // ========== 驳回任务 ==========
    async rejectTask(taskKey) {
        const task = this.cloudTasksByKey[taskKey];
        if (!task) {
            throw new Error('任务不存在或已被处理');
        }

        const tasksRef = this.getTasksRef();
        if (!tasksRef) {
            throw new Error('云端未配置');
        }

        await tasksRef.child(taskKey).remove();
        
        return {
            childName: task.childName || task.submitterName || '孩子',
            taskName: task.name
        };
    },

    // ========== 🆕 添加到历史记录 ==========
    async addToHistory(historyItem) {
        const historyRef = this.getHistoryRef();
        if (!historyRef) {
            console.warn('⚠️ 云端未配置，无法添加历史记录');
            return;
        }

        try {
            await historyRef.push().set({
                ...historyItem,
                status: historyItem.status || 'approved',
                finishTime: historyItem.finishTime || Date.now()
            });
        } catch (e) {
            console.warn('⚠️ 添加历史记录失败:', e);
        }
    },

    // ========== 分数同步 ==========
    syncScore: async function(username, score) {
        return this.syncScoreToCloud(username, score);
    },

    // ========== 分数同步到云端 ==========
    async syncScoreToCloud(username, score) {
        const ref = this.getScoresRef(username);
        if (!ref) return;

        try {
            await ref.set({
                score: score,
                updatedAt: Date.now()
            });
        } catch (e) {
            console.warn('⚠️ 同步分数到云端失败:', e);
        }
    },

    // ========== 从云端同步分数 ==========
    async syncScoreFromCloud(username) {
        const ref = this.getScoresRef(username);
        if (!ref) return null;

        try {
            const snapshot = await ref.once('value');
            if (snapshot.exists()) {
                const data = snapshot.val();
                return data.score || 0;
            }
        } catch (e) {
            console.warn('⚠️ 从云端同步分数失败:', e);
        }
        return null;
    },

    // ========== 获取历史记录 ==========
    async getHistory(filterFn) {
        const ref = this.getHistoryRef();
        if (!ref) {
            throw new Error('云端未配置');
        }

        const snapshot = await ref.once('value');
        const items = [];
        
        snapshot.forEach(child => {
            const val = child.val();
            if (!val) return;
            items.push({ ...val, _key: child.key });
        });

        // 按完成时间倒序
        items.sort((a, b) => (b.finishTime || 0) - (a.finishTime || 0));

        // 应用过滤器
        if (typeof filterFn === 'function') {
            return items.filter(filterFn);
        }
        return items;
    },

    // ========== 连接测试 ==========
    async testConnection() {
        if (typeof firebase === 'undefined' || typeof database === 'undefined') {
            throw new Error('Firebase 未加载或配置未完成');
        }

        const ref = database.ref('/ping');
        const payload = { 
            device: navigator.userAgent.substring(0, 60), 
            at: Date.now() 
        };

        await ref.set(payload);
        const snap = await ref.once('value');
        
        if (!snap || !snap.exists()) {
            throw new Error('读取失败，请检查数据库规则');
        }

        return true;
    },

    // ========== 检查任务是否已提交 ==========
    isTaskPending(taskId, username) {
        return this.cloudTasks.some(t =>
            t && t.status === 'pending' && 
            t.taskId === taskId && 
            t.submitterUsername === username
        );
    }
};
