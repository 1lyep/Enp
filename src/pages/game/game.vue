<template>
  <view class="container">
    <text class="title">加油！</text>
    
    <template v-if="!isGameStarted">
      <view class="start-screen">
        <text class="subtitle">英语试炼</text>
        <button class="start-btn" @click="startGame">准备开始</button>
      </view>
    </template>
    
    <template v-else>
      <view class="game-info">
        <view class="info-item">
          <text>得分: {{ score }}</text>
        </view>
        <view class="info-item">
          <text>用时: {{ formatTime(timer) }}</text>
        </view>
        <view class="info-item">
          <text>失误: {{ mistakes }}</text>
        </view>
      </view>
      
      <view class="game-container">
        <view class="word-column">
          <view
            v-for="word in words.chinese"
            :key="word"
            :data-word="word"
            :class="[
              'word-btn',
                { 
                  'selected': selectedChinese === word,
                  'completed': completed.includes(word),
                  'disabled': completed.includes(word),
                  'correct-match': animating.has(word),
                  'mistake': misss.has(word),
                }
            ]"
            :disabled="completed.includes(word)"
            @click="selectWord(word, 'chinese')"
            :hover-class="none"
            >
              {{ word }}
          </view> 
        </view>     
        <view class="word-column"> 
          <view
            v-for="word in shuffledEnglish"
            :key="word"
            :data-word="word"
            :class="[
            'word-btn',
            { 
              'selected': selectedEnglish === word,
              'completed': completed.includes(words.chinese[words.english.indexOf(word)]),
              'disabled': completed.includes(words.chinese[words.english.indexOf(word)]),
              'correct-match': animating.has(word),
              'mistake': misss.has(word),
            }
            ]"
            @click="selectWord(word, 'english')"
            :disabled="completed.includes(words.chinese[words.english.indexOf(word)])"
            :hover-class="none"
            >
           {{ word }}
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import { ref, reactive, computed, onUnmounted } from 'vue'

export default {
  setup() {
    const words = reactive({
      chinese: ['旅行者', '柔软', '五', '运动鞋', '牛奶'],
      english: ['traveler', 'soft', 'five', 'sneaker', 'milk']
    })
    const animating = ref(new Set())
    const misss = ref(new Set())


    // 游戏状态
    const selectedChinese = ref(null)
    const selectedEnglish = ref(null)
    const midChinese = ref(null)
    const midEnglish = ref(null)
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
        // 如果点的是已经选中的，再点一次就取消
        selectedChinese.value = selectedChinese.value === word ? null : word
      } else if (type === 'english') {
        selectedEnglish.value = selectedEnglish.value === word ? null : word
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
        // 先更新状态，确保两个按钮同时开始动画
        score.value += 10
        completed.value.push(selectedChinese.value)
        
        // ✅ 把两个词加入 animating 集合
        const newSet = new Set(animating.value)
        newSet.add(selectedChinese.value)
        newSet.add(selectedEnglish.value)
        animating.value = newSet
        midChinese.value = selectedChinese.value
        midEnglish.value = selectedEnglish.value
        selectedChinese.value = null
        selectedEnglish.value = null

        setTimeout(() => {
          // 500ms 后移除
          const newSet = new Set(animating.value)
          newSet.delete(midChinese.value)
          newSet.delete(midEnglish.value)
          animating.value = newSet

          if (isGameCompleted.value) {
            clearInterval(timerInterval.value)
            uni.showModal({
              title: '恭喜完成！',
              content: `用时：${formatTime(timer.value)}\n得分：${score.value}\n失误：${mistakes.value}次`,
              showCancel: false
            })
          }

          midChinese.value = null
          midEnglish.value = null
        }, 500)
    } else {
        // 匹配失败
        mistakes.value++
        const newSet = new Set(misss.value)
        newSet.add(selectedChinese.value)
        newSet.add(selectedEnglish.value)
        misss.value = newSet
        midChinese.value = selectedChinese.value
        midEnglish.value = selectedEnglish.value
        selectedChinese.value = null
        selectedEnglish.value = null
        setTimeout(() => {
          const newSet = new Set(misss.value)
          newSet.delete(midChinese.value)
          newSet.delete(midEnglish.value)
          misss.value = newSet
          midChinese.value = null
          midEnglish.value = null
        }, 300)
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
      selectWord,
      shuffledEnglish,
      animating,
      checkMatch,
      misss 
    }
  }
}
</script>

<style>
.container {
  padding: 20px;
}

.title {
  font-size: 24px;
  text-align: center;
  margin-bottom: 20px;
}

.subtitle {
  font-size: 20px;
  text-align: center;
  margin-bottom: 20px;
}

.start-screen {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.start-btn {
  padding: 15px 30px;
  font-size: 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
}

.game-info {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0;
}

.info-item {
  padding: 10px 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  text-align: center;
}

.game-container {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  width: 100%;
  gap: 20px;
}

.word-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  width: 100%;
  max-width: 300px;
}

.word-btn {
  width: 100%;
  min-height: 44px;
  padding: 12px;
  font-size: 16px;
  border: 2px solid #ccc;
  border-radius: 8px;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;

}


.word-btn.selected {
  background-color: #c3e3c4 !important;
  border-color: #708d72;
  transform: scale(1.05) !important;
}

.word-btn.completed {
  background-color: #ddd;
  color: #666;
}

.word-btn.disabled {
  background-color: #ddd;
  color: #666;
  pointer-events: none; /* 不能点 */
}

.word-btn.mistake {
  background-color: #f44336;
  color: white;
}

@keyframes correctMatch {
  0% {
    background-color: #4CAF50;
    transform: scale(1);
    box-shadow: 0 0 0 rgba(76, 175, 80, 0);
  }
  70% {
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
  }
  100% {
    background-color: #45a049;
    transform: scale(1);
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.6);
  }
}


.correct-match {
  animation: correctMatch 0.3s forwards;
  pointer-events: none;
}
</style>

