import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChevronRight, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const meta = {
  argTypes: {
    asChild: {
      control: "boolean",
      description: "Render as a child component using Radix Slot",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
    size: {
      control: "select",
      description: "The size of the button",
      options: [
        "default",
        "xs",
        "sm",
        "lg",
        "icon",
        "icon-xs",
        "icon-sm",
        "icon-lg",
      ],
    },
    variant: {
      control: "select",
      description: "The visual style of the button",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
    },
  },
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "UI Components/Button",
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
    size: "default",
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

export const Ghost: Story = {
  args: {
    children: "Ghost",
    variant: "ghost",
  },
};

export const Link: Story = {
  args: {
    children: "Link",
    variant: "link",
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail />
        Login with Email
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    "aria-label": "Next",
    children: <ChevronRight />,
    size: "icon",
  },
};

export const Loading: Story = {
  args: {
    children: (
      <>
        <Loader2 className="animate-spin" />
        Please wait
      </>
    ),
    disabled: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
      <div className="flex gap-2">
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button disabled>Default</Button>
      <Button disabled variant="secondary">
        Secondary
      </Button>
      <Button disabled variant="outline">
        Outline
      </Button>
    </div>
  ),
};
