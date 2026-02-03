import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeToggle } from "@/components/theme-toggle";

const meta = {
  title: "Business Components/ThemeToggle",
  component: ThemeToggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      <p className="text-sm text-muted-foreground">
        Click to toggle between light, dark, and system themes
      </p>
    </div>
  ),
};

export const InHeader: Story = {
  render: () => (
    <div className="flex items-center justify-between border rounded-lg p-4 w-[600px]">
      <h2 className="text-lg font-semibold">Application Header</h2>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </div>
  ),
};

export const WithOtherControls: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <button className="px-3 py-2 border rounded">Settings</button>
      <ThemeToggle />
      <button className="px-3 py-2 border rounded">Profile</button>
    </div>
  ),
};
