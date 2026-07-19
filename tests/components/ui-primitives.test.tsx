// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ActionButton } from "@/components/ui/action-button";
import { ElapsedTimer } from "@/components/ui/elapsed-timer";
import { MoneyText } from "@/components/ui/money-text";
import { StatusBadge } from "@/components/ui/status-badge";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const queryClient = new QueryClient();

describe("UI Primitives", () => {
  afterEach(() => {
    cleanup();
  });

  it("ActionButton renders loading state", () => {
    render(<ActionButton isLoading>Submit</ActionButton>);
    expect(screen.getByRole("button")).toBeDisabled();
    // Loader icon should be present, but since it's an SVG we check by disabled state and lack of exact text 'Submit' or text being there.
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });

  it("ActionButton renders success state", () => {
    render(<ActionButton isSuccess>Submit</ActionButton>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("StatusBadge renders correctly mapped colors", () => {
    render(<StatusBadge status="PAID" />);
    // success badge class
    expect(screen.getByText("PAID")).toHaveClass("bg-success");
  });

  it("MoneyText formats according to default settings without provider", () => {
    render(<MoneyText amountMinor={1500} />);
    expect(screen.getByText("$15.00")).toBeInTheDocument();
  });

  it("MoneyText formats according to SettingsProvider", () => {
    // We would need to mock fetch for useQuery inside SettingsProvider, but we can also just rely on defaults.
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <MoneyText amountMinor={2000} />
        </SettingsProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText("$20.00")).toBeInTheDocument();
  });

  it("ElapsedTimer renders initial time", () => {
    const firedAt = new Date().toISOString();
    render(<ElapsedTimer firedAt={firedAt} />);
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });
});
