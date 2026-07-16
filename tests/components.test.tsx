"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "@/components/audio/audio-player";
import { CloneVoicePanel } from "@/components/dashboard/clone-voice-panel";
import { GenerateVoicePanel } from "@/components/dashboard/generate-voice-panel";
import { BillingOverview } from "@/components/billing/billing-overview";
import { UserMenu } from "@/components/app-shell/user-menu";
import { SettingsClient } from "@/components/settings/settings-client";
import { VoicesClient } from "@/components/voices/voices-client";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { HistoryClient } from "@/components/generations/history-client";
import { ToastProvider } from "@/components/ui/toast";
import type { ProviderInfoDto, UsageDto, VoiceDto } from "@/lib/types/dto";

const usage: UsageDto = {
  plan: "FREE",
  activeProvider: "mock",
  periodKey: "2026-07",
  charactersUsed: 0,
  demoCharactersUsed: 0,
  characterLimit: 10_000,
  voicesUsed: 0,
  voiceLimit: 2,
};

const mockProviderInfo: ProviderInfoDto = {
  name: "mock",
  label: "Demo Provider",
  isDemo: true,
  showBranding: true,
  operationsEnabled: true,
  capabilities: { instantClone: true, multilingual: true },
};

const cartesiaProviderInfo: ProviderInfoDto = {
  name: "cartesia",
  label: "Cartesia",
  isDemo: false,
  showBranding: true,
  operationsEnabled: true,
  capabilities: { instantClone: true, multilingual: true },
};

function voice(id: string, provider: string, name: string): VoiceDto {
  return {
    id,
    provider,
    name,
    description: null,
    primaryLanguage: "en",
    status: "READY",
    createdAt: "2026-07-16T00:00:00.000Z",
    lastUsedAt: null,
    sourceDurationMs: 4_000,
    generationCount: 0,
  };
}

beforeEach(() => sessionStorage.clear());

describe("clone panel", () => {
  it("opens the file picker from the keyboard and keeps consent mandatory", async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => undefined);
    render(<ToastProvider><CloneVoicePanel onCreated={vi.fn()} /></ToastProvider>);
    const dropzone = screen.getByRole("button", { name: /choose or drop/i });
    fireEvent.keyDown(dropzone, { key: "Enter" });
    expect(click).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Clone Voice" })).toBeDisabled();
    click.mockRestore();
  });
});

