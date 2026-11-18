'use strict';
const { AppError } = require('../lib/errors');

// DeepSeek dung API tuong thich OpenAI: https://api-docs.deepseek.com
const BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const TIMEOUT_MS = 30000;

function isConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

async function chatCompletion({ messages, tools }) {
  if (!isConfigured()) throw new AppError('CHATBOT_NOT_CONFIGURED');

  let res;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools,
        tool_choice: tools?.length ? 'auto' : undefined,
        temperature: 0.3,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new AppError('CHATBOT_UNAVAILABLE', { cause: err });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // 401/402 la loi cau hinh phia server (sai key, het tien) -> khong lo chi tiet cho client
    throw new AppError('CHATBOT_UNAVAILABLE', {
      details: { upstreamStatus: res.status },
      cause: new Error(`DeepSeek ${res.status}: ${body.slice(0, 300)}`),
    });
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  if (!message) throw new AppError('CHATBOT_UNAVAILABLE', { cause: new Error('DeepSeek tra ve rong') });
  return message;
}

module.exports = { chatCompletion, isConfigured };
