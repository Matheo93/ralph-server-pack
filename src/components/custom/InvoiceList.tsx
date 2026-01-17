"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils/index"
import {
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"

export interface Invoice {
  id: string
  number: string | null
  status: "paid" | "failed" | "open" | "void" | "draft" | "uncollectible"
  amountDue: number
  amountPaid: number
  currency: string
  invoicePdf: string | null
  hostedInvoiceUrl: string | null
  periodStart: string | null
  periodEnd: string | null
  createdAt: string
}

interface InvoiceListProps {
  className?: string
}

const STATUS_CONFIG: Record<Invoice["status"], {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
  icon: React.ElementType
}> = {
  paid: {
    label: "Payée",
    variant: "default",
    icon: CheckCircle2,
  },
  failed: {
    label: "Échec",
    variant: "destructive",
    icon: XCircle,
  },
  open: {
    label: "En attente",
    variant: "secondary",
    icon: Clock,
  },
  void: {
    label: "Annulée",
    variant: "outline",
    icon: XCircle,
  },
  draft: {
    label: "Brouillon",
    variant: "outline",
    icon: FileText,
  },
  uncollectible: {
    label: "Irrécupérable",
    variant: "destructive",
    icon: AlertTriangle,
  },
}

export function InvoiceList({ className }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/billing/invoices")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur lors de la récupération des factures")
      }

      setInvoices(data.invoices ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatPeriod = (start: string | null, end: string | null) => {
    if (!start || !end) return null

    const startDate = new Date(start).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })
    const endDate = new Date(end).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

    return `${startDate} - ${endDate}`
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Factures</CardTitle>
          <CardDescription>Historique de vos factures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Factures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={fetchInvoices}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (invoices.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Factures</CardTitle>
          <CardDescription>Historique de vos factures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucune facture pour le moment</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Factures</CardTitle>
            <CardDescription>Historique de vos factures</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchInvoices}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <InvoiceItem
              key={invoice.id}
              invoice={invoice}
              formatAmount={formatAmount}
              formatDate={formatDate}
              formatPeriod={formatPeriod}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface InvoiceItemProps {
  invoice: Invoice
  formatAmount: (amount: number, currency: string) => string
  formatDate: (dateString: string) => string
  formatPeriod: (start: string | null, end: string | null) => string | null
}

function InvoiceItem({ invoice, formatAmount, formatDate, formatPeriod }: InvoiceItemProps) {
  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.open
  const Icon = status.icon
  const period = formatPeriod(invoice.periodStart, invoice.periodEnd)

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-muted rounded-lg">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {invoice.number ?? `Facture #${invoice.id.slice(-8)}`}
            </span>
            <Badge variant={status.variant} className="gap-1">
              <Icon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {formatDate(invoice.createdAt)}
            {period && ` • ${period}`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-medium">
            {formatAmount(invoice.amountPaid || invoice.amountDue, invoice.currency)}
          </div>
        </div>

        <div className="flex gap-2">
          {invoice.invoicePdf && (
            <Button variant="ghost" size="icon" asChild>
              <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer" title="Télécharger PDF">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
          {invoice.hostedInvoiceUrl && (
            <Button variant="ghost" size="icon" asChild>
              <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" title="Voir en ligne">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Simple invoice summary component
interface InvoiceSummaryProps {
  totalPaid: number
  currency: string
  invoiceCount: number
  className?: string
}

export function InvoiceSummary({
  totalPaid,
  currency,
  invoiceCount,
  className,
}: InvoiceSummaryProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount / 100)
  }

  return (
    <div className={cn("flex items-center justify-between p-4 bg-muted rounded-lg", className)}>
      <div>
        <p className="text-sm text-muted-foreground">Total payé</p>
        <p className="text-2xl font-bold">{formatAmount(totalPaid)}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-muted-foreground">Factures</p>
        <p className="text-2xl font-bold">{invoiceCount}</p>
      </div>
    </div>
  )
}
