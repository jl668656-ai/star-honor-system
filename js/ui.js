/**
 * 🦁 荣耀系统 v12.6.1 - UI 工具模块
 * 处理消息提示、动画、格式化等 UI 相关功能
 */

const UI = {
    // ========== XSS 防护 ==========
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ========== 消息提示 ==========
    showMessage(text, type = 'success') {
        const msgBox = document.getElementById('msgBox');
        if (!msgBox) {
            console.log(`[${type}] ${text}`);
            return;
        }

        msgBox.textContent = text;
        msgBox.className = 'message-box';
        msgBox.classList.add(type);
        msgBox.style.display = 'block';
        msgBox.style.opacity = '1';

        // 添加动画
        msgBox.style.animation = 'none';
        void msgBox.offsetWidth; // 触发重绘
        msgBox.style.animation = 'messageSlide 0.3s ease-out';

        setTimeout(() => {
            msgBox.style.opacity = '0';
            setTimeout(() => {
                msgBox.style.display = 'none';
            }, 300);
        }, 2500);
    },

    success(text) {
        this.showMessage(text, 'success');
    },

    error(text) {
        this.showMessage(text, 'error');
    },

    // ========== 时间格式化 ==========
    formatDateTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${month}月${day}日 ${hour}:${minute}`;
    },

    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // ========== 烟花动画 ==========
    createFireworks() {
        const container = document.getElementById('fireworksContainer');
        if (!container) return;

        container.innerHTML = '';
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FF9500'];

        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const firework = document.createElement('div');
                firework.className = 'firework';
                firework.style.left = Math.random() * 100 + '%';
                firework.style.top = Math.random() * 100 + '%';
                firework.style.background = colors[Math.floor(Math.random() * colors.length)];
                firework.style.width = (Math.random() * 10 + 5) + 'px';
                firework.style.height = firework.style.width;
                container.appendChild(firework);

                setTimeout(() => {
                    firework.remove();
                }, 1000);
            }, i * 100);
        }
    },

    // ========== 弹窗控制 ==========
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            
            // 🆕 根据弹窗类型渲染内容
            if (modalId === 'rankModal' && typeof App !== 'undefined') {
                App.renderRankTable();
            } else if (modalId === 'historyModal' && typeof App !== 'undefined') {
                App.renderHistory();
            }
        }
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    },

    // ========== 加载状态 ==========
    showLoading(text = '处理中...') {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            const textEl = loading.querySelector('.loading-text');
            if (textEl) textEl.textContent = text;
            loading.style.display = 'flex';
        }
    },

    hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            loading.style.display = 'none';
        }
    },

    // ========== 确认对话框 ==========
    async confirm(message) {
        return new Promise((resolve) => {
            resolve(window.confirm(message));
        });
    },

    // ========== 输入对话框 ==========
    async prompt(message, defaultValue = '') {
        return new Promise((resolve) => {
            resolve(window.prompt(message, defaultValue));
        });
    },

    // ========== 页面切换 ==========
    showPage(pageId) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });

        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            targetPage.style.display = 'block';
        }
    },

    // ========== 创建状态 Badge ==========
    createStatusBadge(status, text) {
        const badge = document.createElement('span');
        badge.className = `status-badge status-${status}`;
        badge.textContent = text;
        return badge;
    },

    // ========== 滚动到顶部 ==========
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ========== 军衔显示 ==========
    getRankInfo(score) {
        const ranks = RANK_SYSTEM;
        for (let i = ranks.length - 1; i >= 0; i--) {
            if (score >= ranks[i].min) {
                return ranks[i];
            }
        }
        return ranks[0];
    },

    getNextRankInfo(score) {
        const ranks = RANK_SYSTEM;
        for (let i = 0; i < ranks.length; i++) {
            if (score < ranks[i].min) {
                return {
                    rank: ranks[i],
                    needed: ranks[i].min - score
                };
            }
        }
        return null;
    },

    // ========== 更新 UI 数值动画 ==========
    animateValue(element, start, end, duration = 500) {
        if (!element) return;

        const range = end - start;
        const startTime = performance.now();

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用 easeOutQuad
            const easeProgress = 1 - (1 - progress) * (1 - progress);
            const current = Math.round(start + range * easeProgress);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    },

    // ========== 震动反馈 ==========
    vibrate(pattern = [50]) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
};
