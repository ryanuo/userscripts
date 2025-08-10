export default {
  'name': '页面描述生成器',
  'namespace': 'page-description-generator',
  'version': '1.1.1',
  'description': '使用 AI 对当前页面内容进行描述分析，生成详细文字，支持快捷键和按钮触发，按钮带loading和折叠功能',
  'author': 'ryanuo',
  'match': '*://*/*',
  'grant': ['GM_xmlhttpRequest'],
  'connect': ['api.openai.com', 'api.kkyyxx.xyz'],
  'run-at': 'document-idle',
  'license': 'apache-2.0',
} as GM_Meta
