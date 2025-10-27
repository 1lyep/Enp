<template>
	<div class="words-index">
		<header class="topbar">
			<view class="title">选择词书</view>
		</header>

		<main class="content" @click="cancelPendingDelete">
			<div v-if="wordbooks.length > 0" class="cards">
					<div 
						v-for="wordbook in wordbooks" 
						:key="wordbook.id"
						:class="['card', { 'editing': editMode }]"
						@click.stop="onCardClick(wordbook)"
						@touchstart.passive="startPress(wordbook)" @touchend="cancelPress" @touchcancel="cancelPress"
						@mousedown="startPress(wordbook)" @mouseup="cancelPress" @mouseleave="cancelPress"
						:style="pressStyle(wordbook)"
					>
						<div class="card-content">
							<!-- 覆盖层已移除；长按事件由外层 card 捕获 -->

							<!-- 如果处于待删除状态，将卡片内容替换为叉号 -->
							<div v-if="showDeleteId === wordbook.id" class="delete-cross" @click.stop="confirmDelete(wordbook.id)">✕</div>

							<!-- 否则显示正常标题 -->
							<div v-else class="card-title">{{ wordbook.title }}</div>
						</div>
					</div>

					<!-- 编辑模式下末尾显示一个添加卡片 -->
					<div v-if="editMode" class="card add-card" @click="onAdd">
						<div class="card-content add-content">
							<div class="add-plus">+</div>
						</div>
					</div>
			</div>
			
			<!-- 空状态 -->
			<div v-else class="empty-state">
				<text class="empty-title">暂无词书</text>
				<button class="empty-btn" @click="onAdd">创建词书</button>
			</div>
		</main>

		<!-- 浮动按钮：切换到编辑模式（编辑模式下可再次点击退出） -->
			<button class="fab" @click="toggleEditMode" aria-label="编辑模式">{{ editMode ? '✓' : '✎' }}</button>

		<!-- 新增词书弹窗 -->
		<view v-if="showAddModal" class="modal-overlay" @click="closeAddModal">
			<view class="modal-content" @click.stop>
				<view class="modal-header">
					<text class="modal-title">新增词书</text>
				</view>
				<view class="modal-body">
					<view class="form-group">
						<text class="label">词书名称</text>
						<input v-model="newWordbook.title" placeholder="请输入词书名称" class="input" />
					</view>
					<view class="form-group">
						<text class="label">描述</text>
						<input v-model="newWordbook.description" placeholder="请输入描述" class="input" />
					</view>
					<view class="form-group">
						<text class="label">难度</text>
						<select v-model.number="difficultyIndex" @change="onDifficultyChange" class="select">
							<option v-for="(opt, idx) in difficultyOptions" :key="idx" :value="idx">{{ opt }}</option>
						</select>
					</view>
				</view>
				<view class="modal-footer">
					<button class="btn-cancel" @click="closeAddModal">取消</button>
					<button class="btn-confirm" @click="confirmAdd">确认</button>
				</view>
			</view>
		</view>
	</div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

// 词书数据
const wordbooks = ref([])

// 加载词书数据
async function loadWordbooks() {
	try {
		const res = await uni.request({
			url: '/static/data/wordbooks.json',
			method: 'GET'
		})
		wordbooks.value = res.data
	} catch (error) {
		console.error('加载词书数据失败:', error)
		uni.showToast({
			title: '加载词书失败',
			icon: 'none'
		})
	}
}

// 页面加载时获取词书数据
onMounted(() => {
	loadWordbooks()
})

// 弹窗状态
const showAddModal = ref(false)
const newWordbook = reactive({
	title: '',
	description: '',
	difficulty: 'easy'
})

// 编辑模式状态
const editMode = ref(false)

// 切换编辑模式
function toggleEditMode() {
	editMode.value = !editMode.value
	// 退出编辑模式时清除待删除提示
	if (!editMode.value) {
		cancelPendingDelete()
	}
}

// （已移除：选中变深色的逻辑）

// 删除词书（立即删除，长按触发）
function deleteWordbook(id) {
	const idx = wordbooks.value.findIndex(w => w.id === id)
	if (idx !== -1) {
		wordbooks.value.splice(idx, 1)
	}
}

