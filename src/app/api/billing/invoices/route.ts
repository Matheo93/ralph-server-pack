/**
 * Billing Invoices API
 *
 * Get invoice history for a household.
 */

import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { stripe } from "@/lib/stripe/client"

interface InvoiceResponse {
  id: string
  number: string | null
  status: string
  amountDue: number
  amountPaid: number
  currency: string
  invoicePdf: string | null
  hostedInvoiceUrl: string | null
  periodStart: string | null
  periodEnd: string | null
  createdAt: string
}

/**
 * GET /api/billing/invoices
 * Get invoice history for the user's household
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json(
      { error: "Foyer non trouvé" },
      { status: 404 }
    )
  }

  // Get household with Stripe customer ID
  const household = await queryOne<{ stripe_customer_id: string | null }>(`
    SELECT stripe_customer_id
    FROM households
    WHERE id = $1
  `, [membership.household_id])

  if (!household?.stripe_customer_id) {
    // No Stripe customer - return empty list
    return NextResponse.json({
      invoices: [],
      hasMore: false,
    })
  }

  try {
    // First try to get invoices from our database
    const dbInvoices = await query<{
      id: string
      number: string | null
      status: string
      amount_due: number
      amount_paid: number
      currency: string
      invoice_pdf: string | null
      hosted_invoice_url: string | null
      period_start: string | null
      period_end: string | null
      created_at: string
    }>(`
      SELECT
        id,
        number,
        status,
        amount_due,
        amount_paid,
        currency,
        invoice_pdf,
        hosted_invoice_url,
        period_start::text,
        period_end::text,
        created_at::text
      FROM invoices
      WHERE household_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [membership.household_id])

    if (dbInvoices.length > 0) {
      // Return from database
      const invoices: InvoiceResponse[] = dbInvoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amountDue: inv.amount_due,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        invoicePdf: inv.invoice_pdf,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        periodStart: inv.period_start,
        periodEnd: inv.period_end,
        createdAt: inv.created_at,
      }))

      return NextResponse.json({
        invoices,
        hasMore: dbInvoices.length >= 20,
      })
    }

    // Fallback: fetch from Stripe directly
    const stripeInvoices = await stripe.invoices.list({
      customer: household.stripe_customer_id,
      limit: 20,
    })

    const invoices: InvoiceResponse[] = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status ?? "unknown",
      amountDue: inv.amount_due ?? 0,
      amountPaid: inv.amount_paid ?? 0,
      currency: inv.currency ?? "eur",
      invoicePdf: inv.invoice_pdf ?? null,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      periodStart: inv.period_start
        ? new Date(inv.period_start * 1000).toISOString()
        : null,
      periodEnd: inv.period_end
        ? new Date(inv.period_end * 1000).toISOString()
        : null,
      createdAt: inv.created
        ? new Date(inv.created * 1000).toISOString()
        : new Date().toISOString(),
    }))

    return NextResponse.json({
      invoices,
      hasMore: stripeInvoices.has_more,
    })
  } catch (error) {
    console.error("Invoices error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des factures" },
      { status: 500 }
    )
  }
}
