// HsnYojz - Telegram Bot API Helpers

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID!

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${BOT_TOKEN}/${method}`
}

export async function sendMessage(chatId: string | number, text: string): Promise<number | null> {
  const res = await fetch(apiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })
  const data = await res.json()
  return data?.result?.message_id ?? null
}

type InlineButton = { text: string; callback_data: string }

export async function sendMessageWithButtons(
  chatId: string | number,
  text: string,
  buttons: InlineButton[][],
): Promise<number | null> {
  const res = await fetch(apiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    }),
  })
  const data = await res.json()
  return data?.result?.message_id ?? null
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await fetch(apiUrl('answerCallbackQuery'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  })
}

export async function editMessageReplyMarkup(
  chatId: string | number,
  messageId: number,
): Promise<void> {
  await fetch(apiUrl('editMessageReplyMarkup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    }),
  })
}

export async function sendPhoto(chatId: string | number, photoBuffer: Buffer, caption?: string): Promise<void> {
  const formData = new FormData()
  formData.append('chat_id', String(chatId))
  formData.append('photo', new Blob([new Uint8Array(photoBuffer)], { type: 'image/png' }), 'story.png')
  if (caption) {
    formData.append('caption', caption)
    formData.append('parse_mode', 'HTML')
  }

  await fetch(apiUrl('sendPhoto'), {
    method: 'POST',
    body: formData,
  })
}

export async function sendDocument(chatId: string | number, docBuffer: Buffer, filename: string, caption?: string): Promise<void> {
  const formData = new FormData()
  formData.append('chat_id', String(chatId))
  formData.append('document', new Blob([new Uint8Array(docBuffer)], { type: 'image/png' }), filename)
  if (caption) {
    formData.append('caption', caption)
    formData.append('parse_mode', 'HTML')
  }

  await fetch(apiUrl('sendDocument'), {
    method: 'POST',
    body: formData,
  })
}

export function isAdminChat(chatId: number | string): boolean {
  return String(chatId) === ADMIN_CHAT_ID
}

export interface TelegramMessage {
  message_id: number
  chat: { id: number; type: string }
  text?: string
  photo?: { file_id: string; file_unique_id: string; width: number; height: number }[]
  caption?: string
}

export interface TelegramCallbackQuery {
  id: string
  from: { id: number }
  message?: TelegramMessage
  data?: string
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

// Extract URL from message text
export function extractUrl(text: string): string | null {
  const urlRegex = /https?:\/\/[^\s]+/i
  const match = text.match(urlRegex)
  return match ? match[0] : null
}

// Download a file from Telegram by file_id
export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  // Get file path
  const fileRes = await fetch(apiUrl('getFile'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  })
  const fileData = await fileRes.json()
  const filePath = fileData.result?.file_path

  if (!filePath) throw new Error('Could not get file path from Telegram')

  // Download file
  const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`
  const res = await fetch(downloadUrl)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
