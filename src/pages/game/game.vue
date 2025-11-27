<template>
	<div class="game-container" :class="{ 'dark': theme.state.isDark }">
		<!-- 顶部导航栏 -->
		<header class="header">
			<!-- 关闭按钮 -->
			<div class="close-btn" @click="goBack">
				<text class="material-icons">close</text>
			</div>

			<!-- 计时器 -->
			<div class="timer-container">
				<text class="material-icons timer-icon">timer</text>
				<div class="timer-bar-bg">
					<!-- 倒计时进度条 (假设60秒为满) -->
					<div class="timer-bar-fill" :style="{ width: Math.min((timer / 60) * 100, 100) + '%' }"></div>
				</div>
			</div>

			<!-- 计数器 -->
			<div class="counter">
				<text class="counter-text">{{ totalMatched }}/{{ totalWordCount }}</text>
			</div>
		</header>

		<!-- 总进度条 -->
		<div class="progress-section">
			<div class="progress-track">
				<div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
			</div>
		</div>

		<!-- 标题 -->
		<h1 class="game-title">Match the Words</h1>

		<!-- 游戏区域 -->
		<main class="game-board">
			<!-- 左侧：中文 -->
			<div class="grid-column">
				<div 
					v-for="(word, index) in shuffledChinese" 
					:key="'left-'+index"
					class="word-card"
					:class="{ 
						'selected': selectedChinese === word,
						'completed': completed.includes(word),
						'correct-match': animating.has(word),
						'mistake': misss.has(word)
					}"
					@click="selectWord(word, 'chinese')"
				>
					<text class="word-text">{{ word }}</text>
				</div>
			</div>
			
			<!-- 右侧：英文 -->
			<div class="grid-column">
				<div 
					v-for="(word, index) in shuffledEnglish" 
					:key="'right-'+index"
					class="word-card"
					:class="{ 
						'selected': selectedEnglish === word,
						'completed': isEnglishCompleted(word),
						'correct-match': animating.has(word),
						'mistake': misss.has(word)
					}"
					@click="selectWord(word, 'english')"
				>
					<text class="word-text">{{ word }}</text>
				</div>
			</div>
		</main>

		<!-- 结算弹窗 -->
		<div v-if="isGameCompleted" class="modal-overlay">
			<div class="modal-content">
				<text class="modal-title">恭喜完成！</text>
				<div class="modal-stats">
					<text>用时: {{ formatTime(timer) }}</text>
					<text>得分: {{ score }}</text>
				</div>
				<button class="modal-btn" @click="goBack">确定</button>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import theme from '@/utils/theme.js'

// --- 原始逻辑恢复 ---
const words = reactive({
	chinese: [],
	english: []
})
const animating = ref(new Set())
const misss = ref(new Set())

// 选中的词书数据
const selectedWordbook = ref(null)

// 模拟的单词数据库 (实际会从 storage 加载)
const wordDatabase = reactive([])

// 游戏状态
const selectedChinese = ref(null)
const selectedEnglish = ref(null)
// midChinese/midEnglish removed as per fix
const score = ref(0)
const completed = ref([]) // 存储当前屏幕上已完成的中文词 (用于样式)
const totalMatched = ref(0) // 总共完成的单词数
const totalWordCount = ref(0) // 词书总单词数
const mistakes = ref(0)
const timer = ref(0)
const isGameStarted = ref(false)
const timerInterval = ref(null)

// 随机打乱单词顺序
const shuffledChinese = ref([])
const shuffledEnglish = ref([])

// 批量替换逻辑
const pendingReplacement = ref([])
const REPLACE_THRESHOLD = 3 
const oldChineseWordsForCleanup = reactive(new Set())

// 计算属性
const isGameCompleted = computed(() => totalMatched.value === totalWordCount.value && totalWordCount.value > 0)

const progressPercentage = computed(() => {
	if (totalWordCount.value === 0) return 0
	return (totalMatched.value / totalWordCount.value) * 100
})

onMounted(() => {
	initGame()
})

onUnmounted(() => {
	if (timerInterval.value) {
		clearInterval(timerInterval.value)
	}
})

