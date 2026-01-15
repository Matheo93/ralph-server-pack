import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  ToastProvider,
  useToast,
  toast,
  ToastHandlerSync,
} from "@/components/custom/toast-notifications"
import { ReactNode } from "react"

// Test component that uses the toast hook
function TestComponent() {
  const {
    success,
    error,
    warning,
    info,
    loading,
    removeToast,
    clearToasts,
    toasts,
  } = useToast()

  return (
    <div>
      <button data-testid="success-btn" onClick={() => success("Success!", "Operation completed")}>
        Show Success
      </button>
      <button data-testid="error-btn" onClick={() => error("Error!", "Something went wrong")}>
        Show Error
      </button>
      <button data-testid="warning-btn" onClick={() => warning("Warning!", "Be careful")}>
        Show Warning
      </button>
      <button data-testid="info-btn" onClick={() => info("Info", "Just so you know")}>
        Show Info
      </button>
      <button data-testid="loading-btn" onClick={() => loading("Loading...", "Please wait")}>
        Show Loading
      </button>
      <button data-testid="clear-btn" onClick={clearToasts}>
        Clear All
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  )
}

// Wrapper component
function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider position="bottom-right" maxToasts={5}>
      <ToastHandlerSync />
      {children}
    </ToastProvider>
  )
}

describe("Toast Notifications", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("ToastProvider", () => {
    it("should render children", () => {
      render(
        <ToastProvider>
          <div data-testid="child">Content</div>
        </ToastProvider>
      )

      expect(screen.getByTestId("child")).toBeInTheDocument()
    })

    it("should throw error when useToast is used outside provider", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      function ComponentWithoutProvider() {
        useToast()
        return null
      }

      expect(() => render(<ComponentWithoutProvider />)).toThrow(
        "useToast must be used within a ToastProvider"
      )

      consoleError.mockRestore()
    })
  })

  describe("useToast hook", () => {
    it("should show success toast", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("success-btn"))

      await waitFor(() => {
        expect(screen.getByText("Success!")).toBeInTheDocument()
        expect(screen.getByText("Operation completed")).toBeInTheDocument()
      })
    })

    it("should show error toast", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("error-btn"))

      await waitFor(() => {
        expect(screen.getByText("Error!")).toBeInTheDocument()
        expect(screen.getByText("Something went wrong")).toBeInTheDocument()
      })
    })

    it("should show warning toast", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("warning-btn"))

      await waitFor(() => {
        expect(screen.getByText("Warning!")).toBeInTheDocument()
        expect(screen.getByText("Be careful")).toBeInTheDocument()
      })
    })

    it("should show info toast", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("info-btn"))

      await waitFor(() => {
        expect(screen.getByText("Info")).toBeInTheDocument()
        expect(screen.getByText("Just so you know")).toBeInTheDocument()
      })
    })

    it("should show loading toast", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("loading-btn"))

      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument()
        expect(screen.getByText("Please wait")).toBeInTheDocument()
      })
    })

    it("should clear all toasts", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Add multiple toasts
      await user.click(screen.getByTestId("success-btn"))
      await user.click(screen.getByTestId("error-btn"))
      await user.click(screen.getByTestId("warning-btn"))

      await waitFor(() => {
        expect(screen.getByTestId("toast-count")).toHaveTextContent("3")
      })

      // Clear all
      await user.click(screen.getByTestId("clear-btn"))

      await waitFor(() => {
        expect(screen.getByTestId("toast-count")).toHaveTextContent("0")
      })
    })

    it("should respect maxToasts limit", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Try to add 7 toasts (max is 5)
      for (let i = 0; i < 7; i++) {
        await user.click(screen.getByTestId("info-btn"))
      }

      await waitFor(() => {
        expect(Number(screen.getByTestId("toast-count").textContent)).toBeLessThanOrEqual(5)
      })
    })
  })

  describe("Toast auto-dismiss", () => {
    it("should auto-dismiss after duration", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("success-btn"))

      await waitFor(() => {
        expect(screen.getByText("Success!")).toBeInTheDocument()
      })

      // Fast-forward past the default success duration (4000ms)
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      await waitFor(() => {
        expect(screen.queryByText("Success!")).not.toBeInTheDocument()
      })
    })

    it("should not auto-dismiss loading toast", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("loading-btn"))

      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument()
      })

      // Fast-forward a long time
      act(() => {
        vi.advanceTimersByTime(60000)
      })

      // Should still be visible
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  describe("Toast dismissible", () => {
    it("should show dismiss button for dismissible toasts", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("success-btn"))

      await waitFor(() => {
        expect(screen.getByLabelText("Fermer la notification")).toBeInTheDocument()
      })
    })

    it("should not show dismiss button for non-dismissible toasts", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("loading-btn"))

      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument()
      })

      expect(screen.queryByLabelText("Fermer la notification")).not.toBeInTheDocument()
    })

    it("should dismiss toast when clicking dismiss button", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("success-btn"))

      await waitFor(() => {
        expect(screen.getByText("Success!")).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText("Fermer la notification"))

      await waitFor(() => {
        expect(screen.queryByText("Success!")).not.toBeInTheDocument()
      })
    })
  })

  describe("Toast positions", () => {
    it("should render toasts at specified position", () => {
      render(
        <ToastProvider position="top-right">
          <TestComponent />
        </ToastProvider>
      )

      const container = document.querySelector("[aria-label='Notifications']")
      expect(container).toHaveClass("top-4", "right-4")
    })

    it("should render toasts at top-center position", () => {
      render(
        <ToastProvider position="top-center">
          <TestComponent />
        </ToastProvider>
      )

      const container = document.querySelector("[aria-label='Notifications']")
      expect(container).toHaveClass("top-4")
    })
  })

  describe("Toast accessibility", () => {
    it("should have aria-live region", () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      const container = document.querySelector("[aria-live='polite']")
      expect(container).toBeInTheDocument()
    })

    it("should have role=alert on toast items", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      await user.click(screen.getByTestId("error-btn"))

      await waitFor(() => {
        const alert = screen.getByRole("alert")
        expect(alert).toBeInTheDocument()
      })
    })
  })
})

describe("Standalone toast function", () => {
  it("should work when ToastHandlerSync is mounted", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    function StandaloneTest() {
      return (
        <button
          data-testid="standalone-btn"
          onClick={() => toast.success("Standalone success")}
        >
          Standalone Toast
        </button>
      )
    }

    render(
      <TestWrapper>
        <StandaloneTest />
      </TestWrapper>
    )

    await user.click(screen.getByTestId("standalone-btn"))

    await waitFor(() => {
      expect(screen.getByText("Standalone success")).toBeInTheDocument()
    })
  })
})
