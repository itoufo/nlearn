// =====================================================
// NLearn Platform - LINE Webhook Handler
// =====================================================
// Handles LINE Messaging API events:
// - follow → User added the bot
// - unfollow → User blocked the bot
// - message → User sent a message
// - accountLink → User linked account
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createHmac } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { supabaseAdmin, jsonResponse, errorResponse } from '../_shared/supabase.ts'

const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET')!
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!

interface LineEvent {
  type: string
  source: {
    type: string
    userId: string
  }
  replyToken?: string
  message?: {
    type: string
    text?: string
  }
  link?: {
    result: string
    nonce: string
  }
}

serve(async (req) => {
  // Verify LINE signature
  const signature = req.headers.get('x-line-signature')
  if (!signature) {
    return errorResponse('Missing signature', 401)
  }

  const body = await req.text()
  const hash = createHmac('sha256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64')

  if (hash !== signature) {
    return errorResponse('Invalid signature', 401)
  }

  const { events } = JSON.parse(body)

  for (const event of events as LineEvent[]) {
    try {
      await handleEvent(event)
    } catch (err) {
      console.error('Event handling error:', err)
    }
  }

  return jsonResponse({ status: 'ok' })
})

async function handleEvent(event: LineEvent) {
  console.log(`Processing LINE event: ${event.type}`)

  switch (event.type) {
    case 'follow':
      await handleFollow(event)
      break

    case 'unfollow':
      await handleUnfollow(event)
      break

    case 'message':
      await handleMessage(event)
      break

    case 'accountLink':
      await handleAccountLink(event)
      break
  }
}

// User followed the bot
async function handleFollow(event: LineEvent) {
  const lineUserId = event.source.userId

  // Get user profile from LINE
  const profile = await getLineProfile(lineUserId)

  // Check if already connected
  const { data: existing } = await supabaseAdmin
    .from('line_connections')
    .select('user_id')
    .eq('line_user_id', lineUserId)
    .single()

  if (existing) {
    // Already connected, send welcome back
    await replyMessage(event.replyToken!, [
      { type: 'text', text: 'おかえりなさい！学習を続けましょう。' }
    ])
  } else {
    // Send account link prompt
    const linkToken = await createLinkToken(lineUserId)
    await replyMessage(event.replyToken!, [
      { type: 'text', text: 'NLearnへようこそ！' },
      {
        type: 'template',
        altText: 'アカウント連携',
        template: {
          type: 'buttons',
          text: 'NLearnアカウントと連携して、学習リマインドを受け取りましょう。',
          actions: [
            {
              type: 'uri',
              label: 'アカウント連携',
              uri: `${Deno.env.get('APP_URL')}/auth/line-link?linkToken=${linkToken}`
            }
          ]
        }
      }
    ])
  }
}

// User unfollowed/blocked
async function handleUnfollow(event: LineEvent) {
  await supabaseAdmin
    .from('line_connections')
    .delete()
    .eq('line_user_id', event.source.userId)

  // Update profile
  await supabaseAdmin
    .from('profiles')
    .update({ line_user_id: null })
    .eq('line_user_id', event.source.userId)
}

// User sent a message
async function handleMessage(event: LineEvent) {
  if (event.message?.type !== 'text') return

  const text = event.message.text?.toLowerCase()

  if (text?.includes('進捗') || text?.includes('progress')) {
    await sendProgressUpdate(event)
  } else if (text?.includes('次') || text?.includes('next')) {
    await sendNextChapter(event)
  } else {
    await replyMessage(event.replyToken!, [
      {
        type: 'text',
        text: '以下のコマンドが使えます:\n・「進捗」- 学習進捗を確認\n・「次」- 次のチャプターを表示'
      }
    ])
  }
}

// Account link completed
async function handleAccountLink(event: LineEvent) {
  if (event.link?.result !== 'ok') return

  const lineUserId = event.source.userId
  const nonce = event.link.nonce

  // Find pending link by nonce (stored temporarily)
  const { data: linkData } = await supabaseAdmin
    .from('line_connections')
    .select('user_id')
    .eq('line_user_id', `pending_${nonce}`)
    .single()

  if (!linkData) return

  // Get LINE profile
  const profile = await getLineProfile(lineUserId)

  // Update connection
  await supabaseAdmin
    .from('line_connections')
    .update({
      line_user_id: lineUserId,
      display_name: profile.displayName,
      picture_url: profile.pictureUrl
    })
    .eq('user_id', linkData.user_id)

  // Update profile
  await supabaseAdmin
    .from('profiles')
    .update({ line_user_id: lineUserId })
    .eq('id', linkData.user_id)

  await replyMessage(event.replyToken!, [
    { type: 'text', text: '連携が完了しました！学習リマインドをお届けします。' }
  ])
}

// Send progress update
async function sendProgressUpdate(event: LineEvent) {
  const { data: connection } = await supabaseAdmin
    .from('line_connections')
    .select('user_id')
    .eq('line_user_id', event.source.userId)
    .single()

  if (!connection) {
    await replyMessage(event.replyToken!, [
      { type: 'text', text: 'アカウント連携が必要です。' }
    ])
    return
  }

  const { data: stats } = await supabaseAdmin
    .from('learning_stats')
    .select('*')
    .eq('user_id', connection.user_id)
    .single()

  if (!stats) return

  const hours = Math.floor(stats.total_time_spent_seconds / 3600)
  const minutes = Math.floor((stats.total_time_spent_seconds % 3600) / 60)

  await replyMessage(event.replyToken!, [
    {
      type: 'text',
      text: `📊 学習進捗\n\n✅ 完了チャプター: ${stats.total_chapters_completed}章\n⏱️ 学習時間: ${hours}時間${minutes}分\n🔥 連続学習: ${stats.current_streak_days}日`
    }
  ])
}

// Send next chapter info
async function sendNextChapter(event: LineEvent) {
  const { data: connection } = await supabaseAdmin
    .from('line_connections')
    .select('user_id')
    .eq('line_user_id', event.source.userId)
    .single()

  if (!connection) return

  // Find next incomplete chapter
  const { data: nextChapter } = await supabaseAdmin
    .rpc('nlearn_get_next_chapter', { p_user_id: connection.user_id })

  if (!nextChapter) {
    await replyMessage(event.replyToken!, [
      { type: 'text', text: '🎉 すべてのチャプターを完了しています！' }
    ])
    return
  }

  await replyMessage(event.replyToken!, [
    {
      type: 'template',
      altText: '次のチャプター',
      template: {
        type: 'buttons',
        text: `📖 次のチャプター\n\n${nextChapter.title}`,
        actions: [
          {
            type: 'uri',
            label: '学習を開始',
            uri: `${Deno.env.get('APP_URL')}/doc/${nextChapter.slug}`
          }
        ]
      }
    }
  ])
}

// Helper: Get LINE profile
async function getLineProfile(userId: string) {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
  })
  return res.json()
}

// Helper: Create link token
async function createLinkToken(userId: string) {
  const res = await fetch(`https://api.line.me/v2/bot/user/${userId}/linkToken`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
  })
  const { linkToken } = await res.json()
  return linkToken
}

// Helper: Reply message
async function replyMessage(replyToken: string, messages: unknown[]) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ replyToken, messages })
  })
}