function initGame() {
	try {
		const storedWordbook = uni.getStorageSync('selectedWordbook')
		
		if (storedWordbook && storedWordbook.words && storedWordbook.words.length > 0) {
			selectedWordbook.value = storedWordbook
			totalWordCount.value = storedWordbook.words.length
			totalMatched.value = 0
			
			// 清空原有数据库，添加词书中的单词
			wordDatabase.splice(0, wordDatabase.length)
			storedWordbook.words.forEach(word => {
				wordDatabase.push(word)
			})
			
			// 初始化显示 5 个
			const initialBatch = wordDatabase.splice(0, 5)
			
			const chineseWords = initialBatch.map(w => w.chinese)
			const englishWords = initialBatch.map(w => w.english)
			
			words.chinese = chineseWords
			words.english = englishWords
			
			// 更新乱序单词列表
			shuffledChinese.value = shuffle([...words.chinese])
			shuffledEnglish.value = shuffle([...words.english])
			
			startGame()
		}
	} catch (error) {
		console.error('加载词书数据失败:', error)
	}
}

function startGame() {
	isGameStarted.value = true
	timer.value = 0
	score.value = 0
	mistakes.value = 0
	completed.value = []
	
	if (timerInterval.value) clearInterval(timerInterval.value)
	timerInterval.value = setInterval(() => {
		timer.value++
	}, 1000)
}

function finishGame() {
	isGameStarted.value = false
	clearInterval(timerInterval.value)
}

function selectWord(word, type) {
	if (!isGameStarted.value) return
	
	// 如果已经完成，或者是待清理的旧词，则不可点击
	if (type === 'chinese') {
		if (completed.value.includes(word) || oldChineseWordsForCleanup.has(word)) return
		if (selectedChinese.value === word) {
			selectedChinese.value = null // 取消选中
			return
		}
		selectedChinese.value = word
	} else {
		// 英文检查是否已完成 (通过查找对应的中文)
		if (isEnglishCompleted(word)) return
		if (selectedEnglish.value === word) {
			selectedEnglish.value = null
			return
		}
		selectedEnglish.value = word
	}

	if (selectedChinese.value && selectedEnglish.value) {
		checkMatch()
	}
}

function checkMatch() {
	const chineseIndex = words.chinese.indexOf(selectedChinese.value)
	const englishIndex = words.english.indexOf(selectedEnglish.value)
	
	// Capture current selection locally to avoid race conditions
	const currentChinese = selectedChinese.value
	const currentEnglish = selectedEnglish.value

	if (chineseIndex === englishIndex && chineseIndex !== -1) {
		// 匹配成功
		score.value += 10
		completed.value.push(currentChinese)
		totalMatched.value++ // 增加总进度计数
		
		// 加入待替换队列
		pendingReplacement.value.push({
			chinese: currentChinese,
			english: currentEnglish
		})

		// 动画
		const newSet = new Set(animating.value)
		newSet.add(currentChinese)
		newSet.add(currentEnglish)
		animating.value = newSet
		
		// Reset selection immediately
		selectedChinese.value = null
		selectedEnglish.value = null

		setTimeout(() => {
			const newSet = new Set(animating.value)
			newSet.delete(currentChinese)
			newSet.delete(currentEnglish)
			animating.value = newSet

			// 检查替换
			if (pendingReplacement.value.length >= REPLACE_THRESHOLD) {
				replaceBatchOfWords()
			}

			if (isGameCompleted.value) {
				finishGame()
			}
		}, 500)
	} else {
		// 匹配失败
		mistakes.value++
		const newSet = new Set(misss.value)
		newSet.add(currentChinese)
		newSet.add(currentEnglish)
		misss.value = newSet
		
		// Reset selection immediately
		selectedChinese.value = null
		selectedEnglish.value = null
		
		setTimeout(() => {
			const newSet = new Set(misss.value)
			newSet.delete(currentChinese)
			newSet.delete(currentEnglish)
			misss.value = newSet
		}, 300)
	}
}

