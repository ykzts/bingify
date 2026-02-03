import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NotificationItem } from "@/components/notifications/notification-item";
import type { Notification } from "@/lib/types/notification";

const meta = {
  title: "Business Components/Notifications/NotificationItem",
  component: NotificationItem,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    onDelete: { action: "delete" },
    onMarkRead: { action: "mark-read" },
  },
} satisfies Meta<typeof NotificationItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseNotification: Notification = {
  id: "1",
  user_id: "user-1",
  type: "space_invitation",
  title: "New Space Invitation",
  message: "You've been invited to join 'Weekly Bingo Night'",
  link: "/spaces/123",
  read: false,
  created_at: new Date().toISOString(),
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
      type: "space_invitation",
      title: "Space Invitation",
      message: "You've been invited to 'Friday Game Night'",
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
      type: "bingo_achieved",
      title: "Bingo!",
      message: "Congratulations! You got a BINGO in 'Weekend Tournament'",
      read: false,
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
      type: "announcement_published",
      title: "New Announcement",
      message: "Check out the latest updates from the Bingify team",
      read: false,
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
      type: "system_update",
      title: "System Maintenance",
      message: "Scheduled maintenance on Sunday at 2 AM UTC",
      read: false,
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
      type: "role_changed",
      title: "Role Updated",
      message: "You have been promoted to moderator in 'Main Hall'",
      read: false,
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
          type: "bingo_achieved",
          title: "Bingo!",
          message: "You got a BINGO!",
          read: false,
        }}
        variant="expanded"
      />
      <NotificationItem
        locale="en"
        notification={{
          ...baseNotification,
          id: "3",
          type: "system_update",
          title: "System Update",
          message: "New features available",
          read: true,
        }}
        variant="expanded"
      />
    </div>
  ),
};
