import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChannelBadge } from "./channel-badge";

describe("ChannelBadge", () => {
  it("renders 'Voice' text for the voice channel (a11y: text + color)", () => {
    render(<ChannelBadge channel="voice" />);
    expect(screen.getByText("Voice")).toBeInTheDocument();
  });

  it("renders 'WhatsApp' text for the whatsapp channel", () => {
    render(<ChannelBadge channel="whatsapp" />);
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });
});
