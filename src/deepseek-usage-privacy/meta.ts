export default {
  'name': 'DeepSeek 用量页金额隐藏',
  'namespace': 'deepseek-usage-privacy',
  'version': '1.0.0',
  'description': '在 DeepSeek 开放平台用量页加一个「小眼睛」，一键遮挡所有金额（充值余额、消费金额、图表 tooltip），Alt+M 切换，状态本地记忆',
  'author': 'ryanuo',
  'match': ['https://platform.deepseek.com/*'],
  'grant': 'none',
  'run-at': 'document-idle',
  'license': 'apache-2.0',
  'updateURL': 'https://raw.githubusercontent.com/ryanuo/userscripts/main/scripts/deepseek-usage-privacy.user.js',
  'downloadURL': 'https://raw.githubusercontent.com/ryanuo/userscripts/main/scripts/deepseek-usage-privacy.user.js',
} as GM_Meta