function replaceBatchOfWords() {
	const wordsToReplace = [...pendingReplacement.value]
	pendingReplacement.value = [] // 清空队列
	
	// 从数据库取新词
	const newWords = wordDatabase.splice(0, wordsToReplace.length)
	
	// 记录需要更新的位置
	const chineseIndicesToReplace = []
	const englishIndicesToReplace = []

	for (let i = 0; i < wordsToReplace.length; i++) {
		const oldPair = wordsToReplace[i]
		
		// 记录在乱序列表中的位置
		const cnIdx = shuffledChinese.value.indexOf(oldPair.chinese)
		if (cnIdx > -1) chineseIndicesToReplace.push(cnIdx)
		
		const enIdx = shuffledEnglish.value.indexOf(oldPair.english)
		if (enIdx > -1) englishIndicesToReplace.push(enIdx)

		// 更新主数据源 (保持对应关系)
		if (i < newWords.length) {
			oldChineseWordsForCleanup.add(oldPair.chinese) // 只有真正被替换的词才从 completed 中移除

			const masterIndex = words.chinese.indexOf(oldPair.chinese)
			if (masterIndex > -1) {
				words.chinese[masterIndex] = newWords[i].chinese
				words.english[masterIndex] = newWords[i].english
			}
		}
	}

	// 延迟一点更新视图，让消失动画播完
	setTimeout(() => {
		// 替换乱序列表中的词
		for (let i = 0; i < wordsToReplace.length; i++) {
			if (i < newWords.length) {
				// 有新词，替换
				if (chineseIndicesToReplace[i] !== undefined) {
					shuffledChinese.value[chineseIndicesToReplace[i]] = newWords[i].chinese
				}
				if (englishIndicesToReplace[i] !== undefined) {
					shuffledEnglish.value[englishIndicesToReplace[i]] = newWords[i].english
				}
				
				// 从 completed 中移除旧词 (因为位置已经被新词占据)
				const oldCn = wordsToReplace[i].chinese
				const idx = completed.value.indexOf(oldCn)
				if (idx > -1) completed.value.splice(idx, 1)
				
				// 从 cleanup 集合中移除
				oldChineseWordsForCleanup.delete(oldCn)
			} else {
				// 没有新词了 (数据库空了)，保持原样 (灰色显示)
				// 不做任何操作，它们已经在 completed 列表中了
			}
		}
		
		// 随机交换新加入的位置，防止位置固定
		// 仅交换 chineseIndicesToReplace 中的位置
		if (newWords.length > 1) {
			shuffleSubset(shuffledChinese.value, chineseIndicesToReplace.slice(0, newWords.length))
			shuffleSubset(shuffledEnglish.value, englishIndicesToReplace.slice(0, newWords.length))
		}

	}, 200)
}

// 辅助：仅打乱数组中指定索引的元素
function shuffleSubset(array, indices) {
	// 提取值
	const values = indices.map(i => array[i])
	// 打乱值
	for (let i = values.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[values[i], values[j]] = [values[j], values[i]];
	}
	// 放回
	indices.forEach((index, i) => {
		array[index] = values[i]
	})
}

function isEnglishCompleted(englishWord) {
	// 找到对应的中文
	const index = words.english.indexOf(englishWord)
	if (index === -1) return false // 可能是旧词或错误
	const chineseWord = words.chinese[index]
	return completed.value.includes(chineseWord) || oldChineseWordsForCleanup.has(chineseWord)
}

function formatTime(seconds) {
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	return `${m}:${s.toString().padStart(2, '0')}`
}

function goBack() {
	const pages = getCurrentPages()
	if (pages.length > 1) {
		uni.navigateBack()
	} else {
		uni.reLaunch({
			url: '/pages/game/wordsIndex'
		})
	}
}

// Fisher-Yates Shuffle
function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}
</script>

<style scoped>
/* 
  Theme Variables 
  Primary: #3d5a80 (Deep Blue)
  Background Light: #f7f7f7
  Background Dark: #18181a
  Card Light: #ffffff
  Card Dark: #2c313a
  Text Light: #1f2937
  Text Dark: #e5e7eb
*/

.game-container {
	min-height: 100vh;
	background-color: #f7f7f7;
	display: flex;
	flex-direction: column;
	padding-bottom: 40px;
	transition: background-color 0.3s;
}

.game-container.dark {
	background-color: #18181a;
}

/* Header */
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	padding-top: calc(env(safe-area-inset-top) + 16px);
}

