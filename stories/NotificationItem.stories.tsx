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
  created_at: new Date().toISOString(),
  id: "1",
  link: "/spaces/123",
  message: "You've been invited to join 'Weekly Bingo Night'",
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
      message: "You've been invited to 'Friday Game Night'",
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
      id: "2",
      message: "Congratulations! You got a BINGO in 'Weekend Tournament'",
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
      id: "3",
      message: "Check out the latest updates from the Bingify team",
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
      id: "4",
      message: "Scheduled maintenance on Sunday at 2 AM UTC",
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
      id: "5",
      message: "You have been promoted to moderator in 'Main Hall'",
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
          id: "2",
          message: "You got a BINGO!",
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
          id: "3",
          message: "New features available",
          read: true,
          title: "System Update",
          type: "system_update",
        }}
        variant="expanded"
      />
    </div>
  ),
};
