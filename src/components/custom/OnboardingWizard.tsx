"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OnboardingStep1Household } from "./OnboardingStep1Household"
import { OnboardingStep2Children } from "./OnboardingStep2Children"
import { OnboardingStep3Invite } from "./OnboardingStep3Invite"
import { OnboardingStep4Preferences } from "./OnboardingStep4Preferences"
import { completeOnboarding } from "@/lib/actions/onboarding"
import { showToast } from "@/lib/toast-messages"
import type {
  OnboardingStep1Input,
  OnboardingStep2Input,
  OnboardingStep3Input,
  OnboardingStep4Input,
} from "@/lib/validations/onboarding"

type Step = 1 | 2 | 3 | 4

const stepTitles: Record<Step, { title: string; description: string }> = {
  1: {
    title: "Votre foyer",
    description: "Commencez par donner un nom à votre foyer",
  },
  2: {
    title: "Vos enfants",
    description: "Ajoutez les enfants de votre foyer",
  },
  3: {
    title: "Co-parent",
    description: "Invitez votre co-parent à rejoindre le foyer",
  },
  4: {
    title: "Préférences",
    description: "Configurez vos notifications et rappels",
  },
}

interface WizardData {
  step1: OnboardingStep1Input
  step2: OnboardingStep2Input
  step3: OnboardingStep3Input
  step4: OnboardingStep4Input
}

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Wizard state
  const [wizardData, setWizardData] = useState<WizardData>({
    step1: {
      name: "",
      country: "FR",
      timezone: "Europe/Paris",
    },
    step2: {
      children: [],
    },
    step3: {
      email: "",
      skip: false,
    },
    step4: {
      daily_reminder_time: "08:00",
      email_enabled: true,
      push_enabled: false,
      weekly_summary_enabled: true,
    },
  })

  const updateStep1 = (data: OnboardingStep1Input) => {
    setWizardData((prev) => ({ ...prev, step1: data }))
  }

  const updateStep2 = (data: OnboardingStep2Input) => {
    setWizardData((prev) => ({ ...prev, step2: data }))
  }

  const updateStep3 = (data: OnboardingStep3Input) => {
    setWizardData((prev) => ({ ...prev, step3: data }))
  }

  const updateStep4 = (data: OnboardingStep4Input) => {
    setWizardData((prev) => ({ ...prev, step4: data }))
  }

  const goToNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step)
    }
  }

  const goToPrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const result = await completeOnboarding(wizardData)
      if (!result.success && result.error) {
        setError(result.error)
        showToast.error("generic", result.error)
      } else if (result.success) {
        showToast.success("onboardingCompleted")
      }
    })
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <OnboardingStep1Household
            data={wizardData.step1}
            onUpdate={updateStep1}
            onNext={goToNext}
          />
        )
      case 2:
        return (
          <OnboardingStep2Children
            data={wizardData.step2}
            onUpdate={updateStep2}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        )
      case 3:
        return (
          <OnboardingStep3Invite
            data={wizardData.step3}
            onUpdate={updateStep3}
            onNext={goToNext}
            onPrevious={goToPrevious}
          />
        )
      case 4:
        return (
          <OnboardingStep4Preferences
            data={wizardData.step4}
            onUpdate={updateStep4}
            onSubmit={handleSubmit}
            onPrevious={goToPrevious}
            isPending={isPending}
          />
        )
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step < currentStep
                    ? "bg-primary text-primary-foreground"
                    : step === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step < currentStep ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step
                )}
              </div>
              {step < 4 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    step < currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <CardTitle className="text-2xl font-bold">
          {stepTitles[currentStep].title}
        </CardTitle>
        <CardDescription>{stepTitles[currentStep].description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        {renderStep()}
      </CardContent>
    </Card>
  )
}
