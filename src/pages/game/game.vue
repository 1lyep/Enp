<template>
	<div class="game-page" :class="{ 'dark': theme.state.isDark }">
		<!-- 顶部导航 -->
		<header class="header">
			<div class="header-btn close-btn" @click="goBack">
				<text class="icon">✕</text>
			</div>
			
			<div class="timer-pill">
				<text class="timer-icon">⏱️</text>
				<text class="timer-text">{{ formatTime(timer) }}</text>
			</div>
			
	<div class="counter">
				<text class="current">{{ totalMatched }}</text>
				<text class="total">/{{ totalWordCount }}</text>
			</div>
		</header>

		<!-- 进度条 -->
		<div class="progress-container">
			<div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
		</div>

		<!-- 标题 -->
		<div class="game-title">Match the Words</div>

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
const midChinese = ref(null)
const midEnglish = ref(null)
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

// 计算属性
const isGameCompleted = computed(() => totalMatched.value === totalWordCount.value)

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

// Fisher-Yates 洗牌算法
function shuffle(arr) {
	let i = arr.length
	while (i) {
		let j = Math.floor(Math.random() * i--)
		;[arr[j], arr[i]] = [arr[i], arr[j]]
	}
	return arr
}

function startGame() {
	score.value = 0
	completed.value = []
	mistakes.value = 0
	timer.value = 0
	isGameStarted.value = true
	
	// 启动计时器
	timerInterval.value = setInterval(() => {
		timer.value++
	}, 1000)
}

function selectWord(word, type) {
	// 如果已完成，不可点击
	if (type === 'chinese' && completed.value.includes(word)) return
	if (type === 'english' && isEnglishCompleted(word)) return

	if (type === 'chinese') {
		selectedChinese.value = selectedChinese.value === word ? null : word
	} else if (type === 'english') {
		selectedEnglish.value = selectedEnglish.value === word ? null : word
	}

	// 检查匹配
	if (selectedChinese.value && selectedEnglish.value) {
		checkMatch()
	}
}

function isEnglishCompleted(engWord) {
	// 找到对应的中文
	const idx = words.english.indexOf(engWord)
	if (idx === -1) return false
	const cnWord = words.chinese[idx]
	return completed.value.includes(cnWord)
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
	pendingReplacement.value = []

	const newWords = []
	// 从数据库取新词
	for (let i = 0; i < wordsToReplace.length; i++) {
		if (wordDatabase.length > 0) {
			newWords.push(wordDatabase.shift()) // 取出并移除
		}
	}

	if (newWords.length === 0) return

	const oldChineseWordsForCleanup = new Set()
	
	// 准备新词的中文和英文列表
	const newChineseList = newWords.map(w => w.chinese)
	const newEnglishList = newWords.map(w => w.english)
	
	// 打乱新词列表，以便随机填入空位
	const shuffledNewChinese = shuffle([...newChineseList])
	const shuffledNewEnglish = shuffle([...newEnglishList])

	// 找到需要替换的位置索引
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
		// 注意：主数据源的顺序其实不影响显示，只影响逻辑匹配
		// 但为了保持一致性，我们还是更新它
		// 这里稍微复杂一点，因为 newWords 数量可能少于 wordsToReplace (如果数据库空了)
		if (i < newWords.length) {
			oldChineseWordsForCleanup.add(oldPair.chinese) // 只有真正被替换的词才从 completed 中移除

			const masterIndex = words.chinese.indexOf(oldPair.chinese)
			if (masterIndex > -1) {
				words.chinese[masterIndex] = newWords[i].chinese
				words.english[masterIndex] = newWords[i].english
			}
		}
	}

	// 填入新词到原来的位置 (仅在有新词的情况下)
	// 如果 newWords 少于 slots (最后几轮)，则剩下的 slot 会保留旧词(但已在completed中)或者变成空?
	// 现在的逻辑是 completed 包含旧词，所以它们显示为灰色/透明。
	// 如果没有新词填补，它们应该保持 completed 状态。
	// 但我们的逻辑是复用 slot。
	
	for (let i = 0; i < shuffledNewChinese.length; i++) {
		if (i < chineseIndicesToReplace.length) {
			shuffledChinese.value[chineseIndicesToReplace[i]] = shuffledNewChinese[i]
		}
	}
	
	for (let i = 0; i < shuffledNewEnglish.length; i++) {
		if (i < englishIndicesToReplace.length) {
			shuffledEnglish.value[englishIndicesToReplace[i]] = shuffledNewEnglish[i]
		}
	}

	// 从 completed 中移除旧词，这样新词就是"未完成"状态
	completed.value = completed.value.filter(word => !oldChineseWordsForCleanup.has(word))
}

