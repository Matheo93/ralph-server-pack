'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createChallenge,
  createChallengeFromTemplate,
  deleteChallenge,
  deactivateChallenge,
} from '@/lib/actions/challenges'
import type {
  ChallengeTemplate,
  ChallengeWithProgress,
  Child,
  ChallengeTriggerType,
} from '@/types/database'

interface ChallengesClientProps {
  challenges: ChallengeWithProgress[]
  templates: ChallengeTemplate[]
  householdChildren: Child[]
}

export function ChallengesClient({
  challenges,
  templates,
  householdChildren,
}: ChallengesClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'template' | 'custom'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedChildren, setSelectedChildren] = useState<string[]>([])

  // Custom challenge form
  const [customForm, setCustomForm] = useState({
    name: '',
    description: '',
    icon: '🎯',
    triggerType: 'task_any' as ChallengeTriggerType,
    triggerTaskKeyword: '',
    requiredCount: 5,
    timeframeDays: 7,
    rewardXp: 100,
    rewardCustom: '',
  })

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate || selectedChildren.length === 0) return

    startTransition(async () => {
      const result = await createChallengeFromTemplate(selectedTemplate, selectedChildren)
      if (result.success) {
        setIsDialogOpen(false)
        setSelectedTemplate('')
        setSelectedChildren([])
        router.refresh()
      }
    })
  }

  const handleCreateCustom = () => {
    if (!customForm.name || selectedChildren.length === 0) return

    startTransition(async () => {
      const result = await createChallenge({
        name: customForm.name,
        description: customForm.description || undefined,
        icon: customForm.icon,
        triggerType: customForm.triggerType,
        triggerTaskKeyword: customForm.triggerTaskKeyword || undefined,
        requiredCount: customForm.requiredCount,
        timeframeDays: customForm.timeframeDays || undefined,
        rewardXp: customForm.rewardXp,
        rewardCustom: customForm.rewardCustom || undefined,
        childIds: selectedChildren,
      })
      if (result.success) {
        setIsDialogOpen(false)
        setCustomForm({
          name: '',
          description: '',
          icon: '🎯',
          triggerType: 'task_any',
          triggerTaskKeyword: '',
          requiredCount: 5,
          timeframeDays: 7,
          rewardXp: 100,
          rewardCustom: '',
        })
        setSelectedChildren([])
        router.refresh()
      }
    })
  }

  const handleDelete = (challengeId: string) => {
    if (!confirm('Supprimer ce defi ?')) return

    startTransition(async () => {
      await deleteChallenge(challengeId)
      router.refresh()
    })
  }

  const handleDeactivate = (challengeId: string) => {
    startTransition(async () => {
      await deactivateChallenge(challengeId)
      router.refresh()
    })
  }

  const toggleChild = (childId: string) => {
    setSelectedChildren(prev =>
      prev.includes(childId)
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    )
  }

  const activeChallenges = challenges.filter(c => c.is_active)
  const completedChallenges = challenges.filter(c => !c.is_active || c.children.every(ch => ch.progress?.is_completed))

  return (
    <div className="space-y-8">
      {/* Actions */}
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={householdChildren.length === 0}>
              Creer un defi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau defi</DialogTitle>
              <DialogDescription>
                Creez un defi motivant pour vos enfants
              </DialogDescription>
            </DialogHeader>

            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'template' | 'custom')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="template">Depuis un modele</TabsTrigger>
                <TabsTrigger value="custom">Personnalise</TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Choisir un modele</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un modele" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.slug} value={t.slug}>
                          <span className="mr-2">{t.icon}</span>
                          {t.name_fr}
                          <span className="ml-2 text-muted-foreground text-xs">
                            ({t.required_count}x, {t.reward_xp} XP)
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-sm text-muted-foreground">
                      {templates.find(t => t.slug === selectedTemplate)?.description_fr}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Assigner a</Label>
                  <div className="flex flex-wrap gap-2">
                    {householdChildren.map(child => (
                      <label
                        key={child.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedChildren.includes(child.id)
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedChildren.includes(child.id)}
                          onCheckedChange={() => toggleChild(child.id)}
                        />
                        <span>{child.first_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateFromTemplate}
                  disabled={isPending || !selectedTemplate || selectedChildren.length === 0}
                >
                  {isPending ? 'Creation...' : 'Creer le defi'}
                </Button>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4 mt-4">
                <div className="grid grid-cols-[auto_1fr] gap-4">
                  <div className="space-y-2">
                    <Label>Icone</Label>
                    <Select value={customForm.icon} onValueChange={v => setCustomForm(f => ({ ...f, icon: v }))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['🎯', '🏆', '⭐', '🎖️', '🥇', '🎪', '🚀', '💪', '🌟', '🔥'].map(icon => (
                          <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nom du defi</Label>
                    <Input
                      value={customForm.name}
                      onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ex: Super rangeur"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (optionnel)</Label>
                  <Textarea
                    value={customForm.description}
                    onChange={e => setCustomForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Ex: Range ta chambre tous les jours pendant une semaine"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mots-cles (separes par virgules)</Label>
                    <Input
                      value={customForm.triggerTaskKeyword}
                      onChange={e => setCustomForm(f => ({ ...f, triggerTaskKeyword: e.target.value }))}
                      placeholder="ranger, chambre, clean"
                    />
                    <p className="text-xs text-muted-foreground">
                      Les taches contenant ces mots compteront pour le defi
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre de taches requises</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={customForm.requiredCount}
                      onChange={e => setCustomForm(f => ({ ...f, requiredCount: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delai (jours, 0 = illimite)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      value={customForm.timeframeDays}
                      onChange={e => setCustomForm(f => ({ ...f, timeframeDays: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Recompense XP</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={customForm.rewardXp}
                      onChange={e => setCustomForm(f => ({ ...f, rewardXp: parseInt(e.target.value) || 50 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Recompense personnalisee (optionnel)</Label>
                  <Input
                    value={customForm.rewardCustom}
                    onChange={e => setCustomForm(f => ({ ...f, rewardCustom: e.target.value }))}
                    placeholder="Ex: 1h de jeux video, sortie au cinema..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assigner a</Label>
                  <div className="flex flex-wrap gap-2">
                    {householdChildren.map(child => (
                      <label
                        key={child.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedChildren.includes(child.id)
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedChildren.includes(child.id)}
                          onCheckedChange={() => toggleChild(child.id)}
                        />
                        <span>{child.first_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateCustom}
                  disabled={isPending || !customForm.name || selectedChildren.length === 0}
                >
                  {isPending ? 'Creation...' : 'Creer le defi'}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {challenges.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Aucun defi</h3>
            <p className="text-muted-foreground mb-4">
              {householdChildren.length === 0
                ? 'Ajoutez d\'abord des enfants pour creer des defis'
                : 'Creez votre premier defi pour motiver vos enfants'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active challenges */}
      {activeChallenges.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Defis en cours</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onDelete={handleDelete}
                onDeactivate={handleDeactivate}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed/Inactive challenges */}
      {completedChallenges.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground">Defis termines</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-75">
            {completedChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onDelete={handleDelete}
                onDeactivate={handleDeactivate}
                isPending={isPending}
                isCompleted
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ChallengeCardProps {
  challenge: ChallengeWithProgress
  onDelete: (id: string) => void
  onDeactivate: (id: string) => void
  isPending: boolean
  isCompleted?: boolean
}

function ChallengeCard({
  challenge,
  onDelete,
  onDeactivate,
  isPending,
  isCompleted,
}: ChallengeCardProps) {
  // Days remaining
  let daysRemaining: number | null = null
  if (challenge.expires_at) {
    const now = new Date()
    const exp = new Date(challenge.expires_at)
    daysRemaining = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  return (
    <Card className={isCompleted ? 'opacity-75' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{challenge.icon}</span>
            <div>
              <CardTitle className="text-lg">{challenge.name}</CardTitle>
              {challenge.description && (
                <CardDescription className="line-clamp-2">
                  {challenge.description}
                </CardDescription>
              )}
            </div>
          </div>
          {!isCompleted && daysRemaining !== null && (
            <Badge variant={daysRemaining <= 2 ? 'destructive' : 'secondary'}>
              {daysRemaining}j restant{daysRemaining > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rewards */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-amber-500 font-medium">+{challenge.reward_xp} XP</span>
          {challenge.reward_custom && (
            <span className="text-muted-foreground">+ {challenge.reward_custom}</span>
          )}
        </div>

        {/* Progress by child */}
        <div className="space-y-2">
          {challenge.children.map(child => {
            const progress = child.progress
            const count = progress?.current_count ?? 0
            const percentage = Math.round((count / challenge.required_count) * 100)
            const completed = progress?.is_completed ?? false

            return (
              <div key={child.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{child.first_name}</span>
                  <span className={completed ? 'text-green-600' : 'text-muted-foreground'}>
                    {completed ? 'Termine!' : `${count}/${challenge.required_count}`}
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })}
        </div>

        {/* Actions */}
        {!isCompleted && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onDeactivate(challenge.id)}
              disabled={isPending}
            >
              Terminer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(challenge.id)}
              disabled={isPending}
            >
              Supprimer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