// 卡片点击处理：编辑模式下选中/取消；普通模式下选择并进入游戏
function onCardClick(wordbook) {
	if (editMode.value) {
		// 如果该卡片处于待删除状态（长按后变成深红），再次点击该卡片则删除
		if (showDeleteId.value === wordbook.id) {
			confirmDelete(wordbook.id)
		}
		// 编辑模式下短按其它卡片不做任何操作（页面空白取消）
		return
	}

	// 普通模式下点击进入游戏
	selectWordbook(wordbook)
}

// 长按处理：用 requestAnimationFrame 做渐进反馈
const pressTargetId = ref(null)
const pressStartTime = ref(0)
const rafId = ref(null)
const pressProgress = ref(0) // 0.0 ~ 1.0
const LONG_PRESS_DURATION = 600
// 待确认删除的词书 id（长按到阈值后显示叉号，点击叉号才真正删除）
const showDeleteId = ref(null)

function startPress(wordbook) {
	cancelPress()
	pressTargetId.value = wordbook.id
	pressStartTime.value = performance.now()
	pressProgress.value = 0

	const tick = (now) => {
		const elapsed = now - pressStartTime.value
		const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1)
		pressProgress.value = progress

		if (progress >= 1) {
			// 达到长按阈值
			onLongPress(wordbook)
			rafId.value = null
			pressProgress.value = 0
			pressTargetId.value = null
			return
		}

		rafId.value = requestAnimationFrame(tick)
	}

	rafId.value = requestAnimationFrame(tick)
}

function cancelPress() {
	if (rafId.value) {
		cancelAnimationFrame(rafId.value)
		rafId.value = null
	}
	pressProgress.value = 0
	pressTargetId.value = null
}

function onLongPress(wordbook) {
	if (!editMode.value) return
	// 显示叉号（不直接删除），由用户再点击叉号确认
	showDeleteId.value = wordbook.id
	// 清理进度并计时器
	pressProgress.value = 0
	if (rafId.value) {
		cancelAnimationFrame(rafId.value)
		rafId.value = null
	}
}

// 取消待删除（例如点击其他地方）
function cancelPendingDelete() {
	showDeleteId.value = null
}

// 用户点击叉号后调用，真正删除
function confirmDelete(id) {
	deleteWordbook(id)
	showDeleteId.value = null
}

// 返回传给卡片的内联样式（用于渐进改变背景色）
function pressStyle(wordbook) {
	// 如果已进入待删除状态（显示叉号），把卡片背景变成与叉相同的深红并保持该状态
	if (showDeleteId.value === wordbook.id) {
		return { background: '#c92b2b' }
	}

	if (!editMode.value) return {}
	if (pressTargetId.value !== wordbook.id) return {}

	// 基础和目标 alpha 值（与样式中的定义保持一致）
	const baseAlpha = 0.06
	const targetAlpha = 0.28
	const alpha = baseAlpha + (targetAlpha - baseAlpha) * pressProgress.value
	const color = `rgba(128,0,0,${alpha})`
	return {
		background: color
	}
}

// 难度选项
const difficultyOptions = ['简单', '中等', '困难']
const difficultyIndex = ref(0)

// 难度映射
const difficultyMap = {
	0: 'easy',
	1: 'medium', 
	2: 'hard'
}

// 获取难度文本
function getDifficultyText(difficulty) {
	const map = {
		'easy': '简单',
		'medium': '中等',
		'hard': '困难'
	}
	return map[difficulty] || '简单'
}

// 选择词书
function selectWordbook(wordbook) {
	try {
		// 将选中的词书数据存储到本地存储
		uni.setStorageSync('selectedWordbook', wordbook)
		
		// 跳转到游戏页面
		uni.navigateTo({
			url: '/pages/game/game',
			fail: (err) => {
				uni.showToast({
					title: '跳转失败',
					icon: 'none'
				})
			}
		})
	} catch (error) {
		uni.showToast({
			title: '选择词书失败',
			icon: 'none'
		})
	}
}

// 打开新增弹窗
function onAdd() {
	showAddModal.value = true
	// 重置表单
	newWordbook.title = ''
	newWordbook.description = ''
	newWordbook.difficulty = 'easy'
	difficultyIndex.value = 0
	// 取消任何待删除提示
	cancelPendingDelete()
}

