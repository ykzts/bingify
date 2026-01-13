import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Announcement } from "@/lib/types/announcement";
import { AnnouncementBanner } from "../announcement-banner";

// アクションのモック
vi.mock("@/lib/actions/announcements", () => ({
  dismissAnnouncement: vi.fn(),
  getActiveAnnouncements: vi.fn(),
  getDismissedAnnouncements: vi.fn(),
}));

// FormattedText コンポーネントのモック
vi.mock("@/components/formatted-text", () => ({
  FormattedText: ({ text }: { text: string | null | undefined }) => (
    <div data-testid="formatted-text">{text}</div>
  ),
}));

// 以下のインポートはモック後に行う
const {
  dismissAnnouncement,
  getActiveAnnouncements,
  getDismissedAnnouncements,
} = await import("@/lib/actions/announcements");

const mockAnnouncements: Announcement[] = [
  {
    content: "エラーメッセージです",
    created_at: "2026-01-01T00:00:00Z",
    created_by: "user1",
    dismissible: true,
    ends_at: null,
    id: "error-1",
    priority: "error",
    published: true,
    starts_at: null,
    title: "エラー通知",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    content: "警告メッセージです",
    created_at: "2026-01-01T00:00:00Z",
    created_by: "user1",
    dismissible: true,
    ends_at: null,
    id: "warning-1",
    priority: "warning",
    published: true,
    starts_at: null,
    title: "警告通知",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    content: "情報メッセージです",
    created_at: "2026-01-01T00:00:00Z",
    created_by: "user1",
    dismissible: true,
    ends_at: null,
    id: "info-1",
    priority: "info",
    published: true,
    starts_at: null,
    title: "情報通知",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("AnnouncementBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中は何も表示しない", () => {
    vi.mocked(getActiveAnnouncements).mockImplementation(
      () =>
        new Promise(() => {
          // ローディング状態を保持するために解決しないPromise
        })
    );
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    const { container } = render(<AnnouncementBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("アクティブなお知らせがない場合は何も表示しない", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    const { container } = render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("最高優先度のお知らせを表示する（error > warning > info）", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: mockAnnouncements,
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(screen.getByText("エラー通知")).toBeInTheDocument();
      expect(screen.getByText("エラーメッセージです")).toBeInTheDocument();
    });

    // 他のお知らせは表示されない
    expect(screen.queryByText("警告通知")).not.toBeInTheDocument();
    expect(screen.queryByText("情報通知")).not.toBeInTheDocument();
  });

  it("非表示済みお知らせを除外する", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: mockAnnouncements,
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: ["error-1"], // エラーお知らせを非表示済み
      success: true,
    });

    render(<AnnouncementBanner />);

    await waitFor(() => {
      // エラーは非表示済みなので警告が表示される
      expect(screen.getByText("警告通知")).toBeInTheDocument();
      expect(screen.queryByText("エラー通知")).not.toBeInTheDocument();
    });
  });

  it("dismissible=true の場合、閉じるボタンが表示される", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: [mockAnnouncements[0]],
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    render(<AnnouncementBanner />);

    await waitFor(() => {
      const closeButton = screen.getByRole("button", {
        name: "お知らせを閉じる",
      });
      expect(closeButton).toBeInTheDocument();
    });
  });

  it("dismissible=false の場合、閉じるボタンが表示されない", async () => {
    const nonDismissibleAnnouncement = {
      ...mockAnnouncements[0],
      dismissible: false,
    };

    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: [nonDismissibleAnnouncement],
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(screen.getByText("エラー通知")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "お知らせを閉じる" })
    ).not.toBeInTheDocument();
  });

  it("閉じるボタンをクリックすると dismissAnnouncement が呼ばれる", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: [mockAnnouncements[0]],
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });
    vi.mocked(dismissAnnouncement).mockResolvedValue({
      success: true,
    });

    render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(screen.getByText("エラー通知")).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", {
      name: "お知らせを閉じる",
    });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(dismissAnnouncement).toHaveBeenCalledWith("error-1");
    });
  });

  it("閉じるボタンをクリックするとバナーが非表示になる", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: [mockAnnouncements[0]],
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });
    vi.mocked(dismissAnnouncement).mockResolvedValue({
      success: true,
    });

    const { container } = render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(screen.getByText("エラー通知")).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", {
      name: "お知らせを閉じる",
    });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("エラー優先度のお知らせにはdestructive variantが適用される", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: [mockAnnouncements[0]],
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(screen.getByText("エラー通知")).toBeInTheDocument();
    });

    // Alert要素にrole="alert"が付与されていることを確認
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("警告優先度のお知らせにはカスタムスタイルが適用される", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: [mockAnnouncements[1]],
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(screen.getByText("警告通知")).toBeInTheDocument();
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("border-amber-500/50");
    expect(alert).toHaveClass("bg-amber-50");
  });

  it("情報優先度のお知らせにはdefault variantが適用される", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: [mockAnnouncements[2]],
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(screen.getByText("情報通知")).toBeInTheDocument();
    });

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("FormattedText コンポーネントでコンテンツがレンダリングされる", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: [mockAnnouncements[0]],
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(screen.getByTestId("formatted-text")).toBeInTheDocument();
      expect(screen.getByText("エラーメッセージです")).toBeInTheDocument();
    });
  });

  it("エラーが発生した場合は何も表示しない", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      error: "エラーが発生しました",
      success: false,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    const { container } = render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("すべてのお知らせが非表示済みの場合は何も表示しない", async () => {
    vi.mocked(getActiveAnnouncements).mockResolvedValue({
      data: mockAnnouncements,
      success: true,
    });
    vi.mocked(getDismissedAnnouncements).mockResolvedValue({
      data: ["error-1", "warning-1", "info-1"],
      success: true,
    });

    const { container } = render(<AnnouncementBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
