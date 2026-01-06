// =====================================================
// NLearn Platform - Reminder Notification Sender
// =====================================================
// Scheduled function (Cron) to send learning reminders
// - Checks users who haven't studied recently
// - Sends notifications via LINE/Email based on preferences
// - Runs daily at configured reminder_time
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabaseAdmin, jsonResponse, errorResponse } from '../_shared/supabase.ts'

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

interface UserReminder {
  user_id: string
  email: string
  full_name: string
  line_user_id: string | null
  email_enabled: boolean
  line_enabled: boolean
  days_inactive: number
  next_chapter_title: string | null
}

serve(async (req) => {
  // Verify cron secret (prevent unauthorized calls)
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    return errorResponse('Unauthorized', 401)
  }

  try {
    // Get users needing reminders
    const { data: users, error } = await supabaseAdmin.rpc('nlearn_get_reminder_users')

    if (error) throw error

    console.log(`Found ${users?.length || 0} users needing reminders`)

    const results = {
      total: users?.length || 0,
      line_sent: 0,
      email_sent: 0,
      errors: 0
    }

    for (const user of users as UserReminder[]) {
      try {
        // Send LINE reminder
        if (user.line_enabled && user.line_user_id) {
          await sendLineReminder(user)
          results.line_sent++
        }

        // Send email reminder
        if (user.email_enabled && user.email) {
          await sendEmailReminder(user)
          results.email_sent++
        }

        // Log notification
        await logNotification(user)
      } catch (err) {
        console.error(`Error sending reminder to ${user.user_id}:`, err)
        results.errors++
      }
    }

    console.log('Reminder results:', results)
    return jsonResponse(results)

  } catch (err) {
    console.error('Reminder job failed:', err)
    return errorResponse('Internal error', 500)
  }
})

// Send LINE reminder
async function sendLineReminder(user: UserReminder) {
  const message = buildReminderMessage(user)

  const messages = [
    {
      type: 'flex',
      altText: '学習リマインド',
      contents: {
        type: 'bubble',
        hero: {
          type: 'image',
          url: `${Deno.env.get('APP_URL')}/images/reminder-hero.png`,
          size: 'full',
          aspectRatio: '20:13',
          aspectMode: 'cover'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📚 学習リマインド',
              weight: 'bold',
              size: 'xl'
            },
            {
              type: 'text',
              text: message,
              wrap: true,
              margin: 'md'
            },
            user.next_chapter_title ? {
              type: 'text',
              text: `次のチャプター: ${user.next_chapter_title}`,
              size: 'sm',
              color: '#666666',
              margin: 'md'
            } : null
          ].filter(Boolean)
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '学習を続ける',
                uri: `${Deno.env.get('APP_URL')}/dashboard`
              },
              style: 'primary',
              color: '#4F46E5'
            }
          ]
        }
      }
    }
  ]

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: user.line_user_id,
      messages
    })
  })
}

// Send email reminder
async function sendEmailReminder(user: UserReminder) {
  const message = buildReminderMessage(user)

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'NLearn <noreply@nlearn.app>',
      to: user.email,
      subject: `📚 ${user.full_name || 'こんにちは'}さん、学習を続けましょう！`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 NLearn</h1>
            </div>
            <div class="content">
              <p>${user.full_name || 'こんにちは'}さん</p>
              <p>${message}</p>
              ${user.next_chapter_title ? `<p><strong>次のチャプター:</strong> ${user.next_chapter_title}</p>` : ''}
              <a href="${Deno.env.get('APP_URL')}/dashboard" class="button">学習を続ける</a>
            </div>
            <div class="footer">
              <p>このメールは NLearn からの自動送信です。</p>
              <p><a href="${Deno.env.get('APP_URL')}/settings/notifications">通知設定を変更</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    })
  })
}

// Build reminder message based on inactivity
function buildReminderMessage(user: UserReminder): string {
  if (user.days_inactive >= 7) {
    return `${user.days_inactive}日間学習していません。少しずつでも続けることが大切です。今日から再開しませんか？`
  } else if (user.days_inactive >= 3) {
    return `前回の学習から${user.days_inactive}日経ちました。学習の習慣を維持しましょう！`
  } else {
    return `今日も一緒に学習しましょう！継続は力なりです。`
  }
}

// Log notification to database
async function logNotification(user: UserReminder) {
  await supabaseAdmin.from('notifications').insert([
    user.line_enabled && user.line_user_id ? {
      user_id: user.user_id,
      type: 'reminder',
      channel: 'line',
      title: '学習リマインド',
      body: buildReminderMessage(user),
      data: { days_inactive: user.days_inactive }
    } : null,
    user.email_enabled ? {
      user_id: user.user_id,
      type: 'reminder',
      channel: 'email',
      title: '学習リマインド',
      body: buildReminderMessage(user),
      data: { days_inactive: user.days_inactive }
    } : null
  ].filter(Boolean))
}
