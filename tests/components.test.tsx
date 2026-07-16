"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "@/components/audio/audio-player";
import { CloneVoicePanel } from "@/components/dashboard/clone-voice-panel";
import { GenerateVoicePanel } from "@/components/dashboard/generate-voice-panel";
import { ToastProvider } from "@/components/ui/toast";
import type { ProviderInfoDto, UsageDto, VoiceDto } from "@/lib/types/dto";

const usage: UsageDto = {
  plan: "FREE",
  periodKey: "2026-07",
  charactersUsed: 0,
  characterLimit: 10_000,
  voicesUsed: 0,
  voiceLimit: 2,
};

const mockProviderInfo: ProviderInfoDto = {
  name: "mock",
  label: "Demo Provider",
  isDemo: true,
  capabilities: { instantClone: true, multilingual: true },
};

const cartesiaProviderInfo: ProviderInfoDto = {
  name: "cartesia",
  label: "Cartesia",
  isDemo: false,
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

  it("excludes mock voices and keeps Cartesia voices selectable in Cartesia mode", async () => {
    const onSelectedVoice = vi.fn();
    const voices = [
      voice("mock-voice", "mock", "Studio Narration"),
      voice("cartesia-voice", "cartesia", "Mohamed Test Voice"),
    ];
    render(<ToastProvider><GenerateVoicePanel voices={voices} selectedVoiceId="mock-voice" onSelectedVoice={onSelectedVoice} generation={null} onGenerated={vi.fn()} onDeleted={vi.fn()} usage={usage} providerInfo={cartesiaProviderInfo} /></ToastProvider>);

    const selector = screen.getByRole("combobox", { name: "Select voice" });
    expect(screen.queryByRole("option", { name: /Studio Narration/i })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Mohamed Test Voice/i })).toBeInTheDocument();
    await userEvent.selectOptions(selector, "cartesia-voice");
    expect(onSelectedVoice).toHaveBeenCalledWith("cartesia-voice");
  });
});

describe("audio player", () => {
  it("renders a meaningful empty state", () => {
    render(<ToastProvider><AudioPlayer generation={null} /></ToastProvider>);
    expect(screen.getByText("Your generated audio will appear here.")).toBeInTheDocument();
  });
});
