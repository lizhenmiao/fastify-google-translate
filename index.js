import Fastify from 'fastify'
import {
  handleTranslateRequest,
  getApiDoc,
  getHealthCheck,
  logger
} from 'google-translate-universal'

const fastify = Fastify({ logger: true })
const ACCESS_TOKEN = process.env.ACCESS_TOKEN

console.log('ACCESS_TOKEN===', ACCESS_TOKEN)

// 设置日志监听（可选）
const logHandler = (level, ...args) => {
  // 使用 fastify 原生日志系统，性能更好且支持结构化日志
  if (fastify.log[level]) {
    fastify.log[level]('[翻译日志]', ...args)
  } else {
    // 如果日志级别不存在，回退到 info 级别
    fastify.log.info(`[翻译日志] [${level.toUpperCase()}]`, ...args)
  }
}

logger.on(logHandler)

// 程序退出时清理日志监听器
process.on('exit', () => {
  logger.off(logHandler)
})

// CORS 插件
await fastify.register(import('@fastify/cors'), {
  origin: true,
  methods: ['GET', 'POST']
})

// API 文档
fastify.get('/', async (request, reply) => {
  const apiDoc = getApiDoc('Google 翻译服务 - Fastify版本', '1.0.0')
  return apiDoc
})

// 健康检查
fastify.get('/health', async (request, reply) => {
  const health = getHealthCheck('Google Translate Service (Fastify)')
  return health
})

// 翻译接口
fastify.route({
  method: ['GET', 'POST'],
  url: '/translate',
  handler: async (request, reply) => {
    let params = {}

    if (request.method === 'GET') {
      // GET 请求：所有参数包括 token 都从 query 获取
      const { text, source_lang, target_lang, token } = request.query

      params = {
        text,
        source_lang,
        target_lang,
        token
      }
    } else if (request.method === 'POST') {
      // POST 请求：业务参数从 body 获取，token 从 query 获取
      const { text, source_lang, target_lang } = request.body

      params = {
        text,
        source_lang,
        target_lang,
        token: request.query.token  // POST 的 token 也从 query 获取
      }
    }

    const headers = request.method === 'POST' ? { authorization: request.headers.authorization } : {}
    const result = await handleTranslateRequest(params, headers, ACCESS_TOKEN, { verbose: true })

    reply.status(result.code === 200 ? 200 : 500)
    return result
  }
})

const start = async () => {
  try {
    const PORT = process.env.PORT || 3000
    await fastify.listen({ port: PORT })
    console.log(`Server running on port ${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
