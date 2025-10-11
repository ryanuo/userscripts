// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu({
  languageOptions: {
    globals: {
      GM_xmlhttpRequest: 'readonly',
    },
  },
  rules: {
    'no-extend-native': 'off',
    'no-console': 'off',
  },
})