describe("generation panel", () => {
  it("counts a script and remains disabled without a voice", async () => {
    render(<ToastProvider><GenerateVoicePanel voices={[]} selectedVoiceId={null} onSelectedVoice={vi.fn()} generation={null} onGenerated={vi.fn()} onDeleted={vi.fn()} usage={usage} providerInfo={mockProviderInfo} /></ToastProvider>);
    await userEvent.type(screen.getByLabelText("Enter text"), "Hello");
    expect(screen.getByText("5 / 5,000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate voiceover/i })).toBeDisabled();
  });

  it("shows Demo Provider only in mock mode", () => {
    const { rerender } = render(<ToastProvider><GenerateVoicePanel voices={[]} selectedVoiceId={null} onSelectedVoice={vi.fn()} generation={null} onGenerated={vi.fn()} onDeleted={vi.fn()} usage={usage} providerInfo={mockProviderInfo} /></ToastProvider>);
    expect(screen.getByText("Demo Provider")).toBeInTheDocument();

    rerender(<ToastProvider><GenerateVoicePanel voices={[]} selectedVoiceId={null} onSelectedVoice={vi.fn()} generation={null} onGenerated={vi.fn()} onDeleted={vi.fn()} usage={usage} providerInfo={cartesiaProviderInfo} /></ToastProvider>);
    expect(screen.queryByText("Demo Provider")).not.toBeInTheDocument();
    expect(screen.getByText("Cartesia")).toBeInTheDocument();
  });

  it("does not show a decorative delivery-style control", () => {
    render(<ToastProvider><GenerateVoicePanel voices={[]} selectedVoiceId={null} onSelectedVoice={vi.fn()} generation={null} onGenerated={vi.fn()} onDeleted={vi.fn()} usage={usage} providerInfo={cartesiaProviderInfo} /></ToastProvider>);
    expect(screen.queryByText("Normal")).not.toBeInTheDocument();
  });

  it("honestly blocks new operations when the deployment switch is off", async () => {
    const activeVoice = voice("cartesia-voice", "cartesia", "Paused Voice");
    render(<ToastProvider><GenerateVoicePanel voices={[activeVoice]} selectedVoiceId={activeVoice.id} onSelectedVoice={vi.fn()} generation={null} onGenerated={vi.fn()} onDeleted={vi.fn()} usage={{ ...usage, activeProvider: "cartesia" }} providerInfo={{ ...cartesiaProviderInfo, operationsEnabled: false }} /></ToastProvider>);
    await userEvent.type(screen.getByLabelText("Enter text"), "Hello");
    expect(screen.getByRole("button", { name: /Generate Voiceover/i })).toBeDisabled();
    expect(screen.getByText(/temporarily paused/i)).toBeInTheDocument();
  });

  it("excludes mock voices and keeps Cartesia voices selectable in Cartesia mode", async () => {
    const onSelectedVoice = vi.fn();
    const voices = [
      voice("mock-voice", "mock", "Studio Narration"),
      voice("cartesia-voice", "cartesia", "Mohamed Test Voice"),
    ];
    render(<ToastProvider><GenerateVoicePanel voices={voices} selectedVoiceId="mock-voice" onSelectedVoice={onSelectedVoice} generation={null} onGenerated={vi.fn()} onDeleted={vi.fn()} usage={usage} providerInfo={cartesiaProviderInfo} /></ToastProvider>);

    const selector = screen.getByRole("combobox", { name: "Select voice" });
    expect(screen.queryByText(/Studio Narration/i)).not.toBeInTheDocument();
    expect(selector).toHaveTextContent("Mohamed Test Voice");
    expect(selector).not.toBeDisabled();
    expect(onSelectedVoice).not.toHaveBeenCalled();
  });
});

describe("product semantics", () => {
  it("presents development access and unavailable payments without a fake paid plan", () => {
    render(<BillingOverview state={{
      enabled: false,
      mode: "development",
      applicationPlanLabel: "Developer access",
      providerAllowanceLabel: "Cartesia allowance",
      providerName: "cartesia",
      characterAllowance: 100_000,
      voiceAllowance: 20,
      checkoutAvailable: false,
      currentApplicationPlanId: null,
      availableUpgradePlanId: null,
    }} />);
    expect(screen.getByText("Developer access")).toBeInTheDocument();
    expect(screen.getByText("Payments unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/VoxMint Pro/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upgrade|checkout/i })).not.toBeInTheDocument();
  });

  it("keeps scheduled retention visibly inactive and unsavable without a worker", () => {
    render(<ToastProvider><SettingsClient account={{ name: "Maya", email: "maya@example.test", preferredLanguage: "en", preferredAudioFormat: "wav", theme: "DARK", retentionDays: null }} operations={{ developmentSession: true, retentionWorkerEnabled: false }} /></ToastProvider>);
    expect(screen.getByText("Development account")).toBeInTheDocument();
    expect(screen.getByLabelText(/Retention preference/i)).toBeDisabled();
    expect(screen.getByText(/Scheduled retention is not active in this deployment/i)).toBeInTheDocument();
  });

  it("enables scheduled retention only when a worker capability is present", () => {
    render(<ToastProvider><SettingsClient account={{ name: "Maya", email: "maya@example.test", preferredLanguage: "en", preferredAudioFormat: "wav", theme: "DARK", retentionDays: 30 }} operations={{ developmentSession: false, retentionWorkerEnabled: true }} /></ToastProvider>);
    expect(screen.getByLabelText(/Retention preference/i)).toBeEnabled();
    expect(screen.getByText(/Scheduled retention is active/i)).toBeInTheDocument();
    expect(screen.queryByText("Development account")).not.toBeInTheDocument();
  });

  it("uses a compact development marker in the account menu", async () => {
    render(<UserMenu user={{ name: "Maya Chen", email: "maya@example.test" }} developmentSession />);
    expect(screen.getByText("Development account")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getAllByText(/Development account/i).length).toBeGreaterThanOrEqual(2);
  });

  it("hides development markers for a production identity", () => {
    render(<UserMenu user={{ name: "Maya Chen", email: "maya@example.test" }} developmentSession={false} />);
    expect(screen.queryByText(/Development/i)).not.toBeInTheDocument();
  });

  it("exposes an honest voice action without a quota-spending preview", () => {
    const cartesiaVoice = voice("cartesia-voice", "cartesia", "Mohamed Test Voice");
    cartesiaVoice.generationCount = 3;
    render(<ToastProvider><VoicesClient initialVoices={[cartesiaVoice]} providerInfo={cartesiaProviderInfo} /></ToastProvider>);
    expect(screen.getByRole("link", { name: /Use voice/i })).toHaveAttribute("href", "/dashboard?voice=cartesia-voice#generate");
    expect(screen.getByText("No preview available")).toBeInTheDocument();
    expect(screen.getByText("Generations").nextElementSibling).toHaveTextContent("3");
    expect(screen.queryByText(/Generate test/i)).not.toBeInTheDocument();
  });

  it("shows clone-first onboarding without a duplicate clone link", () => {
    render(<ToastProvider><DashboardClient initialVoices={[]} initialSelectedVoiceId={null} initialGeneration={null} usage={usage} providerInfo={mockProviderInfo} /></ToastProvider>);
    expect(screen.getByRole("heading", { name: "Clone a Voice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clone Voice" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Clone new voice/i })).not.toBeInTheDocument();
  });

  it("shows generation first for returning users with one clone action", () => {
    render(<ToastProvider><DashboardClient initialVoices={[voice("cartesia-voice", "cartesia", "Mohamed Test Voice")]} initialSelectedVoiceId="cartesia-voice" initialGeneration={null} usage={{ ...usage, activeProvider: "cartesia" }} providerInfo={cartesiaProviderInfo} /></ToastProvider>);
    expect(screen.getByRole("heading", { name: "Generate Voiceover" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Clone a Voice" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Clone new voice/i })).toHaveLength(1);
  });

  it("writes the selected History provider to URL state", async () => {
    window.history.replaceState(null, "", "/history?provider=cartesia");
    render(<ToastProvider><HistoryClient initialGenerations={[]} voices={[]} initialProvider="cartesia" /></ToastProvider>);
    await userEvent.selectOptions(screen.getByLabelText("Filter by provider"), "all");
    expect(window.location.search).toBe("?provider=all");
  });
});

describe("audio player", () => {
  it("renders a meaningful empty state", () => {
    render(<ToastProvider><AudioPlayer generation={null} /></ToastProvider>);
    expect(screen.getByText("Your generated audio will appear here.")).toBeInTheDocument();
  });
});
