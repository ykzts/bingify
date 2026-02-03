import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LanguageSwitcher } from "@/components/language-switcher";

const meta = {
  title: "Business Components/LanguageSwitcher",
  component: LanguageSwitcher,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LanguageSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <LanguageSwitcher />
      <p className="text-sm text-muted-foreground">
        Click to switch between English and Japanese
      </p>
    </div>
  ),
};

export const InNavigation: Story = {
  render: () => (
    <nav className="flex items-center justify-between border rounded-lg p-4 w-[600px]">
      <h2 className="text-lg font-semibold">Bingify</h2>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <button className="px-3 py-2 border rounded text-sm">Login</button>
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
