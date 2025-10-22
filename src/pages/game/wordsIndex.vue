<template>
	<div class="words-index">
		<header class="topbar">
			<view class="title">选择词书</view>
		</header>

		<main class="content">
			<div v-if="wordbooks.length > 0" class="cards">
				<div 
					v-for="wordbook in wordbooks" 
					:key="wordbook.id"
					class="card"
					@click="selectWordbook(wordbook)"
				>
					<div class="card-content">
						<div class="card-title">{{ wordbook.title }}</div>
					</div>
				</div>
			</div>
			
			<!-- 空状态 -->
			<div v-else class="empty-state">
				<text class="empty-title">暂无词书</text>
				<button class="empty-btn" @click="onAdd">创建词书</button>
			</div>
		</main>

		<!-- 新增：始终可见的浮动添加按钮（与屏幕右侧和底部边缘相接） -->
		<button class="fab" @click="onAdd" aria-label="新增词书">+</button>

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