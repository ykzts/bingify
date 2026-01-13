import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpaceAnnouncementWithDetails } from "@/lib/actions/space-announcements";
import { SpaceAnnouncementList } from "../space-announcement-list";

// アクションのモック
vi.mock("@/lib/actions/space-announcements", () => ({
  deleteSpaceAnnouncement: vi.fn(),
  getSpaceAnnouncements: vi.fn(),
}));

// next-intl のモック
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      deleteButton: "削除",
      deleteConfirm: "このお知らせを削除してもよろしいですか？",
      deleteSuccess: "お知らせを削除しました",
      editButton: "編集",
      emptyMessage: "お知らせはまだありません",
      emptyMessageDescription:
        "スペースのオーナーまたは管理者がお知らせを作成すると、ここに表示されます。",
      loadingMessage: "お知らせを読み込んでいます...",
      manageButton: "お知らせを管理",
      pinned: "ピン留め",
      title: "お知らせ",
    };
    return translations[key] || key;
  },
}));

// next/navigation のモック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// FormattedText コンポーネントのモック
vi.mock("@/components/formatted-text", () => ({
  FormattedText: ({ text }: { text: string | null | undefined }) => (
    <div data-testid="formatted-text">{text}</div>
  ),
}));

// confirm provider のモック
vi.mock("@/components/providers/confirm-provider", () => ({
  useConfirm: () =>
    vi.fn().mockImplementation(() => Promise.resolve(true)),
}));

// sonner のモック
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const { deleteSpaceAnnouncement, getSpaceAnnouncements } = await import(
  "@/lib/actions/space-announcements"
);
const { toast } = await import("sonner");

const mockAnnouncements: SpaceAnnouncementWithDetails[] = [
  {
    announcement_id: "announcement-1",
    announcements: {
      content: "重要なお知らせです",
      created_at: "2026-01-01T00:00:00Z",
      created_by: "user1",
      dismissible: true,
      ends_at: null,
      id: "announcement-1",
      priority: "info",
      published: true,
      starts_at: null,
      title: "ピン留めされたお知らせ",
      updated_at: "2026-01-01T00:00:00Z",
    },
    created_at: "2026-01-01T00:00:00Z",
    id: "space-announcement-1",
    pinned: true,
    space_id: "space-1",
  },
  {
    announcement_id: "announcement-2",
    announcements: {
      content: "通常のお知らせです",
      created_at: "2026-01-02T00:00:00Z",
      created_by: "user1",
      dismissible: true,
      ends_at: null,
      id: "announcement-2",
      priority: "info",
      published: true,
      starts_at: null,
      title: "通常のお知らせ",
      updated_at: "2026-01-02T00:00:00Z",
    },
    created_at: "2026-01-02T00:00:00Z",
    id: "space-announcement-2",
    pinned: false,
    space_id: "space-1",
  },
];

