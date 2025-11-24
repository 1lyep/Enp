<template>
	<div class="words-index">
		<!-- 顶部导航 -->
		<header class="topbar">
			<view class="left-actions">
				<view class="action-btn" @click="goToSettings">
					<text class="icon">⚙️</text>
				</view>
			</view>
			<view class="title">我的词书</view>
			<view class="right-actions">
				<view class="action-btn" @click="openAddModal">
					<text class="plus-icon">+</text>
				</view>
			</view>
		</header>

		<main class="content">
			<div v-if="wordbooks.length > 0" class="cards">
				<div 
					v-for="wordbook in wordbooks" 
					:key="wordbook.id"
					class="card"
					@click="onCardClick(wordbook)"
				>
					<!-- 渐变背景装饰 -->
					<div class="card-bg" :style="{ background: wordbook.gradient || defaultGradient }"></div>
					
					<div class="card-body">
						<div class="card-icon">{{ wordbook.icon || '📖' }}</div>
						<div class="card-info">
							<div class="card-title">{{ wordbook.title }}</div>
							<div class="card-desc">{{ wordbook.description || '暂无描述' }}</div>
							<div class="card-meta">
								<text class="badge">{{ getDifficultyText(wordbook.difficulty) }}</text>
								<text class="count">{{ wordbook.wordCount || 0 }} 词</text>
							</div>
						</div>
						<!-- 菜单按钮 -->
						<div class="card-menu-btn" @click.stop="openMenu(wordbook)">
							<text class="dots">•••</text>
						</div>
					</div>
				</div>
			</div>
			
			<!-- 空状态 -->
			<div v-else class="empty-state">
				<div class="empty-icon">📚</div>
				<text class="empty-title">还没有词书</text>
				<text class="empty-desc">创建一个词书开始你的学习之旅吧</text>
				<button class="empty-btn" @click="openAddModal">创建第一个词书</button>
			</div>
		</main>

		<!-- 底部弹窗容器 (ActionSheet & Form) -->
		<div class="bottom-sheet-container" :class="{ 'show': showBottomSheet }" @click="closeBottomSheet">
			<div class="bottom-sheet" @click.stop>
				<!-- 1. 菜单模式 -->
				<div v-if="sheetMode === 'menu'" class="sheet-menu">
					<div class="sheet-header">
						<text class="sheet-title">{{ activeWordbook?.title }}</text>
					</div>
					<div class="menu-list">
						<div class="menu-item" @click="onMenuAction('play')">
							<text class="menu-icon">🎮</text>
							<text class="menu-text">开始练习</text>
						</div>
						<div class="menu-item" @click="onMenuAction('manage')">
							<text class="menu-icon">📝</text>
							<text class="menu-text">管理单词</text>
						</div>
						<div class="menu-item" @click="onMenuAction('edit')">
							<text class="menu-icon">✏️</text>
							<text class="menu-text">修改信息</text>
						</div>
						<div class="menu-item delete" @click="onMenuAction('delete')">
							<text class="menu-icon">🗑️</text>
							<text class="menu-text">删除词书</text>
						</div>
					</div>
					<div class="sheet-cancel" @click="closeBottomSheet">取消</div>
				</div>

				<!-- 2. 表单模式 (新增/编辑) -->
				<div v-if="sheetMode === 'form'" class="sheet-form">
					<div class="sheet-header">
						<text class="sheet-title">{{ formType === 'add' ? '新建词书' : '编辑词书' }}</text>
						<text class="sheet-close" @click="closeBottomSheet">✕</text>
					</div>
					<div class="form-body">
						<div class="form-item">
							<text class="label">名称</text>
							<input class="input" v-model="formData.title" placeholder="给词书起个名字" />
						</div>
						<div class="form-item">
							<text class="label">描述</text>
							<input class="input" v-model="formData.description" placeholder="简单描述一下 (可选)" />
						</div>
						<div class="form-item">
							<text class="label">难度</text>
							<div class="difficulty-options">
								<div 
									v-for="diff in difficultyOptions" 
									:key="diff.value"
									class="diff-chip"
									:class="{ active: formData.difficulty === diff.value }"
									@click="formData.difficulty = diff.value"
								>
									{{ diff.label }}
								</div>
							</div>
						</div>
					</div>
					<div class="form-footer">
						<button class="submit-btn" @click="submitForm">保存</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import DB from '@/utils/db.js'

// --- 数据 ---
const wordbooks = ref([])
const defaultGradient = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'

// 底部弹窗状态
const showBottomSheet = ref(false)
const sheetMode = ref('menu') // 'menu' | 'form'
const formType = ref('add') // 'add' | 'edit'
const activeWordbook = ref(null) // 当前操作的词书对象

// 表单数据
const formData = reactive({
	title: '',
	description: '',
	difficulty: 'easy'
})

const difficultyOptions = [
	{ label: '简单', value: 'easy' },
	{ label: '中等', value: 'medium' },
	{ label: '困难', value: 'hard' }
]

