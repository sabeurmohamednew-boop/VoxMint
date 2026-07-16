"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "@/components/audio/audio-player";
import { CloneVoicePanel } from "@/components/dashboard/clone-voice-panel";
import { GenerateVoicePanel } from "@/components/dashboard/generate-voice-panel";
import { ToastProvider } from "@/components/ui/toast";

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
    render(<ToastProvider><GenerateVoicePanel voices={[]} selectedVoiceId={null} onSelectedVoice={vi.fn()} generation={null} onGenerated={vi.fn()} onDeleted={vi.fn()} usage={{ plan: "FREE", periodKey: "2026-07", charactersUsed: 0, characterLimit: 10_000, voicesUsed: 0, voiceLimit: 2 }} /></ToastProvider>);
    await userEvent.type(screen.getByLabelText("Enter text"), "Hello");
    expect(screen.getByText("5 / 5,000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate voiceover/i })).toBeDisabled();
  });
});

describe("audio player", () => {
  it("renders a meaningful empty state", () => {
    render(<ToastProvider><AudioPlayer generation={null} /></ToastProvider>);
    expect(screen.getByText("Your generated audio will appear here.")).toBeInTheDocument();
  });
});
