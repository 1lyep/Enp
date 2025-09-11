<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

export default {
  setup() {
    const words = reactive({
      chinese: ['旅行者', '柔软', '五', '运动鞋', '牛奶'],
      english: ['traveler', 'soft', 'five', 'sneaker', 'milk']
    })

    // 游戏状态
    const selectedChinese = ref(null)
    const selectedEnglish = ref(null)
    const score = ref(0)
    const completed = ref([])
    const mistakes = ref(0)
    const timer = ref(0)
    const isGameStarted = ref(false)
    const timerInterval = ref(null)

    // 计算属性
    const isGameCompleted = computed(() => completed.value.length === words.chinese.length)
    
    // 随机打乱单词顺序
    const shuffledEnglish = ref([...words.english])
    
    const startGame = () => {
      score.value = 0
      completed.value = []
      mistakes.value = 0
      timer.value = 0
      isGameStarted.value = true
      shuffledEnglish.value = [...words.english].sort(() => Math.random() - 0.5)
      
      // 启动计时器
      timerInterval.value = setInterval(() => {
        timer.value++
      }, 1000)
    }
    
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const selectWord = (word, type) => {
      if (type === 'chinese') {
        selectedChinese.value = word
      } else {
        selectedEnglish.value = word
      }

      // 检查匹配
      if (selectedChinese.value && selectedEnglish.value) {
        checkMatch()
      }
    }

    const checkMatch = () => {
      const chineseIndex = words.chinese.indexOf(selectedChinese.value)
      const englishIndex = words.english.indexOf(selectedEnglish.value)

      if (chineseIndex === englishIndex) {
        // 匹配成功
        score.value += 10
        completed.value.push(selectedChinese.value)
        
        // 检查游戏是否完成
        if (isGameCompleted.value) {
          clearInterval(timerInterval.value)
          setTimeout(() => {
            alert(`恭喜完成！\n用时：${formatTime(timer.value)}\n得分：${score.value}\n失误：${mistakes.value}次`)
          }, 300)
        }
        
        // 重置选择
        selectedChinese.value = null
        selectedEnglish.value = null
      } else {
        // 匹配失败
        mistakes.value++
        setTimeout(() => {
          selectedChinese.value = null
          selectedEnglish.value = null
        }, 1000)
      }
    }
    
    // 组件卸载时清理计时器
    onUnmounted(() => {
      if (timerInterval.value) {
        clearInterval(timerInterval.value)
      }
    })

    return {
      words,
      selectedChinese,
      selectedEnglish,
      score,
      completed,
      mistakes,
      timer,
      isGameStarted,
      isGameCompleted,
      formatTime,
      startGame,
      selectWord
    }
  }
}
</script>

<template>
  <div class="container">
    <h1>单词匹配游戏</h1>
    
    <template v-if="!isGameStarted">
      <div class="start-screen">
        <h2>准备开始游戏</h2>
        <button class="start-btn" @click="startGame">开始游戏</button>
      </div>
    </template>
    
    <template v-else>
      <div class="game-info">
        <div class="info-item">得分: {{ score }}</div>
        <div class="info-item">用时: {{ formatTime(timer) }}</div>
        <div class="info-item">失误: {{ mistakes }}</div>
      </div>
      
      <div class="game-container">
        <div class="word-column">
          <button
            v-for="word in words.chinese"
            :key="word"
            :class="{ 
              'word-btn': true,
              'selected': selectedChinese === word,
              'completed': completed.includes(word)
            }"
            @click="selectWord(word, 'chinese')"
            :disabled="completed.includes(word)"
          >
            {{ word }}
          </button>
        </div>

        <div class="word-column">
          <button
            v-for="word in shuffledEnglish"
            :key="word"
            :class="{
              'word-btn': true,
              'selected': selectedEnglish === word,
              'completed': completed.includes(words.chinese[words.english.indexOf(word)])
            }"
            @click="selectWord(word, 'english')"
            :disabled="completed.includes(words.chinese[words.english.indexOf(word)])"
          >
            {{ word }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.start-screen {
  margin-top: 40px;
}

.start-btn {
  padding: 15px 30px;
  font-size: 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.start-btn:hover {
  background: #45a049;
  transform: scale(1.05);
}

.game-info {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin: 20px 0;
  font-size: 18px;
}

.info-item {
  padding: 10px 20px;
  background: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.game-container {
  display: flex;
  justify-content: space-around;
  margin-top: 40px;
}

.word-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.word-btn {
  padding: 10px 20px;
  font-size: 18px;
  border: 2px solid #ccc;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.word-btn:hover:not(:disabled) {
  background: #f0f0f0;
  transform: scale(1.02);
}

.word-btn.selected {
  background: #4CAF50;
  color: white;
  border-color: #45a049;
  transform: scale(1.05);
}

.word-btn.completed {
  background: #ddd;
  color: #666;
  cursor: not-allowed;
}

.word-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
