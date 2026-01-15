import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  FormError,
  FieldError,
  ErrorAlert,
  NetworkError,
} from "@/components/custom/FormError"

describe("FormError Component", () => {
  describe("FormError", () => {
    it("should not render when error is null", () => {
      const { container } = render(<FormError error={null} />)
      expect(container.firstChild).toBeNull()
    })

    it("should render error message", () => {
      render(<FormError error="Something went wrong" />)
      expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    })

    it("should show icon by default", () => {
      render(<FormError error="Error message" />)
      // AlertCircle icon should be present
      const icon = document.querySelector("svg")
      expect(icon).toBeInTheDocument()
    })

    it("should hide icon when showIcon is false", () => {
      render(<FormError error="Error message" showIcon={false} />)
      // Should only have dismiss button icon, not error icon in main content
      const icons = document.querySelectorAll("svg")
      expect(icons.length).toBeLessThanOrEqual(1)
    })

    it("should call onDismiss when dismiss button is clicked", async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()

      render(<FormError error="Error message" onDismiss={onDismiss} />)

      const dismissButton = screen.getByRole("button", { name: /fermer/i })
      await user.click(dismissButton)

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it("should call onRetry when retry button is clicked", async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()

      render(<FormError error="Error message" onRetry={onRetry} />)

      const retryButton = screen.getByRole("button", { name: /reessayer/i })
      await user.click(retryButton)

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it("should apply banner variant styles", () => {
      render(<FormError error="Banner error" variant="banner" />)

      const errorContainer = screen.getByText("Banner error").closest("div")
      expect(errorContainer).toHaveClass("p-4")
    })

    it("should apply inline variant styles", () => {
      render(<FormError error="Inline error" variant="inline" />)

      const errorContainer = screen.getByText("Inline error").closest("div")
      expect(errorContainer).toHaveClass("p-2")
    })

    it("should apply toast variant styles", () => {
      render(<FormError error="Toast error" variant="toast" />)

      const errorContainer = screen.getByText("Toast error").closest("div")
      expect(errorContainer).toHaveClass("shadow-lg")
    })

    it("should apply custom className", () => {
      render(<FormError error="Error" className="custom-class" />)

      const wrapper = document.querySelector(".custom-class")
      expect(wrapper).toBeInTheDocument()
    })
  })

  describe("FieldError", () => {
    it("should not render when error is undefined", () => {
      const { container } = render(<FieldError />)
      expect(container.firstChild).toBeNull()
    })

    it("should render error message", () => {
      render(<FieldError error="Field is required" />)
      expect(screen.getByText("Field is required")).toBeInTheDocument()
    })

    it("should have destructive text color", () => {
      render(<FieldError error="Invalid input" />)
      const errorElement = screen.getByText("Invalid input")
      expect(errorElement).toHaveClass("text-destructive")
    })

    it("should apply custom className", () => {
      render(<FieldError error="Error" className="custom-field-error" />)
      const errorElement = screen.getByText("Error")
      expect(errorElement).toHaveClass("custom-field-error")
    })
  })

  describe("ErrorAlert", () => {
    it("should render title and message", () => {
      render(<ErrorAlert message="Detailed error message" />)

      expect(screen.getByText("Une erreur est survenue")).toBeInTheDocument()
      expect(screen.getByText("Detailed error message")).toBeInTheDocument()
    })

    it("should render custom title", () => {
      render(<ErrorAlert title="Custom Title" message="Error details" />)

      expect(screen.getByText("Custom Title")).toBeInTheDocument()
    })

    it("should show retry button when onRetry is provided", () => {
      const onRetry = vi.fn()
      render(<ErrorAlert message="Error" onRetry={onRetry} />)

      expect(screen.getByRole("button", { name: /reessayer/i })).toBeInTheDocument()
    })

    it("should show dismiss button when onDismiss is provided", () => {
      const onDismiss = vi.fn()
      render(<ErrorAlert message="Error" onDismiss={onDismiss} />)

      expect(screen.getByRole("button", { name: /fermer/i })).toBeInTheDocument()
    })

    it("should call onRetry when clicked", async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()

      render(<ErrorAlert message="Error" onRetry={onRetry} />)
      await user.click(screen.getByRole("button", { name: /reessayer/i }))

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it("should call onDismiss when clicked", async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()

      render(<ErrorAlert message="Error" onDismiss={onDismiss} />)
      await user.click(screen.getByRole("button", { name: /fermer/i }))

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it("should not show buttons when no handlers provided", () => {
      render(<ErrorAlert message="Error only" />)

      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
  })

  describe("NetworkError", () => {
    it("should render network error message", () => {
      render(<NetworkError />)

      expect(screen.getByText("Probleme de connexion")).toBeInTheDocument()
      expect(
        screen.getByText("Verifiez votre connexion internet et reessayez.")
      ).toBeInTheDocument()
    })

    it("should show retry button when onRetry is provided", () => {
      const onRetry = vi.fn()
      render(<NetworkError onRetry={onRetry} />)

      expect(screen.getByRole("button", { name: /reessayer/i })).toBeInTheDocument()
    })

    it("should not show retry button when onRetry is not provided", () => {
      render(<NetworkError />)

      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("should call onRetry when retry button is clicked", async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()

      render(<NetworkError onRetry={onRetry} />)
      await user.click(screen.getByRole("button", { name: /reessayer/i }))

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it("should apply custom className", () => {
      render(<NetworkError className="custom-network-error" />)

      const container = document.querySelector(".custom-network-error")
      expect(container).toBeInTheDocument()
    })
  })
})

describe("FormError Animations", () => {
  it("should have animation classes", () => {
    const { rerender } = render(<FormError error={null} />)

    // No error, should not render
    expect(document.querySelector("[class*='overflow-hidden']")).not.toBeInTheDocument()

    // Show error
    rerender(<FormError error="Animated error" />)

    // Should have the overflow-hidden wrapper for animation
    expect(document.querySelector("[class*='overflow-hidden']")).toBeInTheDocument()
  })
})
