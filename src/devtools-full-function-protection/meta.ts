export default {
  name: 'DevTools 全功能防护',
  namespace: 'devtools-full-function-protection',
  version: '2.0',
  description: '一站式解除网页的防调试、重定向、右键屏蔽，同时屏蔽 disable-devtool / devtools-detector，让 DevTools 自由使用。',
  author: 'ryanuo',
  match: '*://*/*',
  grant: 'none',
  license: 'MIT',
  runAt: 'document-start',
} as GM_Meta
