import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, Info } from "lucide-react";

const meta = {
  title: "UI Components/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
      description: "The visual style of the badge",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Destructive",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="default">
        <Check /> Verified
      </Badge>
      <Badge variant="destructive">
        <AlertCircle /> Error
      </Badge>
      <Badge variant="secondary">
        <Info /> Info
      </Badge>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">Active:</span>
        <Badge variant="default">
          <Check /> Active
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Pending:</span>
        <Badge variant="secondary">Pending</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Error:</span>
        <Badge variant="destructive">
          <AlertCircle /> Error
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Draft:</span>
        <Badge variant="outline">Draft</Badge>
      </div>
    </div>
  ),
};

export const InText: Story = {
  render: () => (
    <p className="text-sm">
      This is a text with an inline{" "}
      <Badge variant="secondary">NEW</Badge> badge.
    </p>
  ),
};