// --- 生命周期 ---
onMounted(async () => {
	await DB.init()
	loadWordbooks()
})

onShow(() => {
	loadWordbooks()
})

// --- 方法 ---

async function loadWordbooks() {
	try {
		const books = await DB.getWordBooks()
		wordbooks.value = books
	} catch (error) {
		console.error('加载失败', error)
	}
}

function getDifficultyText(val) {
	const map = { easy: '简单', medium: '中等', hard: '困难' }
	return map[val] || '简单'
}

// 点击卡片 -> 直接开始练习 (或者根据需求改为打开菜单，这里设定为直接开始，菜单在右下角)
function onCardClick(book) {
	selectWordbook(book)
}

// 打开菜单
function openMenu(book) {
	activeWordbook.value = book
	sheetMode.value = 'menu'
	showBottomSheet.value = true
}

// 菜单操作
function onMenuAction(action) {
	if (!activeWordbook.value) return

	switch (action) {
		case 'play':
			selectWordbook(activeWordbook.value)
			closeBottomSheet()
			break
		case 'manage':
			uni.navigateTo({
				url: `/pages/game/wordManage?id=${activeWordbook.value.id}`
			})
			closeBottomSheet()
			break
		case 'edit':
			openEditForm(activeWordbook.value)
			break
		case 'delete':
			confirmDelete(activeWordbook.value)
			break
	}
}

// 打开新增表单
function openAddModal() {
	activeWordbook.value = null
	formType.value = 'add'
	sheetMode.value = 'form'
	
	// 重置表单
	formData.title = ''
	formData.description = ''
	formData.difficulty = 'easy'
	
	showBottomSheet.value = true
}

// 打开编辑表单
function openEditForm(book) {
	formType.value = 'edit'
	sheetMode.value = 'form'
	
	// 填充表单
	formData.title = book.title
	formData.description = book.description
	formData.difficulty = book.difficulty
}

// 提交表单
async function submitForm() {
	if (!formData.title.trim()) {
		uni.showToast({ title: '请输入名称', icon: 'none' })
		return
	}

	try {
		if (formType.value === 'add') {
			const newBook = {
				title: formData.title,
				description: formData.description || '自定义词书',
				icon: '📖',
				difficulty: formData.difficulty,
				gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' // 可以随机生成
			}
			await DB.addWordBook(newBook)
			uni.showToast({ title: '创建成功', icon: 'success' })
		} else {
			// 编辑
			const updatedBook = {
				...activeWordbook.value,
				title: formData.title,
				description: formData.description,
				difficulty: formData.difficulty
			}
			await DB.updateWordBook(updatedBook)
			uni.showToast({ title: '已更新', icon: 'none' })
		}
		
		loadWordbooks()
		closeBottomSheet()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '操作失败', icon: 'none' })
	}
}

// 删除确认
function confirmDelete(book) {
	uni.showModal({
		title: '确认删除',
		content: `确定要删除词书 "${book.title}" 及其所有单词吗？`,
		confirmColor: '#ff4d4f',
		success: async (res) => {
			if (res.confirm) {
				try {
					await DB.deleteWordBook(book.id)
					loadWordbooks()
					closeBottomSheet()
					uni.showToast({ title: '已删除', icon: 'none' })
				} catch (e) {
					uni.showToast({ title: '删除失败', icon: 'none' })
				}
			}
		}
	})
}

// 关闭弹窗
function closeBottomSheet() {
	showBottomSheet.value = false
}

// 跳转设置
function goToSettings() {
	uni.navigateTo({
		url: '/pages/settings/settings'
	})
}

// 进入游戏逻辑
async function selectWordbook(wordbook) {
	try {
		const fullBook = await DB.getWordBookById(wordbook.id)
		if (!fullBook) {
			uni.showToast({ title: '词书不存在', icon: 'none' })
			return
		}
		uni.setStorageSync('selectedWordbook', fullBook)
		uni.navigateTo({
			url: '/pages/game/game',
			fail: () => uni.showToast({ title: '跳转失败', icon: 'none' })
		})
	} catch (error) {
		uni.showToast({ title: '进入失败', icon: 'none' })
	}
}
</script>

<style scoped>
.words-index {
	min-height: 100vh;
	background: #f5f7fa;
	padding-bottom: 40px;
}

/* 顶部导航 */
.topbar {
	background: #fff;
	height: 56px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 20px;
	padding-top: env(safe-area-inset-top);
	position: sticky;
	top: 0;
	z-index: 100;
	box-shadow: 0 2px 12px rgba(0,0,0,0.03);
}

.title {
	font-size: 20px;
	font-weight: 700;
	color: #1a1a1a;
}

