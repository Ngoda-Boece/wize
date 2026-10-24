// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MessageBubble } from "@/components/chat/message-bubble";
import { StatTiles } from "@/components/app/stat-tiles";
import { computeStats } from "@/lib/data/repository";

afterEach(cleanup);

describe("message rendering", () => {
  it("renders Markdown but never raw HTML or javascript: links", () => {
    const { container } = render(
      <MessageBubble
        role="assistant"
        content={'**Gras** et `code`\n\n<img src=x onerror="alert(1)"><script>alert(1)</script>\n\n[piège](javascript:alert(1))'}
      />,
    );
    expect(container.querySelector("strong")?.textContent).toBe("Gras");
    expect(container.querySelector("code")?.textContent).toBe("code");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    const link = screen.getByText("piège").closest("a");
    expect(link?.getAttribute("href") ?? "").not.toMatch(/javascript:/);
  });

  it("labels interrupted and simulated replies", () => {
    render(<MessageBubble role="assistant" content="Texte" partial simulated />);
    expect(screen.getByText("Réponse interrompue")).toBeTruthy();
    expect(screen.getByText("Réponse simulée")).toBeTruthy();
  });

  it("renders user text as plain text", () => {
    const { container } = render(<MessageBubble role="user" content="<b>pas du HTML</b>" />);
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<b>pas du HTML</b>");
  });
});

describe("progress tiles", () => {
  it("show real zeros for an empty account", () => {
    render(<StatTiles stats={computeStats([], [], [])} />);
    expect(screen.getAllByText("0")).toHaveLength(4);
  });
});
