import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NotificationItem } from "@/components/notifications/notification-item";
import type { Notification } from "@/lib/types/notification";

const meta = {
  argTypes: {
    onDelete: { action: "delete" },
    onMarkRead: { action: "mark-read" },
  },
  component: NotificationItem,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  title: "Business Components/Notifications/NotificationItem",
} satisfies Meta<typeof NotificationItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseNotification: Notification = {
  content: "You've been invited to join 'Weekly Bingo Night'",
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  id: "1",
  metadata: { action_url: "/spaces/123" },
  read: false,
  title: "New Space Invitation",
  type: "space_invitation",
  user_id: "user-1",
};

export const Unread: Story = {
  args: {
    locale: "en",
    notification: baseNotification,
    variant: "expanded",
  },
};

export const Read: Story = {
  args: {
    locale: "en",
    notification: {
      ...baseNotification,
      read: true,
    },
    variant: "expanded",
  },
};

export const SpaceInvitation: Story = {
  args: {
    locale: "en",
    notification: {
      ...baseNotification,
      content: "You've been invited to 'Friday Game Night'",
      title: "Space Invitation",
      type: "space_invitation",
    },
    variant: "expanded",
  },
};

export const BingoAchieved: Story = {
  args: {
    locale: "en",
    notification: {
      ...baseNotification,
      content: "Congratulations! You got a BINGO in 'Weekend Tournament'",
      id: "2",
      read: false,
      title: "Bingo!",
      type: "bingo_achieved",
    },
    variant: "expanded",
  },
};

export const AnnouncementPublished: Story = {
  args: {
    locale: "en",
    notification: {
      ...baseNotification,
      content: "Check out the latest updates from the Bingify team",
      id: "3",
      read: false,
      title: "New Announcement",
      type: "announcement_published",
    },
    variant: "expanded",
  },
};

export const SystemUpdate: Story = {
  args: {
    locale: "en",
    notification: {
      ...baseNotification,
      content: "Scheduled maintenance on Sunday at 2 AM UTC",
      id: "4",
      read: false,
      title: "System Maintenance",
      type: "system_update",
    },
    variant: "expanded",
  },
};

export const RoleChanged: Story = {
  args: {
    locale: "en",
    notification: {
      ...baseNotification,
      content: "You have been promoted to moderator in 'Main Hall'",
      id: "5",
      read: false,
      title: "Role Updated",
      type: "role_changed",
    },
    variant: "expanded",
  },
};

export const Compact: Story = {
  args: {
    locale: "en",
    notification: baseNotification,
    variant: "compact",
  },
};

export const CompactRead: Story = {
  args: {
    locale: "en",
    notification: {
      ...baseNotification,
      read: true,
    },
    variant: "compact",
  },
};

export const NotificationList: Story = {
  args: {
    locale: "en",
    notification: baseNotification,
    variant: "expanded",
  },
  render: () => (
    <div className="w-96 space-y-2">
      <NotificationItem
        locale="en"
        notification={{
          ...baseNotification,
          id: "1",
          type: "space_invitation",
        }}
        variant="expanded"
      />
      <NotificationItem
        locale="en"
        notification={{
          ...baseNotification,
          content: "You got a BINGO!",
          id: "2",
          read: false,
          title: "Bingo!",
          type: "bingo_achieved",
        }}
        variant="expanded"
      />
      <NotificationItem
        locale="en"
        notification={{
          ...baseNotification,
          content: "New features available",
          id: "3",
          read: true,
          title: "System Update",
          type: "system_update",
        }}
        variant="expanded"
      />
    </div>
  ),
};
