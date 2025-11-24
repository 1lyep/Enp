import { reactive, watch } from 'vue'

const state = reactive({
    isDark: false
})

const THEME_KEY = 'app_theme_dark'

function init() {
    try {
        const stored = uni.getStorageSync(THEME_KEY)
        if (stored !== '') {
            state.isDark = stored
        }
    } catch (e) {
        console.error('Failed to load theme', e)
    }
}

function toggle() {
    state.isDark = !state.isDark
    try {
        uni.setStorageSync(THEME_KEY, state.isDark)
    } catch (e) {
        console.error('Failed to save theme', e)
    }
}

// Initialize on load
init()

export default {
    state,
    toggle,
    init
}
