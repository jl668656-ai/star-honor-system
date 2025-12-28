/**
 * 🦁 荣耀系统 v12.5.0 - 主应用入口
 * 初始化、页面渲染、全局事件处理
 * 🆕 新增任务管理中心功能
 */

const App = {
    // 当前编辑状态
    editingItem: null,
    editingCategory: null,
    editingType: null, // 'task', 'penalty', 'store'

    // ========== 应用初始化 ==========
    init() {
        console.log(`🦁 荣耀系统 ${APP_VERSION} 启动中...`);

        // 初始化默认用户
        this.initDefaultUsers();

        // 初始化认证
        const session = Auth.init();

        // 根据会话状态显示页面
        if (session) {
            this.enterApp();
        } else {
            this.showLoginPage();
        }

        // 绑定全局事件
        this.bindEvents();

        console.log('✅ 应用初始化完成');
    },

    // ========== 初始化默认用户 ==========
    initDefaultUsers() {
        const users = Storage.getUsers();
        if (users.length === 0) {
            Storage.saveUsers(DEFAULT_USERS);
            console.log('📝 已创建默认用户');
        }
    },

    // ========== 进入应用 ==========
    enterApp() {
        const session = Auth.currentSession;
        if (!session) {
            this.showLoginPage();
            return;
        }

        // 显示主页面
        UI.showPage('mainPage');

        // 更新状态栏
        this.updateStatusBar();

        // 根据角色渲染界面
        if (session.role === 'admin') {
            this.renderAdminView();
        } else {
            this.renderChildView();
        }

        // 启动实时监听
        FirebaseSync.startTasksListener(() => {
            this.refreshUI();
        });
    },

    // ========== 显示登录页 ==========
    showLoginPage() {
        UI.showPage('loginPage');
    },

    // ========== 更新状态栏 ==========
    updateStatusBar() {
        const session = Auth.currentSession;
        if (!session) return;

        // 用户名显示
        const usernameEl = document.getElementById('currentUsername');
        if (usernameEl) {
            usernameEl.textContent = session.nickname;
        }

        // 角色标识
        const roleEl = document.getElementById('currentRole');
        if (roleEl) {
            roleEl.textContent = session.role === 'admin' ? '👑 管理员' : '🦁 执行者';
        }

        // 分数和军衔（只对孩子显示）
        if (session.role === 'executor') {
            this.updateScoreDisplay(session.username);
        } else {
            // 管理员查看选中孩子的分数
            const selectedChild = Tasks.getSelectedChild();
            if (selectedChild) {
                this.updateScoreDisplay(selectedChild);
            }
        }
    },

    // ========== 更新分数显示 ==========
    updateScoreDisplay(username) {
        const score = Storage.getScore(username);
        const rankInfo = UI.getRankInfo(score);
        const nextRank = UI.getNextRankInfo(score);

        const scoreEl = document.getElementById('currentScore');
        if (scoreEl) {
            scoreEl.textContent = `⭐ ${score}`;
        }

        const rankEl = document.getElementById('currentRank');
        if (rankEl) {
            rankEl.textContent = `${rankInfo.icon} ${rankInfo.name}`;
        }

        const progressEl = document.getElementById('rankProgress');
        if (progressEl && nextRank) {
            const progress = ((score - (rankInfo.min)) / (nextRank.rank.min - rankInfo.min)) * 100;
            progressEl.style.width = Math.min(100, Math.max(0, progress)) + '%';
        }

        const nextRankEl = document.getElementById('nextRankInfo');
        if (nextRankEl) {
            if (nextRank) {
                nextRankEl.textContent = `距离 ${nextRank.rank.name} 还需 ${nextRank.needed} ⭐`;
            } else {
                nextRankEl.textContent = '已达最高军衔！';
            }
        }
    },

    // ========== 渲染管理员视图 ==========
    renderAdminView() {
        // 🔴 首先隐藏所有孩子专属区域
        const executorSections = document.querySelectorAll('.executor-only');
        executorSections.forEach(el => el.style.display = 'none');

        // 🟢 显示管理员专属区域
        const adminSections = document.querySelectorAll('.admin-only');
        adminSections.forEach(el => el.style.display = 'block');

        // 显示孩子选择器
        this.renderChildSelector();

        // 显示待审批任务
        this.renderPendingTasks();

        // 🆕 显示快速复核任务清单
        this.renderQuickTaskList();

        // 显示惩罚区域
        this.renderPenalties();

        // 显示悬赏任务管理
        this.renderBountyManagement();
    },

    // ========== 渲染孩子视图 ==========
    renderChildView() {
        const session = Auth.currentSession;

        // 🔴 首先隐藏所有管理员专属区域
        const adminSections = document.querySelectorAll('.admin-only');
        adminSections.forEach(el => el.style.display = 'none');

        // 🟢 显示孩子专属区域
        const executorSections = document.querySelectorAll('.executor-only');
        executorSections.forEach(el => el.style.display = 'block');

        // 🆕 渲染可领取的悬赏任务
        this.renderBountyCards();

        // 🆕 渲染我的提交（待审批状态）
        this.renderMySubmissions();

        // 渲染可提交的任务
        this.renderTaskCards();

        // 显示商店
        this.renderStore();
    },

    // ========== 渲染孩子选择器 ==========
    renderChildSelector() {
        const container = document.getElementById('childSelector');
        if (!container) return;

        const children = Auth.getChildren();
        const selectedChild = Tasks.getSelectedChild();

        container.innerHTML = '';

        children.forEach(child => {
            const btn = document.createElement('button');
            btn.className = 'child-btn' + (selectedChild === child.username ? ' active' : '');
            btn.textContent = child.nickname || child.username;
            btn.onclick = () => {
                Tasks.setSelectedChild(child.username);
                this.updateStatusBar();
                this.renderAdminView();
            };
            container.appendChild(btn);
        });
    },

    // ========== 渲染待审批任务 ==========
    renderPendingTasks() {
        const container = document.getElementById('pendingTasks');
        if (!container) return;

        const selectedChild = Tasks.getSelectedChild();
        const pendingTasks = Tasks.getPendingTasks(selectedChild);

        if (pendingTasks.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无待审批任务</div>';
            return;
        }

        container.innerHTML = '';

        pendingTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card pending';
            card.innerHTML = `
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-reward">+${task.reward} ⭐</span>
                </div>
                <div class="task-meta">
                    <span class="submitter">${task.submitterName || task.childName}</span>
                    <span class="time">${UI.formatDateTime(task.createTime)}</span>
                </div>
                ${task.note ? `<div class="task-note">${task.note}</div>` : ''}
                <div class="task-actions">
                    <button class="btn-approve" data-key="${task._key}">✅ 批准</button>
                    <button class="btn-reject" data-key="${task._key}">❌ 驳回</button>
                </div>
            `;
            container.appendChild(card);
        });

        // 绑定按钮事件
        container.querySelectorAll('.btn-approve').forEach(btn => {
            btn.onclick = () => this.handleApprove(btn.dataset.key);
        });

        container.querySelectorAll('.btn-reject').forEach(btn => {
            btn.onclick = () => this.handleReject(btn.dataset.key);
        });
    },

    // ========== 渲染任务卡片 ==========
    renderTaskCards() {
        const container = document.getElementById('taskCards');
        if (!container) return;

        const session = Auth.currentSession;
        const allTasks = Tasks.getAllTasks();

        container.innerHTML = '';

        if (allTasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><div class="text">暂无可提交的任务</div></div>';
            return;
        }

        // 按分类分组 - 排除悬赏任务（已在单独区域显示）
        const categories = {
            core: { title: '🎯 核心任务', color: '#e74c3c', tasks: [] },
            daily: { title: '📋 日常任务', color: '#f39c12', tasks: [] }
        };

        allTasks.forEach(task => {
            // 悬赏任务单独显示，这里不重复
            if (task.category !== 'bounty' && categories[task.category]) {
                categories[task.category].tasks.push(task);
            }
        });

        Object.entries(categories).forEach(([key, category]) => {
            if (category.tasks.length === 0) return;

            const section = document.createElement('div');
            section.className = 'task-section section-card';
            section.innerHTML = `<div class="section-header" style="color: ${category.color}">${category.title}</div>`;

            const grid = document.createElement('div');
            grid.className = 'task-grid';

            category.tasks.forEach(task => {
                const isPending = FirebaseSync.isTaskPending(task.id, session.username);
                
                const card = document.createElement('div');
                card.className = 'task-item-card' + (isPending ? ' submitted' : '');
                // XSS 防护
                const safeIcon = UI.escapeHtml(task.icon || '⭐');
                const safeName = UI.escapeHtml(task.name);
                
                card.innerHTML = `
                    <div class="task-icon">${safeIcon}</div>
                    <div class="task-info">
                        <div class="task-name">${safeName}</div>
                        <div class="task-reward">+${task.reward} ⭐</div>
                    </div>
                    ${isPending 
                        ? '<div class="task-status pending">⏳ 等待审批</div>' 
                        : '<button class="btn-submit-task">提交</button>'
                    }
                `;

                if (!isPending) {
                    card.querySelector('.btn-submit-task').onclick = (e) => {
                        e.stopPropagation();
                        this.handleSubmitTask(task);
                    };
                }

                grid.appendChild(card);
            });

            section.appendChild(grid);
            container.appendChild(section);
        });

        // 如果没有任何任务
        if (container.innerHTML === '') {
            container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><div class="text">暂无可提交的任务</div></div>';
        }
    },

    // ========== 渲染商店 ==========
    renderStore() {
        const container = document.getElementById('storeItems');
        if (!container) return;

        const session = Auth.currentSession;
        const score = Storage.getScore(session.username);
        const items = Tasks.getStoreItems();

        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">🏪</div><div class="text">暂无商品</div></div>';
            return;
        }

        items.forEach(item => {
            const canBuy = score >= item.cost;
            const card = document.createElement('div');
            card.className = 'store-item-card' + (canBuy ? '' : ' disabled');
            // XSS 防护
            const safeIcon = UI.escapeHtml(item.icon || '🎁');
            const safeName = UI.escapeHtml(item.name);
            
            card.innerHTML = `
                <div class="icon">${safeIcon}</div>
                <div class="name">${safeName}</div>
                <div class="cost">${item.cost} ⭐</div>
                <button class="btn-buy" ${canBuy ? '' : 'disabled'}>兑换</button>
            `;

            if (canBuy) {
                card.querySelector('.btn-buy').onclick = (e) => {
                    e.stopPropagation();
                    this.handleBuyItem(item.id);
                };
            }

            container.appendChild(card);
        });
    },

    // ========== 🆕 渲染可领取悬赏 ==========
    renderBountyCards() {
        const container = document.getElementById('bountyCards');
        if (!container) return;

        const session = Auth.currentSession;
        const bountyTasks = Tasks.getBountyTasks();

        container.innerHTML = '';

        if (bountyTasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">🎯</div><div class="text">暂无悬赏任务，等爸爸发布吧~</div></div>';
            return;
        }

        bountyTasks.forEach(task => {
            const isPending = FirebaseSync.isTaskPending(task.id, session.username);
            
            const card = document.createElement('div');
            card.className = 'available-bounty' + (isPending ? ' submitted' : '');
            // XSS 防护
            const safeIcon = UI.escapeHtml(task.icon || '🎯');
            const safeName = UI.escapeHtml(task.name);
            
            card.innerHTML = `
                <div class="icon">${safeIcon}</div>
                <div class="info">
                    <div class="name">${safeName}</div>
                    <div class="reward">奖励: +${task.reward} ⭐</div>
                </div>
                ${isPending 
                    ? '<div class="status pending">等待审批</div>' 
                    : `<button class="btn-claim" data-id="${task.id}">领取</button>`
                }
            `;
            container.appendChild(card);
        });

        // 绑定领取按钮事件
        container.querySelectorAll('.btn-claim').forEach(btn => {
            btn.onclick = () => {
                const taskId = btn.dataset.id;
                const task = bountyTasks.find(t => t.id === taskId);
                if (task) {
                    this.handleSubmitTask(task);
                }
            };
        });
    },

    // ========== 🆕 渲染我的提交（孩子查看待审批状态） ==========
    renderMySubmissions() {
        const container = document.getElementById('submissionsList');
        if (!container) return;

        const session = Auth.currentSession;
        const pendingTasks = Tasks.getPendingTasks(session.username);

        container.innerHTML = '';

        if (pendingTasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><div class="text">暂无待审批的任务提交</div></div>';
            return;
        }

        pendingTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'submission-card';
            // XSS 防护
            const safeIcon = UI.escapeHtml(task.icon || '📝');
            const safeName = UI.escapeHtml(task.name);
            
            card.innerHTML = `
                <div class="icon">${safeIcon}</div>
                <div class="info">
                    <div class="name">${safeName}</div>
                    <div class="time">${UI.formatDateTime(task.createTime)}</div>
                </div>
                <div class="status">⏳ 待审批</div>
            `;
            container.appendChild(card);
        });
    },

    // ========== 🆕 渲染快速任务清单（管理员用于快速复核）==========
    renderQuickTaskList() {
        const container = document.getElementById('quickTaskList');
        if (!container) return;

        const selectedChild = Tasks.getSelectedChild();
        const allTasks = Tasks.getAllTasks();
        
        container.innerHTML = '';

        if (allTasks.length === 0) {
            container.innerHTML = '<div class="empty-hint">暂无任务</div>';
            return;
        }

        // 分类显示
        const categories = {
            core: { title: '核心', tasks: [] },
            daily: { title: '日常', tasks: [] },
            bounty: { title: '悬赏', tasks: [] }
        };

        allTasks.forEach(task => {
            if (categories[task.category]) {
                categories[task.category].tasks.push(task);
            }
        });

        Object.entries(categories).forEach(([key, category]) => {
            if (category.tasks.length === 0) return;

            const group = document.createElement('div');
            group.className = 'quick-task-group';
            group.innerHTML = `<div class="group-title">${category.title}</div>`;

            const list = document.createElement('div');
            list.className = 'quick-task-items';

            category.tasks.forEach(task => {
                const item = document.createElement('button');
                item.className = 'quick-task-btn';
                const safeIcon = UI.escapeHtml(task.icon || '⭐');
                const safeName = UI.escapeHtml(task.name);
                
                item.innerHTML = `${safeIcon} <span class="name">${safeName}</span> <span class="reward">+${task.reward}</span>`;
                item.onclick = () => this.handleQuickApprove(task, selectedChild);
                list.appendChild(item);
            });

            group.appendChild(list);
            container.appendChild(group);
        });
    },

    // ========== 🆕 快速批准任务（管理员直接给选中孩子加分）==========
    async handleQuickApprove(task, childUsername) {
        if (!childUsername) {
            UI.error('请先选择孩子');
            return;
        }

        if (!confirm(`确定为选中孩子完成 "${task.name}" 并加 ${task.reward} ⭐ 吗？`)) {
            return;
        }

        try {
            const session = Auth.currentSession;
            const child = Auth.getChildren().find(c => c.username === childUsername);
            
            // 直接加分，不需要孩子提交
            const currentScore = Storage.getScore(childUsername);
            const newScore = currentScore + task.reward;
            Storage.saveScore(childUsername, newScore);

            // 同步到云端
            await FirebaseSync.syncScore(childUsername, newScore);

            // 记录历史
            await FirebaseSync.addToHistory({
                taskId: task.id,
                taskName: task.name,
                name: task.name,
                icon: task.icon,
                reward: task.reward,
                childName: childUsername,
                approvedBy: session.username,
                finishTime: Date.now()
            });

            UI.createFireworks();
            UI.success(`✅ ${child?.nickname || childUsername} 获得 ${task.reward} ⭐`);
            UI.vibrate([100, 50, 100]);
            
            this.updateStatusBar();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // ========== 渲染惩罚区域 ==========
    renderPenalties() {
        const container = document.getElementById('penaltyList');
        if (!container) return;

        const penalties = Tasks.getPenalties();
        container.innerHTML = '';

        if (penalties.length === 0) {
            container.innerHTML = '<div class="empty-hint">暂无惩罚项目</div>';
            return;
        }

        penalties.forEach(penalty => {
            const btn = document.createElement('button');
            btn.className = 'penalty-btn';
            // XSS 防护
            const safeIcon = UI.escapeHtml(penalty.icon || '⚠️');
            const safeName = UI.escapeHtml(penalty.name);
            
            btn.innerHTML = `
                <div class="icon">${safeIcon}</div>
                <div class="name">${safeName}</div>
                <div class="value">-${penalty.cost} ⭐</div>
            `;
            btn.onclick = () => this.handleApplyPenalty(penalty.id);
            container.appendChild(btn);
        });
    },

    // ========== 渲染悬赏管理 ==========
    renderBountyManagement() {
        const container = document.getElementById('bountyList');
        if (!container) return;

        const bountyTasks = Tasks.getBountyTasks();
        container.innerHTML = '';

        if (bountyTasks.length === 0) {
            container.innerHTML = '<div class="empty-hint">暂无悬赏任务，在上方添加</div>';
            return;
        }

        bountyTasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'bounty-item';
            // XSS 防护
            const safeIcon = UI.escapeHtml(task.icon || '🎯');
            const safeName = UI.escapeHtml(task.name);
            
            item.innerHTML = `
                <div class="icon">${safeIcon}</div>
                <div class="info">
                    <div class="name">${safeName}</div>
                    <div class="reward">+${task.reward} ⭐</div>
                </div>
                <button class="btn-delete-bounty" data-id="${task.id}">🗑️</button>
            `;
            container.appendChild(item);
        });

        // 绑定删除事件
        container.querySelectorAll('.btn-delete-bounty').forEach(btn => {
            btn.onclick = () => {
                if (confirm('确定删除这个悬赏任务吗？')) {
                    Tasks.removeBountyTask(btn.dataset.id);
                    this.renderBountyManagement();
                    UI.success('悬赏任务已删除');
                }
            };
        });
    },

    // ========== 🆕 渲染军衔档案弹窗 ==========
    renderRankTable() {
        const container = document.getElementById('rankTableContainer');
        if (!container) return;

        const session = Auth.currentSession;
        const username = session.role === 'admin' ? Tasks.getSelectedChild() : session.username;
        const score = username ? Storage.getScore(username) : 0;

        let html = '<table class="rank-table">';
        html += '<tr><th>图标</th><th>军衔</th><th>所需星星</th><th>状态</th></tr>';

        RANK_SYSTEM.forEach((rank, idx) => {
            const isCurrentRank = score >= rank.min && (idx === RANK_SYSTEM.length - 1 || score < RANK_SYSTEM[idx + 1].min);
            const isUnlocked = score >= rank.min;
            
            html += `<tr class="${isCurrentRank ? 'current-rank' : ''} ${isUnlocked ? 'unlocked' : 'locked'}">
                <td class="rank-icon">${rank.icon}</td>
                <td class="rank-name">${rank.name}</td>
                <td class="rank-score">${rank.min} ⭐</td>
                <td>${isCurrentRank ? '📍 当前' : (isUnlocked ? '✅ 已解锁' : '🔒 未解锁')}</td>
            </tr>`;
        });

        html += '</table>';
        container.innerHTML = html;
    },

    // ========== 🆕 渲染成长足迹弹窗 ==========
    async renderHistory() {
        const container = document.getElementById('historyContainer');
        if (!container) return;

        const session = Auth.currentSession;
        const username = session.role === 'admin' ? Tasks.getSelectedChild() : session.username;
        
        if (!username) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📜</div><div class="text">请先选择孩子</div></div>';
            return;
        }

        container.innerHTML = '<div class="loading-hint">加载中...</div>';

        try {
            // 从 Firebase 获取历史记录
            const history = await FirebaseSync.getHistory(item => item.childName === username || item.username === username);
            
            if (!history || history.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="icon">📜</div><div class="text">暂无历史记录</div></div>';
                return;
            }

            let html = '';
            history.slice(0, 50).forEach(item => {
                const isPositive = (item.points || item.reward || 0) > 0;
                const points = item.points || item.reward || 0;
                html += `
                    <div class="history-item">
                        <div class="icon">${item.icon || (isPositive ? '⭐' : '💔')}</div>
                        <div class="info">
                            <div class="name">${UI.escapeHtml(item.name || item.taskName || '未知')}</div>
                            <div class="time">${UI.formatDateTime(item.finishTime || item.time || item.createTime)}</div>
                        </div>
                        <div class="points ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${points} ⭐</div>
                    </div>
                `;
            });

            container.innerHTML = html || '<div class="empty-state"><div class="icon">📜</div><div class="text">暂无历史记录</div></div>';
        } catch (e) {
            console.error('获取历史记录失败:', e);
            container.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div class="text">获取记录失败</div></div>';
        }
    },

    // ========== 刷新 UI ==========
    refreshUI() {
        const session = Auth.currentSession;
        if (!session) return;

        this.updateStatusBar();

        if (session.role === 'admin') {
            this.renderPendingTasks();
            this.renderBountyManagement();
        } else {
            this.renderBountyCards();
            this.renderMySubmissions();
            this.renderTaskCards();
            this.renderStore();
        }
    },

    // ========== 事件处理 ==========
    
    // 提交任务
    async handleSubmitTask(task) {
        const session = Auth.currentSession;
        
        try {
            await Tasks.submitTask(
                task.id, 
                task.name, 
                task.reward, 
                session
            );
            
            UI.success(`"${task.name}" 已提交，等待审批！`);
            UI.vibrate();
            this.refreshUI();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // 批准任务
    async handleApprove(taskKey) {
        const session = Auth.currentSession;
        
        try {
            const result = await Tasks.approveTask(taskKey, session);
            
            UI.createFireworks();
            UI.success(`✅ 已批准！${result.childName} 获得 ${result.reward} ⭐`);
            UI.vibrate([100, 50, 100]);
            
            this.refreshUI();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // 驳回任务
    async handleReject(taskKey) {
        if (!confirm('确定要驳回这个任务吗？')) return;

        try {
            const result = await Tasks.rejectTask(taskKey);
            UI.success(`已驳回 ${result.childName} 的 "${result.taskName}"`);
            this.refreshUI();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // 应用惩罚
    async handleApplyPenalty(penaltyId) {
        const selectedChild = Tasks.getSelectedChild();
        
        if (!selectedChild) {
            UI.error('请先选择要惩罚的孩子');
            return;
        }

        const penalties = Tasks.getPenalties();
        const penalty = penalties.find(p => p.id === penaltyId);
        if (!penalty) {
            UI.error('惩罚项不存在');
            return;
        }
        
        if (!confirm(`确定对选中的孩子执行 "${penalty.name}" 惩罚吗？将扣除 ${penalty.cost} ⭐`)) {
            return;
        }

        try {
            const session = Auth.currentSession;
            const result = await Tasks.applyPenalty(penaltyId, selectedChild, session);
            
            UI.success(`💔 ${penalty.name}，扣除 ${result.cost} ⭐`);
            this.updateStatusBar();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // 购买商品
    async handleBuyItem(itemId) {
        const session = Auth.currentSession;
        const items = Tasks.getStoreItems();
        const item = items.find(i => i.id === itemId);
        
        if (!item) {
            UI.error('商品不存在');
            return;
        }
        
        if (!confirm(`确定要用 ${item.cost} ⭐ 兑换 "${item.name}" 吗？`)) {
            return;
        }

        try {
            const result = await Tasks.buyItem(itemId, session.username);
            
            UI.createFireworks();
            UI.success(`🎉 成功兑换 "${result.itemName}"！`);
            UI.vibrate([100, 50, 100]);
            
            this.refreshUI();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // 添加悬赏任务
    handleAddBounty() {
        const nameInput = document.getElementById('bountyName');
        const rewardInput = document.getElementById('bountyReward');
        
        if (!nameInput || !rewardInput) return;

        try {
            const session = Auth.currentSession;
            const task = Tasks.addBountyTask(
                nameInput.value,
                rewardInput.value,
                session.username
            );
            
            nameInput.value = '';
            rewardInput.value = '10';
            
            UI.success(`悬赏任务 "${task.name}" 已添加！`);
            this.renderBountyManagement();
            this.refreshUI();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // 登出
    handleLogout() {
        if (!confirm('确定要退出登录吗？')) return;
        
        Auth.logout();
        this.showLoginPage();
        UI.success('已退出登录');
    },

    // ========== 绑定全局事件 ==========
    bindEvents() {
        // 登录表单
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                await this.handleLogin();
            };
        }

        // 登出按钮
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = () => this.handleLogout();
        }

        // 添加悬赏按钮
        const addBountyBtn = document.getElementById('addBountyBtn');
        if (addBountyBtn) {
            addBountyBtn.onclick = () => this.handleAddBounty();
        }
    },

    // 处理登录
    async handleLogin() {
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const roleSelect = document.getElementById('loginRole');

        if (!usernameInput || !passwordInput) return;

        const username = usernameInput.value;
        const password = passwordInput.value;
        const role = roleSelect ? roleSelect.value : 'executor';

        try {
            UI.showLoading('登录中...');
            await Auth.login(username, password, role);
            UI.hideLoading();
            
            UI.success('登录成功！');
            this.enterApp();
        } catch (e) {
            UI.hideLoading();
            UI.error(e.message);
        }
    },

    // ========== 🆕 任务管理中心 ==========
    
    // 打开任务管理弹窗
    openTaskManager() {
        this.renderTaskManagerContent();
        UI.showModal('taskManagerModal');
    },

    // 渲染任务管理内容
    renderTaskManagerContent() {
        const container = document.getElementById('taskManagerContent');
        if (!container) return;

        const coreTasks = Storage.getCoreTasks();
        const dailyTasks = Storage.getDailyTasks();
        const bountyTasks = Storage.getBountyTasks();
        const penalties = Storage.getPenalties();
        const storeItems = Storage.getStoreItems();

        container.innerHTML = `
            <!-- 标签页导航 -->
            <div class="tab-nav">
                <button class="tab-btn active" data-tab="core">🎯 核心任务</button>
                <button class="tab-btn" data-tab="daily">📋 日常任务</button>
                <button class="tab-btn" data-tab="bounty">🏆 悬赏任务</button>
                <button class="tab-btn" data-tab="penalties">⚠️ 惩罚项</button>
                <button class="tab-btn" data-tab="store">🏪 商店</button>
            </div>

            <!-- 核心任务 -->
            <div class="tab-content active" id="tab-core">
                <div class="manager-header">
                    <h4>🎯 核心任务管理</h4>
                    <button class="btn-add-new" onclick="App.showAddItemForm('task', 'core')">➕ 添加</button>
                </div>
                <div class="manager-list" id="manager-core-list">
                    ${this.renderManagerItems(coreTasks, 'task', 'core')}
                </div>
            </div>

            <!-- 日常任务 -->
            <div class="tab-content" id="tab-daily">
                <div class="manager-header">
                    <h4>📋 日常任务管理</h4>
                    <button class="btn-add-new" onclick="App.showAddItemForm('task', 'daily')">➕ 添加</button>
                </div>
                <div class="manager-list" id="manager-daily-list">
                    ${this.renderManagerItems(dailyTasks, 'task', 'daily')}
                </div>
            </div>

            <!-- 悬赏任务 -->
            <div class="tab-content" id="tab-bounty">
                <div class="manager-header">
                    <h4>🏆 悬赏任务管理</h4>
                    <button class="btn-add-new" onclick="App.showAddItemForm('task', 'bounty')">➕ 添加</button>
                </div>
                <div class="manager-list" id="manager-bounty-list">
                    ${this.renderManagerItems(bountyTasks, 'task', 'bounty')}
                </div>
            </div>

            <!-- 惩罚项 -->
            <div class="tab-content" id="tab-penalties">
                <div class="manager-header">
                    <h4>⚠️ 惩罚项管理</h4>
                    <button class="btn-add-new" onclick="App.showAddItemForm('penalty')">➕ 添加</button>
                </div>
                <div class="manager-list" id="manager-penalties-list">
                    ${this.renderManagerItems(penalties, 'penalty')}
                </div>
            </div>

            <!-- 商店 -->
            <div class="tab-content" id="tab-store">
                <div class="manager-header">
                    <h4>🏪 商店管理</h4>
                    <button class="btn-add-new" onclick="App.showAddItemForm('store')">➕ 添加</button>
                </div>
                <div class="manager-list" id="manager-store-list">
                    ${this.renderManagerItems(storeItems, 'store')}
                </div>
            </div>

            <!-- 底部操作 -->
            <div class="manager-footer">
                <button class="btn-reset" onclick="App.resetAllToDefaults()">🔄 恢复默认配置</button>
            </div>
        `;

        // 绑定标签页切换
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            };
        });
    },

    // 渲染管理列表项
    renderManagerItems(items, type, category = '') {
        if (!items || items.length === 0) {
            return '<div class="empty-state">暂无数据，点击上方按钮添加</div>';
        }

        return items.map(item => {
            const valueLabel = type === 'task' ? `+${item.reward} ⭐` : `-${item.cost} ⭐`;
            const statusClass = item.enabled === false ? 'disabled' : '';
            const statusIcon = item.enabled === false ? '🔴' : '🟢';

            return `
                <div class="manager-item ${statusClass}" data-id="${item.id}">
                    <div class="item-main">
                        <span class="item-icon">${item.icon || '⭐'}</span>
                        <span class="item-name">${item.name}</span>
                        <span class="item-value">${valueLabel}</span>
                        <span class="item-status">${statusIcon}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="App.editItem('${type}', '${item.id}', '${category}')">✏️</button>
                        <button class="btn-toggle" onclick="App.toggleItem('${type}', '${item.id}', '${category}')">${item.enabled === false ? '启用' : '禁用'}</button>
                        <button class="btn-delete" onclick="App.deleteItem('${type}', '${item.id}', '${category}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // 显示添加表单
    showAddItemForm(type, category = '') {
        const isTask = type === 'task';
        const title = isTask ? '添加任务' : (type === 'penalty' ? '添加惩罚项' : '添加商店物品');
        const valueLabel = isTask ? '奖励星数' : '扣除/消耗星数';

        const formHtml = `
            <div class="edit-form">
                <h4>${title}</h4>
                <div class="form-group">
                    <label>图标</label>
                    <div class="icon-picker" id="iconPicker">
                        ${AVAILABLE_ICONS.map(icon => `<span class="icon-option" data-icon="${icon}">${icon}</span>`).join('')}
                    </div>
                    <input type="hidden" id="editIcon" value="⭐">
                </div>
                <div class="form-group">
                    <label>名称</label>
                    <input type="text" id="editName" class="form-input" placeholder="输入名称">
                </div>
                <div class="form-group">
                    <label>${valueLabel}</label>
                    <input type="number" id="editValue" class="form-input" value="10" min="1" max="999">
                </div>
                <div class="form-actions">
                    <button class="btn-confirm" onclick="App.saveNewItem('${type}', '${category}')">保存</button>
                    <button class="btn-cancel" onclick="App.closeEditForm()">取消</button>
                </div>
            </div>
        `;

        this.showEditFormModal(formHtml);
    },

    // 编辑项目
    editItem(type, itemId, category = '') {
        let item;
        if (type === 'task') {
            const allTasks = [...Storage.getCoreTasks(), ...Storage.getDailyTasks(), ...Storage.getBountyTasks()];
            item = allTasks.find(t => t.id === itemId);
        } else if (type === 'penalty') {
            item = Storage.getPenalties().find(p => p.id === itemId);
        } else {
            item = Storage.getStoreItems().find(i => i.id === itemId);
        }

        if (!item) {
            UI.error('项目不存在');
            return;
        }

        this.editingItem = item;
        this.editingType = type;
        this.editingCategory = category;

        const isTask = type === 'task';
        const title = isTask ? '编辑任务' : (type === 'penalty' ? '编辑惩罚项' : '编辑商店物品');
        const valueLabel = isTask ? '奖励星数' : '扣除/消耗星数';
        const currentValue = isTask ? item.reward : item.cost;

        const formHtml = `
            <div class="edit-form">
                <h4>${title}</h4>
                <div class="form-group">
                    <label>图标</label>
                    <div class="icon-picker" id="iconPicker">
                        ${AVAILABLE_ICONS.map(icon => `<span class="icon-option ${icon === item.icon ? 'selected' : ''}" data-icon="${icon}">${icon}</span>`).join('')}
                    </div>
                    <input type="hidden" id="editIcon" value="${item.icon || '⭐'}">
                </div>
                <div class="form-group">
                    <label>名称</label>
                    <input type="text" id="editName" class="form-input" value="${item.name}">
                </div>
                <div class="form-group">
                    <label>${valueLabel}</label>
                    <input type="number" id="editValue" class="form-input" value="${currentValue}" min="1" max="999">
                </div>
                <div class="form-actions">
                    <button class="btn-confirm" onclick="App.saveEditedItem()">保存</button>
                    <button class="btn-cancel" onclick="App.closeEditForm()">取消</button>
                </div>
            </div>
        `;

        this.showEditFormModal(formHtml);
    },

    // 显示编辑表单弹窗
    showEditFormModal(html) {
        let modal = document.getElementById('editFormModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'editFormModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `<div class="modal-content small" onclick="event.stopPropagation()">${html}</div>`;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // 绑定图标选择
        setTimeout(() => {
            document.querySelectorAll('.icon-option').forEach(opt => {
                opt.onclick = () => {
                    document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    document.getElementById('editIcon').value = opt.dataset.icon;
                };
            });
        }, 100);
    },

    // 关闭编辑表单
    closeEditForm() {
        const modal = document.getElementById('editFormModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
        this.editingItem = null;
        this.editingType = null;
        this.editingCategory = null;
    },

    // 保存新项目
    saveNewItem(type, category) {
        const icon = document.getElementById('editIcon').value;
        const name = document.getElementById('editName').value.trim();
        const value = parseInt(document.getElementById('editValue').value, 10);

        if (!name) {
            UI.error('请输入名称');
            return;
        }
        if (!value || value < 1) {
            UI.error('请输入有效的数值');
            return;
        }

        try {
            if (type === 'task') {
                Tasks.addTask(category, { name: `${icon} ${name}`, reward: value, icon });
            } else if (type === 'penalty') {
                Tasks.addPenalty({ name: `${icon} ${name}`, cost: value, icon });
            } else {
                Tasks.addStoreItem({ name: `${icon} ${name}`, cost: value, icon });
            }

            UI.success('添加成功！');
            this.closeEditForm();
            this.renderTaskManagerContent();
            this.refreshUI();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // 保存编辑的项目
    saveEditedItem() {
        if (!this.editingItem) return;

        const icon = document.getElementById('editIcon').value;
        const name = document.getElementById('editName').value.trim();
        const value = parseInt(document.getElementById('editValue').value, 10);

        if (!name) {
            UI.error('请输入名称');
            return;
        }
        if (!value || value < 1) {
            UI.error('请输入有效的数值');
            return;
        }

        try {
            const updates = { name, icon };
            if (this.editingType === 'task') {
                updates.reward = value;
                Tasks.updateTask(this.editingCategory, this.editingItem.id, updates);
            } else if (this.editingType === 'penalty') {
                updates.cost = value;
                Tasks.updatePenalty(this.editingItem.id, updates);
            } else {
                updates.cost = value;
                Tasks.updateStoreItem(this.editingItem.id, updates);
            }

            UI.success('保存成功！');
            this.closeEditForm();
            this.renderTaskManagerContent();
            this.refreshUI();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // 切换启用/禁用
    toggleItem(type, itemId, category) {
        try {
            if (type === 'task') {
                Tasks.toggleTask(category, itemId);
            } else if (type === 'penalty') {
                Tasks.togglePenalty(itemId);
            } else {
                Tasks.toggleStoreItem(itemId);
            }

            UI.success('状态已更新');
            this.renderTaskManagerContent();
            this.refreshUI();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // 删除项目
    deleteItem(type, itemId, category) {
        if (!confirm('确定要删除这个项目吗？')) return;

        try {
            if (type === 'task') {
                Tasks.deleteTask(category, itemId);
            } else if (type === 'penalty') {
                Tasks.deletePenalty(itemId);
            } else {
                Tasks.deleteStoreItem(itemId);
            }

            UI.success('删除成功');
            this.renderTaskManagerContent();
            this.refreshUI();
        } catch (e) {
            UI.error(e.message);
        }
    },

    // 恢复默认配置
    resetAllToDefaults() {
        if (!confirm('确定要恢复所有配置为默认值吗？这将清除您的自定义设置。')) return;

        Storage.resetToDefaults('all');
        UI.success('已恢复默认配置');
        this.renderTaskManagerContent();
        this.refreshUI();
    }
};

// ========== 页面加载完成后初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