// 关闭新增弹窗
function closeAddModal() {
	showAddModal.value = false
}

// 难度选择变化（改为处理原生 select 事件）
function onDifficultyChange(e) {
	const idx = Number(e.target.value)
	difficultyIndex.value = idx
	newWordbook.difficulty = difficultyMap[idx]
}

// 确认新增
function confirmAdd() {
	if (!newWordbook.title.trim()) {
		uni.showToast({
			title: '请输入词书名称',
			icon: 'none'
		})
		return
	}
	
	// 创建新词书
	const newBook = {
		id: Date.now(),
		title: newWordbook.title,
		description: newWordbook.description || '自定义词书',
		icon: '📖',
		difficulty: newWordbook.difficulty,
		wordCount: 0,
		progress: 0,
		gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
		words: []
	}
	
	// 添加到词书列表
	wordbooks.value.push(newBook)
	
	// 关闭弹窗
	closeAddModal()
	
	uni.showToast({
		title: '词书创建成功',
		icon: 'success'
	})
}
</script>

<style scoped>
.words-index {
	background: #fff;
	min-height: 100vh;
	box-sizing: border-box;
	padding: env(safe-area-inset-top) 20px 24px 20px;
	color: #333;
}

/* 顶部条 */
.topbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 60px;
	padding: 0 4px;
	margin-bottom: 24px;
}

.title {
	font-size: 24px;
	font-weight: bold;
	color: #333;
}

/* 主体内容 */
.content {
	padding-top: 0;
}

/* 卡片容器 */
.cards {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: 24px;
	width: 100%;
	max-width: 1000px;
	margin: 0 auto;
	padding: 0;
	box-sizing: border-box;
}

/* 单个卡片 */
.card {
	background: white;
	border: 2px solid #333;
	border-radius: 16px; /* 从 12px 改为 16px，使边更圆 */
	overflow: hidden;
	transition: all 0.15s ease;
	position: relative;
	-webkit-tap-highlight-color: transparent;
	min-height: 80px;
}

.card:active {
	transform: scale(0.98);
	background: #f5f5f5;
}

/* 卡片内容 */
.card-content {
	padding: 30px;
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 80px;
}

.card-title {
	font-size: 22px;
	font-weight: bold;
	color: #333;
}

/* 编辑模式下：所有卡片变为淡暗红色 */
.card.editing {
	background: rgba(128, 0, 0, 0.06); /* 淡暗红色背景 */
	border-color: rgba(128,0,0,0.18);
}

/* 覆盖层已移除（编辑模式时文字上方的白色半透明框已取消） */

.delete-btn {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background: #c92b2b;
	color: #fff;
	border: none;
	padding: 6px 12px;
	border-radius: 8px;
	font-size: 14px;
	cursor: pointer;
}
.delete-btn:active { transform: translate(-50%, -50%) scale(0.98); }

/* 卡片被标记为待删除时替换的叉号样式 */
.delete-cross {
	font-size: 48px;
	color: #fff;
	background: #c92b2b;
	width: 72px;
	height: 72px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	
	margin: 0 auto;
	cursor: pointer;
}
.delete-cross:active { transform: translate(-50%, -50%) scale(0.98); }

/* 编辑模式下末尾添加卡片样式 */
.card.add-card {
	display: flex;
	align-items: center;
	justify-content: center;
	border-style: dashed;
	background: linear-gradient(135deg, #fff 0%, #fff 100%);
}
.add-plus {
	font-size: 34px;
	color: #333;
	font-weight: 700;
}
.card.add-card .add-plus { transform: translateY(-4px); }
.card-content.add-content { padding: 24px; }

/* 弹窗样式 */
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0,0,0,0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: 20px;
	box-sizing: border-box;
}

.modal-content {
	background: white;
	border-radius: 12px;
	width: 100%;
	max-width: 400px;
	max-height: 80vh;
	overflow: hidden;
	box-shadow: 0 10px 30px rgba(0,0,0,0.15);
	border: 1px solid #e8ecef;
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24px 24px 0 24px;
}

.modal-title {
	font-size: 20px;
	font-weight: 300;
	color: #2c3e50;
	letter-spacing: 0.3px;
}

.modal-body {
	padding: 24px;
}

