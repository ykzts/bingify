import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeToggle } from "@/components/theme-toggle";

const meta = {
  component: ThemeToggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Business Components/ThemeToggle",
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      <p className="text-muted-foreground text-sm">
        Click to toggle between light, dark, and system themes
      </p>
    </div>
  ),
};

export const InHeader: Story = {
  render: () => (
    <div className="flex w-[600px] items-center justify-between rounded-lg border p-4">
      <h2 className="font-semibold text-lg">Application Header</h2>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </div>
  ),
};

export const WithOtherControls: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <button className="rounded border px-3 py-2">Settings</button>
      <ThemeToggle />
      <button className="rounded border px-3 py-2">Profile</button>
    </div>
  ),
};
