import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bell, CreditCard, Settings, Shield, Users } from "lucide-react";
import { SectionHeader } from "@/components/section-header";

const meta = {
  component: SectionHeader,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  title: "Business Components/SectionHeader",
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Section Title",
  },
};

export const WithDescription: Story = {
  args: {
    children: "User Settings",
    description: "Manage your account settings and preferences",
  },
};

export const WithIcon: Story = {
  args: {
    children: "Administrator Settings",
    description: "Manage administrators and their permissions",
    icon: Users,
  },
};

export const SettingsSection: Story = {
  args: {
    children: "General Settings",
    description: "Configure application-wide settings",
    icon: Settings,
  },
};

export const NotificationSection: Story = {
  args: {
    children: "Notifications",
    description: "Configure how you receive notifications",
    icon: Bell,
  },
};

export const SecuritySection: Story = {
  args: {
    children: "Security & Privacy",
    description: "Manage your security settings and privacy preferences",
    icon: Shield,
  },
};

export const BillingSection: Story = {
  args: {
    children: "Billing & Subscription",
    description: "View and manage your subscription and payment methods",
    icon: CreditCard,
  },
};

export const InSettingsPage: Story = {
  args: {
    children: "Settings Page",
    description: "Example settings page",
    icon: Users,
  },
  render: () => (
    <div className="max-w-2xl space-y-8">
      <SectionHeader
        description="Manage your account settings and preferences"
        icon={Users}
      >
        Profile Settings
      </SectionHeader>
      <div className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="display-name">
            Display Name
          </label>
          <input
            className="w-full rounded border px-3 py-2"
            id="display-name"
            placeholder="John Doe"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="email">
            Email
          </label>
          <input
            className="w-full rounded border px-3 py-2"
            id="email"
            placeholder="john@example.com"
            type="email"
          />
        </div>
      </div>

      <SectionHeader
        description="Configure how you receive notifications"
        icon={Bell}
      >
        Notification Settings
      </SectionHeader>
      <div className="space-y-2 rounded-lg border p-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" />
          <span className="text-sm">Email notifications</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" />
          <span className="text-sm">Push notifications</span>
        </label>
      </div>

      <SectionHeader description="Manage your security settings" icon={Shield}>
        Security
      </SectionHeader>
      <div className="rounded-lg border p-4">
        <button
          className="rounded bg-primary px-4 py-2 text-primary-foreground text-sm"
          type="button"
        >
          Change Password
        </button>
      </div>
    </div>
  ),
};
