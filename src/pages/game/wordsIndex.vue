<template>
	<div class="words-index">
		<header class="topbar">
			<view class="title">选择词书</view>
			<button class="icon-btn" @click="onAdd" aria-label="新增词书">
				<text class="icon">+</text>
			</button>
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

		<!-- 新增词书弹窗 -->
		<view v-if="showAddModal" class="modal-overlay" @click="closeAddModal">
			<view class="modal-content" @click.stop>
				<view class="modal-header">
					<text class="modal-title">新增词书</text>
					<button class="close-btn" @click="closeAddModal">×</button>
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
						<picker @change="onDifficultyChange" :value="difficultyIndex" :range="difficultyOptions">
							<view class="picker">{{ difficultyOptions[difficultyIndex] }}</view>
						</picker>
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

// 难度选择变化
function onDifficultyChange(e) {
	difficultyIndex.value = e.detail.value
	newWordbook.difficulty = difficultyMap[e.detail.value]
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

.icon-btn {
	width: 44px;
	height: 44px;
	border: 2px solid #333;
	border-radius: 12px;
	background: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease;
	-webkit-tap-highlight-color: transparent;
}

.icon-btn:active {
	transform: scale(0.9);
	background: #f5f5f5;
}

.icon {
	color: #333;
	font-size: 18px;
	font-weight: bold;
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
	border-radius: 12px;
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

.close-btn {
	width: 32px;
	height: 32px;
	border-radius: 16px;
	background: #f8f9fa;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	color: #7f8c8d;
	transition: all 0.15s ease;
	-webkit-tap-highlight-color: transparent;
}

.close-btn:active {
	background: #e9ecef;
	transform: scale(0.9);
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

.picker {
	width: 100%;
	height: 40px;
	padding: 0 12px;
	border: 1px solid #e8ecef;
	border-radius: 8px;
	display: flex;
	align-items: center;
	font-size: 15px;
	background: #fafbfc;
	box-sizing: border-box;
	transition: all 0.2s ease;
}

.picker:focus {
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
	border-radius: 12px;
	font-size: 15px;
	font-weight: bold;
	transition: all 0.15s ease;
	-webkit-tap-highlight-color: transparent;
}

.empty-btn:active {
	background: #f5f5f5;
	transform: scale(0.95);
}

/* 响应式设计 */
@media (max-width: 768px) {
	.words-index {
		padding: env(safe-area-inset-top) 16px 20px 16px;
	}
	
	.cards {
		grid-template-columns: 1fr;
		gap: 20px;
	}
	
	.card-thumb {
		height: 80px;
	}
	
	.card-icon {
		font-size: 32px;
	}
	
	.modal-content {
		margin: 0 16px;
	}
	
	.empty-state {
		padding: 60px 16px;
	}
}

@media (max-width: 480px) {
	.words-index {
		padding: env(safe-area-inset-top) 12px 16px 12px;
	}
	
	.topbar {
		height: 56px;
		margin-bottom: 20px;
	}
	
	.title {
		font-size: 20px;
	}
	
	.icon-btn {
		width: 40px;
		height: 40px;
	}
	
	.icon {
		font-size: 16px;
	}
	
	.cards {
		gap: 16px;
	}
	
	.card {
		min-height: 100px;
	}
	
	.card-content {
		padding: 25px;
		min-height: 100px;
	}
	
	.card-info {
		padding: 16px;
	}
	
	.card-title {
		font-size: 16px;
	}
	
	.card-desc {
		font-size: 13px;
	}
	
	.btn-cancel, .btn-confirm {
		height: 48px;
		font-size: 16px;
	}
	
	.empty-btn {
		padding: 16px 32px;
		font-size: 16px;
	}
}
</style>