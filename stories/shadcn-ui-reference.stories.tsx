import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  parameters: {
    docs: {
      page: () => (
        <div style={{ margin: "0 auto", maxWidth: "800px", padding: "2rem" }}>
          <h1>shadcn/ui コンポーネント</h1>
          <p>
            このプロジェクトでは、UIコンポーネントライブラリとして{" "}
            <a
              href="https://ui.shadcn.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              shadcn/ui
            </a>{" "}
            を使用しています。
          </p>

          <h2>shadcn/ui について</h2>
          <p>
            shadcn/ui のコンポーネントは <code>components/ui/</code>{" "}
            ディレクトリに配置されており、shadcn/ui CLI
            によって自動管理されています。
            <br />
            <strong>
              CLIとの競合を避けるため、これらのファイルを直接編集しないでください。
            </strong>
          </p>

          <h2>利用可能なコンポーネント</h2>
          <p>
            完全なドキュメント、インタラクティブな例、使用方法については、shadcn/ui
            公式ドキュメントを参照してください：
          </p>
          <p>
            <strong>
              👉{" "}
              <a
                href="https://ui.shadcn.com/docs/components"
                rel="noopener noreferrer"
                target="_blank"
              >
                shadcn/ui コンポーネントドキュメント
              </a>
            </strong>
          </p>

          <h3>コンポーネント一覧</h3>
          <p>
            以下の shadcn/ui
            コンポーネントが現在このプロジェクトにインストールされています：
          </p>

          <h4>フォームコンポーネント</h4>
          <ul>
            <li>
              <a href="https://ui.shadcn.com/docs/components/accordion">
                Accordion
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/checkbox">
                Checkbox
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/form">Form</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/input">Input</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/label">Label</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/radio-group">
                Radio Group
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/select">Select</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/slider">Slider</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/switch">Switch</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/textarea">
                Textarea
              </a>
            </li>
          </ul>

          <h4>UI コンポーネント</h4>
          <ul>
            <li>
              <a href="https://ui.shadcn.com/docs/components/alert">Alert</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/alert-dialog">
                Alert Dialog
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/avatar">Avatar</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/badge">Badge</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/button">Button</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/card">Card</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/dialog">Dialog</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/dropdown-menu">
                Dropdown Menu
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/popover">
                Popover
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/progress">
                Progress
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/separator">
                Separator
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/sheet">Sheet</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/skeleton">
                Skeleton
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/tabs">Tabs</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/toast">Toast</a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/tooltip">
                Tooltip
              </a>
            </li>
          </ul>

          <h4>ナビゲーション</h4>
          <ul>
            <li>
              <a href="https://ui.shadcn.com/docs/components/breadcrumb">
                Breadcrumb
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/navigation-menu">
                Navigation Menu
              </a>
            </li>
          </ul>

          <h4>データ表示</h4>
          <ul>
            <li>
              <a href="https://ui.shadcn.com/docs/components/calendar">
                Calendar
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/docs/components/table">Table</a>
            </li>
          </ul>

          <h2>プロジェクト固有のコンポーネント</h2>
          <p>
            このプロジェクト専用に構築されたカスタムビジネスコンポーネントについては、サイドバーの{" "}
            <strong>Business Components</strong> セクションを参照してください。
          </p>

          <h2>スタイリング</h2>
          <p>すべての shadcn/ui コンポーネントは以下を使用しています：</p>
          <ul>
            <li>
              <strong>Tailwind CSS</strong> - スタイリング
            </li>
            <li>
              <strong>CSS Variables</strong> - テーマ設定
            </li>
            <li>
              <strong>Radix UI</strong> - 基盤となるコンポーネントライブラリ
            </li>
          </ul>

          <p>テーマ設定は以下のファイルにあります：</p>
          <ul>
            <li>
              <code>app/globals.css</code> - グローバルスタイルとCSS変数
            </li>
            <li>
              <code>tailwind.config.ts</code> - Tailwind設定
            </li>
            <li>
              <code>components.json</code> - shadcn/ui設定
            </li>
          </ul>

          <h2>新しいコンポーネントの追加</h2>
          <p>プロジェクトに新しい shadcn/ui コンポーネントを追加するには：</p>
          <pre>
            <code>pnpm dlx shadcn@latest add [component-name]</code>
          </pre>
          <p>例：</p>
          <pre>
            <code>pnpm dlx shadcn@latest add command</code>
          </pre>
          <p>
            これにより、正しい設定で <code>components/ui/</code>{" "}
            にコンポーネントが自動的にインストールされます。
          </p>
        </div>
      ),
    },
  },
  tags: ["autodocs"],
  title: "UI Components/shadcn/ui Reference",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Reference: Story = {};