describe("SpaceAnnouncementList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("ローディング中はスケルトンを表示する", () => {
    vi.mocked(getSpaceAnnouncements).mockImplementation(
      () =>
        new Promise(() => {
          // ローディング状態を保持するために解決しないPromise
        })
    );

    render(<SpaceAnnouncementList isAdmin={false} spaceId="space-1" />);

    expect(screen.getByText("お知らせ")).toBeInTheDocument();
    // アニメーション付きのスケルトンが表示されているか確認
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("お知らせが存在しない場合は空状態を表示する", async () => {
    vi.mocked(getSpaceAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    render(<SpaceAnnouncementList isAdmin={false} spaceId="space-1" />);

    await waitFor(() => {
      expect(screen.getByText("お知らせはまだありません")).toBeInTheDocument();
      expect(
        screen.getByText(
          "スペースのオーナーまたは管理者がお知らせを作成すると、ここに表示されます。"
        )
      ).toBeInTheDocument();
    });
  });

  it("管理者の場合、空状態でも管理ボタンが表示される", async () => {
    vi.mocked(getSpaceAnnouncements).mockResolvedValue({
      data: [],
      success: true,
    });

    render(<SpaceAnnouncementList isAdmin={true} spaceId="space-1" />);

    await waitFor(() => {
      expect(screen.getByText("お知らせを管理")).toBeInTheDocument();
    });
  });

  it("お知らせ一覧を表示する", async () => {
    vi.mocked(getSpaceAnnouncements).mockResolvedValue({
      data: mockAnnouncements,
      success: true,
    });

    render(<SpaceAnnouncementList isAdmin={false} spaceId="space-1" />);

    await waitFor(() => {
      expect(screen.getByText("ピン留めされたお知らせ")).toBeInTheDocument();
      expect(screen.getByText("通常のお知らせ")).toBeInTheDocument();
      expect(screen.getByText("重要なお知らせです")).toBeInTheDocument();
      expect(screen.getByText("通常のお知らせです")).toBeInTheDocument();
    });
  });

  it("ピン留めされたお知らせには特別なスタイルが適用される", async () => {
    vi.mocked(getSpaceAnnouncements).mockResolvedValue({
      data: mockAnnouncements,
      success: true,
    });

    render(<SpaceAnnouncementList isAdmin={false} spaceId="space-1" />);

    await waitFor(() => {
      const pinnedCard = screen
        .getByText("ピン留めされたお知らせ")
        .closest("[data-slot='card']");
      expect(pinnedCard).toHaveClass("border-primary");
      expect(pinnedCard).toHaveClass("border-2");
    });
  });

  it("管理者の場合、編集・削除ボタンが表示される", async () => {
    vi.mocked(getSpaceAnnouncements).mockResolvedValue({
      data: mockAnnouncements,
      success: true,
    });

    render(<SpaceAnnouncementList isAdmin={true} spaceId="space-1" />);

    await waitFor(() => {
      const editButtons = screen.getAllByLabelText("編集");
      const deleteButtons = screen.getAllByLabelText("削除");
      expect(editButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });
  });

  it("一般ユーザーの場合、編集・削除ボタンが表示されない", async () => {
    vi.mocked(getSpaceAnnouncements).mockResolvedValue({
      data: mockAnnouncements,
      success: true,
    });

    render(<SpaceAnnouncementList isAdmin={false} spaceId="space-1" />);

    await waitFor(() => {
      expect(screen.getByText("ピン留めされたお知らせ")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("編集")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("削除")).not.toBeInTheDocument();
  });

  it("削除ボタンをクリックすると確認ダイアログが表示され、削除が実行される", async () => {
    vi.mocked(getSpaceAnnouncements).mockResolvedValue({
      data: mockAnnouncements,
      success: true,
    });
    vi.mocked(deleteSpaceAnnouncement).mockResolvedValue({
      success: true,
    });

    render(<SpaceAnnouncementList isAdmin={true} spaceId="space-1" />);

    await waitFor(() => {
      expect(screen.getByText("ピン留めされたお知らせ")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText("削除");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteSpaceAnnouncement).toHaveBeenCalledWith(
        "space-1",
        "announcement-1"
      );
      expect(toast.success).toHaveBeenCalledWith("お知らせを削除しました");
    });
  });

  it("エラーが発生した場合はエラーメッセージを表示する", async () => {
    vi.mocked(getSpaceAnnouncements).mockResolvedValue({
      error: "エラーが発生しました",
      success: false,
    });

    render(<SpaceAnnouncementList isAdmin={false} spaceId="space-1" />);

    await waitFor(() => {
      expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
    });
  });

  it("FormattedText コンポーネントでコンテンツがレンダリングされる", async () => {
    vi.mocked(getSpaceAnnouncements).mockResolvedValue({
      data: mockAnnouncements,
      success: true,
    });

    render(<SpaceAnnouncementList isAdmin={false} spaceId="space-1" />);

    await waitFor(() => {
      const formattedTexts = screen.getAllByTestId("formatted-text");
      expect(formattedTexts).toHaveLength(2);
      expect(formattedTexts[0]).toHaveTextContent("重要なお知らせです");
      expect(formattedTexts[1]).toHaveTextContent("通常のお知らせです");
    });
  });
});