.close-btn {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background-color: #e5e7eb;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: transform 0.1s;
}
.dark .close-btn { background-color: #374151; }
.close-btn:active { transform: scale(0.95); }

.material-icons {
	font-family: 'Material Icons'; /* Ensure font is loaded or use unicode */
	font-size: 24px;
	color: #1f2937;
}
.dark .material-icons { color: #e5e7eb; }

.timer-container {
	display: flex;
	align-items: center;
	gap: 8px;
}

.timer-icon {
	color: #1f2937;
	opacity: 0.8;
}
.dark .timer-icon { color: #e5e7eb; }

.timer-bar-bg {
	width: 100px;
	height: 16px;
	background-color: #e5e7eb;
	border-radius: 999px;
	overflow: hidden;
}
.dark .timer-bar-bg { background-color: #374151; }

.timer-bar-fill {
	height: 100%;
	background-color: #3d5a80; /* Primary */
	border-radius: 999px;
	transition: width 1s linear;
}

.counter {
	font-size: 14px;
	font-weight: 700;
	color: #1f2937;
}
.dark .counter { color: #e5e7eb; }

/* Progress Bar */
.progress-section {
	padding: 8px 16px;
}

.progress-track {
	width: 100%;
	height: 16px;
	background-color: #e5e7eb;
	border-radius: 999px;
	overflow: hidden;
}
.dark .progress-track { background-color: #374151; }

.progress-fill {
	height: 100%;
	background-color: #10b981; /* Green-500 */
	border-radius: 999px;
	transition: width 0.3s ease;
}

/* Title */
.game-title {
	font-size: 32px;
	font-weight: 700;
	text-align: center;
	color: #1f2937;
	margin: 16px 0;
	letter-spacing: -0.02em;
}
.dark .game-title { color: #e5e7eb; }

/* Game Board */
.game-board {
	flex: 1;
	display: flex;
	padding: 16px;
	gap: 16px;
}

.grid-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

/* Word Card */
.word-card {
	background-color: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 12px; /* rounded-lg */
	padding: 16px;
	min-height: 72px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
	transition: all 0.2s;
	cursor: pointer;
}

.dark .word-card {
	background-color: #2c313a;
	border-color: #4a515e;
	box-shadow: none;
}

.word-text {
	font-size: 20px; /* text-xl */
	font-weight: 700;
	color: #1f2937;
	text-align: center;
	line-height: 1.25;
}
.dark .word-text { color: #e5e7eb; }

/* Selected State */
.word-card.selected {
	background-color: #3d5a80; /* Primary */
	border-color: transparent;
	box-shadow: 0 10px 15px -3px rgba(61, 90, 128, 0.3); /* shadow-lg */
	/* Ring effect simulated with box-shadow or border */
	outline: 4px solid rgba(61, 90, 128, 0.5);
}

.word-card.selected .word-text {
	color: #ffffff;
}

/* Completed State */
.word-card.completed {
	background-color: #f3f4f6;
	border-color: transparent;
	opacity: 0.6;
	pointer-events: none;
}
.dark .word-card.completed {
	background-color: #1f2937;
}

.word-card.completed .word-text {
	color: #9ca3af;
}

/* Correct Match Animation */
.word-card.correct-match {
	background-color: #10b981 !important; /* Green */
	border-color: transparent !important;
	transform: scale(1.05);
}
.word-card.correct-match .word-text {
	color: #ffffff !important;
}

/* Mistake Animation */
.word-card.mistake {
	background-color: #ef4444 !important; /* Red */
	border-color: transparent !important;
	animation: pulse 0.3s ease-in-out;
}
.word-card.mistake .word-text {
	color: #ffffff !important;
}

@keyframes pulse {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(0.95); }
}

/* Modal */
.modal-overlay {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 100;
}

.modal-content {
	background-color: #ffffff;
	padding: 32px;
	border-radius: 24px;
	align-items: center;
	display: flex;
	flex-direction: column;
	gap: 16px;
	width: 80%;
	max-width: 320px;
}
.dark .modal-content { background-color: #2c313a; }

.modal-title {
	font-size: 24px;
	font-weight: 700;
	color: #1f2937;
}
.dark .modal-title { color: #e5e7eb; }

.modal-stats {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	color: #4b5563;
}
.dark .modal-stats { color: #9ca3af; }

.modal-btn {
	background-color: #3d5a80;
	color: #ffffff;
	padding: 12px 32px;
	border-radius: 999px;
	font-weight: 600;
	border: none;
	margin-top: 16px;
}
</style>