.action-btn {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: #f0f2f5;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;
}
.action-btn:active { background: #e1e4e8; }
.plus-icon { font-size: 24px; color: #333; line-height: 1; font-weight: 300; }
.icon { font-size: 18px; }

.left-actions, .right-actions {
	width: 40px; /* 占位宽度保持标题居中 */
	display: flex;
	justify-content: center;
}

/* 内容区 */
.content {
	padding: 20px;
}

/* 卡片列表 */
.cards {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.card {
	background: #fff;
	border-radius: 16px;
	overflow: hidden;
	position: relative;
	box-shadow: 0 4px 16px rgba(0,0,0,0.04);
	transition: transform 0.1s;
}
.card:active { transform: scale(0.98); }

/* 卡片左侧/背景装饰条 */
.card-bg {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	width: 6px;
}

.card-body {
	padding: 20px;
	padding-left: 26px; /* 避开左侧条 */
	display: flex;
	align-items: center;
	gap: 16px;
}

.card-icon {
	font-size: 32px;
	width: 48px;
	height: 48px;
	background: #f8f9fa;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.card-info {
	flex: 1;
	overflow: hidden;
}

.card-title {
	font-size: 18px;
	font-weight: 600;
	color: #1a1a1a;
	margin-bottom: 4px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-desc {
	font-size: 13px;
	color: #8c9ba5;
	margin-bottom: 8px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-meta {
	display: flex;
	align-items: center;
	gap: 8px;
}

.badge {
	font-size: 11px;
	padding: 2px 8px;
	background: #edf2f7;
	color: #4a5568;
	border-radius: 100px;
	font-weight: 500;
}

.count {
	font-size: 12px;
	color: #a0aec0;
}

.card-menu-btn {
	padding: 8px;
	margin-right: -8px;
	color: #cbd5e0;
}
.card-menu-btn:active { color: #718096; }
.dots { font-size: 20px; letter-spacing: 1px; font-weight: bold; transform: rotate(90deg); }

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding-top: 100px;
}
.empty-icon { font-size: 64px; margin-bottom: 16px; opacity: 0.5; }
.empty-title { font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 8px; }
.empty-desc { font-size: 14px; color: #718096; margin-bottom: 32px; }
.empty-btn {
	background: #2c3e50;
	color: #fff;
	font-size: 15px;
	padding: 12px 32px;
	border-radius: 100px;
	border: none;
	box-shadow: 0 4px 12px rgba(44, 62, 80, 0.3);
}

/* 底部弹窗 */
.bottom-sheet-container {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0,0,0,0.4);
	z-index: 999;
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.25s ease;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
}

.bottom-sheet-container.show {
	opacity: 1;
	pointer-events: auto;
}

.bottom-sheet {
	background: #fff;
	border-radius: 24px 24px 0 0;
	padding-bottom: env(safe-area-inset-bottom);
	transform: translateY(100%);
	transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
	max-height: 85vh;
	display: flex;
	flex-direction: column;
}

.bottom-sheet-container.show .bottom-sheet {
	transform: translateY(0);
}

/* 菜单模式样式 */
.sheet-menu {
	padding: 10px 0;
}

.sheet-header {
	padding: 20px 24px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid #f0f0f0;
}

.sheet-title {
	font-size: 18px;
	font-weight: 600;
	color: #1a1a1a;
}

.sheet-close {
	font-size: 20px;
	color: #a0aec0;
	padding: 4px;
}

.menu-list {
	padding: 8px 16px;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 16px;
	border-radius: 12px;
	transition: background 0.2s;
}
.menu-item:active { background: #f7fafc; }

.menu-icon { font-size: 20px; margin-right: 16px; width: 24px; text-align: center; }
.menu-text { font-size: 16px; color: #2d3748; font-weight: 500; }

.menu-item.delete .menu-text { color: #e53e3e; }

.sheet-cancel {
	text-align: center;
	padding: 16px;
	color: #718096;
	font-size: 15px;
	border-top: 8px solid #f7fafc;
}

/* 表单模式样式 */
.sheet-form {
	display: flex;
	flex-direction: column;
}

.form-body {
	padding: 24px;
}

.form-item {
	margin-bottom: 24px;
}

.label {
	display: block;
	font-size: 14px;
	color: #4a5568;
	margin-bottom: 8px;
	font-weight: 500;
}

.input {
	width: 100%;
	height: 48px;
	background: #f7fafc;
	border-radius: 12px;
	padding: 0 16px;
	font-size: 16px;
	color: #1a1a1a;
	box-sizing: border-box;
}

.difficulty-options {
	display: flex;
	gap: 12px;
}

.diff-chip {
	padding: 8px 16px;
	background: #f7fafc;
	border-radius: 100px;
	font-size: 14px;
	color: #718096;
	transition: all 0.2s;
	border: 1px solid transparent;
}

.diff-chip.active {
	background: #ebf8ff;
	color: #3182ce;
	border-color: #bee3f8;
	font-weight: 600;
}

.form-footer {
	padding: 16px 24px;
	border-top: 1px solid #f0f0f0;
}

.submit-btn {
	width: 100%;
	height: 48px;
	background: #2c3e50;
	color: #fff;
	border-radius: 12px;
	font-size: 16px;
	font-weight: 600;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
}
.submit-btn:active { opacity: 0.9; }
</style>