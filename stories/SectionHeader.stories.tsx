import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SectionHeader } from "@/components/section-header";
import { Users, Settings, Bell, Shield, CreditCard } from "lucide-react";

const meta = {
  title: "Business Components/SectionHeader",
  component: SectionHeader,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
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
    icon: Users,
    description: "Manage administrators and their permissions",
  },
};

export const SettingsSection: Story = {
  args: {
    children: "General Settings",
    icon: Settings,
    description: "Configure application-wide settings",
  },
};

export const NotificationSection: Story = {
  args: {
    children: "Notifications",
    icon: Bell,
    description: "Configure how you receive notifications",
  },
};

export const SecuritySection: Story = {
  args: {
    children: "Security & Privacy",
    icon: Shield,
    description: "Manage your security settings and privacy preferences",
  },
};

export const BillingSection: Story = {
  args: {
    children: "Billing & Subscription",
    icon: CreditCard,
    description: "View and manage your subscription and payment methods",
  },
};

export const InSettingsPage: Story = {
  render: () => (
    <div className="space-y-8 max-w-2xl">
      <SectionHeader
        description="Manage your account settings and preferences"
        icon={Users}
      >
        Profile Settings
      </SectionHeader>
      <div className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Display Name</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="John Doe"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            className="w-full rounded border px-3 py-2"
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

      <SectionHeader
        description="Manage your security settings"
        icon={Shield}
      >
        Security
      </SectionHeader>
      <div className="rounded-lg border p-4">
        <button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">
          Change Password
        </button>
      </div>
    </div>
  ),
};