.form-group {
	margin-bottom: 20px;
}

.label {
	display: block;
	font-size: 14px;
	font-weight: 400;
	color: #2c3e50;
	margin-bottom: 8px;
	letter-spacing: 0.2px;
}

.input {
	width: 100%;
	height: 40px;
	padding: 0 12px;
	border: 1px solid #e8ecef;
	border-radius: 8px;
	font-size: 15px;
	box-sizing: border-box;
	transition: all 0.2s ease;
	background: #fafbfc;
}

.input:focus {
	outline: none;
	border-color: #2c3e50;
	background: white;
}

.select {
	appearance: none;
	-webkit-appearance: none;
	-moz-appearance: none;
	width: 100%;
	height: 40px;
	padding: 0 12px;
	border: 1px solid #e8ecef;
	border-radius: 8px;
	display: flex;
	align-items: center;
	font-size: 15px;
	background: #fafbfc url("data:image/svg+xml;charset=UTF-8,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23555' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 12px center / 10px 6px;
	box-sizing: border-box;
	transition: all 0.2s ease;
}

.select:focus {
	outline: none;
	border-color: #2c3e50;
	background: white;
}

.modal-footer {
	display: flex;
	gap: 12px;
	padding: 0 24px 24px 24px;
}

.btn-cancel, .btn-confirm {
	flex: 1;
	height: 44px;
	border-radius: 8px;
	font-size: 15px;
	font-weight: 400;
	border: none;
	transition: all 0.15s ease;
	letter-spacing: 0.3px;
	-webkit-tap-highlight-color: transparent;
}

.btn-cancel {
	background: #f8f9fa;
	color: #7f8c8d;
	border: 1px solid #e8ecef;
}

.btn-cancel:active {
	background: #e9ecef;
	transform: scale(0.98);
}

.btn-confirm {
	background: #2c3e50;
	color: white;
}

.btn-confirm:active {
	background: #34495e;
	transform: scale(0.98);
}

/* 空状态样式 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80px 20px;
	text-align: center;
}

.empty-title {
	font-size: 20px;
	font-weight: bold;
	color: #333;
	margin-bottom: 20px;
}

.empty-btn {
	padding: 14px 28px;
	background: #fff;
	color: #333;
	border: 2px solid #333;
	border-radius: 16px; /* 更圆 */
	font-size: 15px;
	font-weight: bold;
	transition: all 0.15s ease;
	-webkit-tap-highlight-color: transparent;
}

.empty-btn:active {
	background: #f5f5f5;
	transform: scale(0.95);
}

/* 浮动添加按钮：与屏幕右侧和底部边缘相接，始终可见 */
.fab {
	position: fixed;
	right: 12px; /* 从 0 改为 12px，便于显示圆角 */
	bottom: calc(12px + env(safe-area-inset-bottom));
	width: 70px;
	height: 64px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #fff;
	color: #333;
	border: 2px solid #333;
	border-radius: 16px; /* 关键：圆角 */
	box-shadow: 0 8px 20px rgba(0,0,0,0.12);
	font-size: 28px;
	line-height: 1;
	cursor: pointer;
	z-index: 1200;
	-webkit-tap-highlight-color: transparent;
	transition: transform 0.12s ease, background 0.12s ease;
	padding: 0;               /* 去掉可能影响居中的内边距 */
	box-sizing: border-box;
	display: flex;
	align-items: center;     /* 垂直居中 */
	justify-content: center; /* 水平居中 */
	line-height: 1;
	font-weight: 700;        /* 稍微加粗，视觉更居中 */
	transform: translateY(-1px);
}

/* 点击反馈 */
.fab:active {
	transform: translateY(-1px) scale(0.96);
	background: #f5f5f5;
}

/* 可选：在保留安全区时让按钮稍上移（若需要贴合物理屏幕边缘可移除） */
@supports (padding: env(safe-area-inset-bottom)) {
	.fab {
		bottom: calc(12px + env(safe-area-inset-bottom));
		right: calc(12px + env(safe-area-inset-right));
	}
}

/* 小屏调整 */
@media (max-width: 480px) {
	.fab {
		width: 56px;
		height: 56px;
		font-size: 24px;
		border-radius: 14px;
	}
}
</style>