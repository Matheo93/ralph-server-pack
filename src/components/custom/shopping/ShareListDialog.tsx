"use client"

import { useState, useEffect, useCallback } from "react"
import { Share2, Copy, Check, Link2, Trash2, Eye, Loader2, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createShoppingListShare,
  getActiveShareForList,
  revokeShoppingListShare,
  type ShoppingListShare,
} from "@/lib/actions/shopping-share"
import { showToast } from "@/lib/toast-messages"
import { cn } from "@/lib/utils"

interface ShareListDialogProps {
  listId: string
  listName: string
}

export function ShareListDialog({ listId, listName }: ShareListDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [activeShare, setActiveShare] = useState<ShoppingListShare | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const loadActiveShare = useCallback(async () => {
    setIsLoading(true)
    try {
      const share = await getActiveShareForList(listId)
      setActiveShare(share)
      if (share) {
        const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] || window.location.origin
        setShareUrl(`${baseUrl}/shared/shopping/${share.share_token}`)
      } else {
        setShareUrl(null)
      }
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false)
    }
  }, [listId])

  useEffect(() => {
    if (isOpen) {
      loadActiveShare()
    }
  }, [isOpen, loadActiveShare])

  const handleCreateShare = async () => {
    setIsLoading(true)
    try {
      const result = await createShoppingListShare({ list_id: listId })
      if (result.success && result.data) {
        setShareUrl(result.data.shareUrl)
        await loadActiveShare()
        showToast.success("shareCreated")
      } else {
        showToast.error("shareCreateFailed", result.error || undefined)
      }
    } catch {
      showToast.error("shareCreateFailed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeShare = async () => {
    if (!activeShare) return
    if (!confirm("Desactiver ce lien de partage ? Les personnes ayant le lien ne pourront plus voir la liste.")) {
      return
    }

    setIsLoading(true)
    try {
      const result = await revokeShoppingListShare({ share_id: activeShare.id })
      if (result.success) {
        setActiveShare(null)
        setShareUrl(null)
        showToast.success("shareRevoked")
      } else {
        showToast.error("shareRevokeFailed", result.error || undefined)
      }
    } catch {
      showToast.error("shareRevokeFailed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
      showToast.success("shareCopied")
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input")
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setIsCopied(true)
      showToast.success("shareCopied")
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const handleNativeShare = async () => {
    if (!shareUrl) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listName} - Liste de courses`,
          text: `Voici ma liste de courses: ${listName}`,
          url: shareUrl,
        })
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== "AbortError") {
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Partager</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Partager la liste
          </DialogTitle>
          <DialogDescription>
            Partagez cette liste en lecture seule avec n'importe qui via un lien.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading && !shareUrl ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : shareUrl ? (
            <>
              {/* Share URL */}
              <div className="space-y-2">
                <Label htmlFor="share-url">Lien de partage</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="flex-shrink-0"
                    aria-label="Copier le lien"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Share info */}
              {activeShare && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>Lecture seule</span>
                  </div>
                  {activeShare.access_count > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Link2 className="h-4 w-4" />
                      <span>
                        Consulte {activeShare.access_count} fois
                        {activeShare.last_accessed_at && (
                          <> (derniere visite: {new Date(activeShare.last_accessed_at).toLocaleDateString("fr-CA")})</>
                        )}
                      </span>
                    </div>
                  )}
                  {activeShare.expires_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>Expire le {new Date(activeShare.expires_at).toLocaleDateString("fr-CA")}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleNativeShare} className="flex-1 gap-2">
                  <Share2 className="h-4 w-4" />
                  Partager
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(shareUrl, "_blank")}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Apercu
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRevokeShare}
                  className="gap-2 text-destructive hover:text-destructive"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                  Desactiver
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* No active share - create one */}
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Link2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Creer un lien de partage</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Toute personne avec le lien pourra voir la liste (sans pouvoir la modifier).
                  </p>
                </div>
                <Button onClick={handleCreateShare} disabled={isLoading} className="gap-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Generer le lien
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