function finishGame() {
	clearInterval(timerInterval.value)
	uni.showModal({
		title: '恭喜完成！',
		content: `用时：${formatTime(timer.value)}\n得分：${score.value}`,
		showCancel: false,
		success: () => goBack()
	})
}

function formatTime(s) {
	const m = Math.floor(s / 60)
	const sc = s % 60
	return `${m}:${sc.toString().padStart(2, '0')}`
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
</script>

<style scoped>
.game-page {
	min-height: 100vh;
	background: #f8f9fa;
	display: flex;
	flex-direction: column;
	padding: 0 20px;
	padding-top: env(safe-area-inset-top);
	transition: background 0.3s;
}

.game-page.dark {
	background: #121212;
}

/* Header */
.header {
	height: 60px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.header-btn {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: #e9ecef;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #495057;
}

.dark .header-btn {
	background: #2d2d2d;
	color: #fff;
}

.timer-pill {
	background: #e9ecef;
	padding: 6px 16px;
	border-radius: 100px;
	display: flex;
	align-items: center;
	gap: 6px;
	color: #495057;
	font-weight: 600;
	font-size: 14px;
}

.dark .timer-pill {
	background: #2d2d2d;
	color: #fff;
}

.counter {
	font-size: 16px;
	font-weight: 700;
	color: #212529;
}

.dark .counter { color: #fff; }

/* Progress */
.progress-container {
	height: 8px;
	background: #e9ecef;
	border-radius: 4px;
	overflow: hidden;
	margin-bottom: 30px;
}

.dark .progress-container { background: #2d2d2d; }

.progress-bar {
	height: 100%;
	background: #2ecc71;
	border-radius: 4px;
	transition: width 0.3s ease;
}

/* Title */
.game-title {
	font-size: 28px;
	font-weight: 800;
	text-align: center;
	color: #212529;
	margin-bottom: 30px;
}

.dark .game-title { color: #fff; }

/* Game Board */
.game-board {
	display: flex;
	gap: 20px;
	flex: 1;
}

.grid-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.word-card {
	height: 60px;
	background: #fff;
	border-radius: 100px; /* Pill shape */
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4px 12px rgba(0,0,0,0.05);
	transition: all 0.2s;
	border: 2px solid transparent;
}

.dark .word-card {
	background: #2d2d2d;
	box-shadow: none;
}

.word-card:active { transform: scale(0.96); }

.word-card.selected {
	background: #4361ee !important;
	border-color: #4361ee;
	box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
	transform: scale(1.05);
}

.word-card.selected .word-text { color: #fff; }

/* 
  Fix for Dark Mode Green Feedback:
  Use :not(.correct-match) to ensure completed style doesn't override animation 
*/
.word-card.completed:not(.correct-match) {
	background-color: #e9ecef !important;
	box-shadow: none;
	opacity: 0.6;
}

.dark .word-card.completed:not(.correct-match) {
	background-color: #333 !important;
}

.word-card.completed .word-text {
	color: #adb5bd;
}

.word-card.correct-match {
	animation: correctMatch 0.3s forwards;
	pointer-events: none;
}

.word-card.mistake {
	animation: mistakeMatch 0.3s forwards;
}

.word-text {
	font-size: 16px;
	font-weight: 600;
	color: #212529;
}

.dark .word-text { color: #fff; }

@keyframes correctMatch {
  0% {
    background-color: #4CAF50;
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    background-color: #45a049;
    transform: scale(1);
  }
}

@keyframes mistakeMatch {
  0% {
    background-color: #f44336;
  }
  50% {
    background-color: #d32f2f;
  }
  100% {
    background-color: #f44336;
  }
}
</style>
