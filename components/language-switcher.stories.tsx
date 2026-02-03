import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LanguageSwitcher } from "@/components/language-switcher";

const meta = {
  component: LanguageSwitcher,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Business Components/LanguageSwitcher",
} satisfies Meta<typeof LanguageSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <LanguageSwitcher />
      <p className="text-muted-foreground text-sm">
        Click to switch between English and Japanese
      </p>
    </div>
  ),
};

export const InNavigation: Story = {
  render: () => (
    <nav className="flex w-[600px] items-center justify-between rounded-lg border p-4">
      <h2 className="font-semibold text-lg">Bingify</h2>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <button className="rounded border px-3 py-2 text-sm" type="button">
          Login
        </button>
      </div>
    </nav>
  ),
};

export const WithThemeToggle: Story = {
  render: () => {
    // Dynamically import ThemeToggle to avoid circular dependencies
    const { ThemeToggle } = require("@/components/theme-toggle");
    return (
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    );
  },
};
