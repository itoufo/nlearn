// =====================================================
// NLearn Platform - Stripe Webhook Handler
// =====================================================
// Handles Stripe payment events:
// - checkout.session.completed → Create enrollment
// - invoice.payment_succeeded → Renew subscription
// - customer.subscription.deleted → Cancel enrollment
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'
import { supabaseAdmin, jsonResponse, errorResponse } from '../_shared/supabase.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  // Verify webhook signature
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return errorResponse('Missing signature', 401)
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return errorResponse('Invalid signature', 401)
  }

  console.log(`Processing event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return jsonResponse({ received: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return errorResponse('Webhook processing failed', 500)
  }
})

// Handle checkout.session.completed
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const courseId = session.metadata?.course_id

  if (!userId || !courseId) {
    throw new Error('Missing user_id or course_id in metadata')
  }

  // Record payment
  await supabaseAdmin.from('payments').insert({
    user_id: userId,
    course_id: courseId,
    amount: session.amount_total || 0,
    currency: session.currency || 'jpy',
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent as string,
    status: 'succeeded',
    metadata: {
      customer_email: session.customer_email,
      payment_status: session.payment_status
    }
  })

  // Create enrollment
  await supabaseAdmin.from('enrollments').upsert({
    user_id: userId,
    course_id: courseId,
    status: 'active',
    enrolled_at: new Date().toISOString(),
    stripe_subscription_id: session.subscription as string | null
  }, {
    onConflict: 'user_id,course_id'
  })

  // Update user's Stripe customer ID if not set
  await supabaseAdmin
    .from('profiles')
    .update({ stripe_customer_id: session.customer as string })
    .eq('id', userId)
    .is('stripe_customer_id', null)

  // Send notification
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type: 'completion',
    channel: 'email',
    title: '購入完了',
    body: 'コースへのアクセスが可能になりました。',
    data: { course_id: courseId }
  })

  console.log(`Enrollment created: user=${userId}, course=${courseId}`)
}

// Handle invoice.payment_succeeded (subscription renewal)
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.user_id
  const courseId = subscription.metadata?.course_id

  if (!userId || !courseId) return

  // Extend enrollment
  await supabaseAdmin
    .from('enrollments')
    .update({
      status: 'active',
      expires_at: new Date(subscription.current_period_end * 1000).toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  // Record payment
  await supabaseAdmin.from('payments').insert({
    user_id: userId,
    course_id: courseId,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    stripe_payment_intent_id: invoice.payment_intent as string,
    status: 'succeeded',
    metadata: { type: 'subscription_renewal' }
  })

  console.log(`Subscription renewed: ${subscription.id}`)
}

// Handle subscription cancellation
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabaseAdmin
    .from('enrollments')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id)

  console.log(`Subscription cancelled: ${subscription.id}`)
}
