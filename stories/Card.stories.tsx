import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BellRing, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const meta = {
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "UI Components/Card",
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content</p>
      </CardContent>
      <CardFooter>
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>You have 3 unread messages.</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline">
            Mark all as read
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-start gap-4 rounded-md border p-3">
            <BellRing className="mt-0.5" />
            <div className="grid gap-1">
              <p className="font-medium text-sm leading-none">
                Push Notifications
              </p>
              <p className="text-muted-foreground text-sm">
                Send notifications to device.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">
          <Check /> Mark all as read
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="font-medium text-sm" htmlFor="name">
              Name
            </label>
            <input
              className="h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
              id="name"
              placeholder="Project name"
              type="text"
            />
          </div>
          <div className="grid gap-2">
            <label className="font-medium text-sm" htmlFor="description">
              Description
            </label>
            <textarea
              className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              id="description"
              placeholder="Project description"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardContent className="pt-6">
        <div className="space-y-1">
          <h4 className="font-medium text-sm leading-none">Quick Stats</h4>
          <p className="text-muted-foreground text-sm">
            Your statistics for the last 7 days
          </p>
        </div>
        <div className="mt-4 grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Active Games</span>
            <span className="font-bold text-sm">12</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Total Players</span>
            <span className="font-bold text-sm">234</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Completed Bingos</span>
            <span className="font-bold text-sm">45</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};
