import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OAuthButton } from "@/components/oauth-button";
import type { AuthProvider } from "@/lib/data/auth-providers";

const meta = {
  argTypes: {
    onClick: { action: "clicked" },
  },
  component: OAuthButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Business Components/OAuthButton",
} satisfies Meta<typeof OAuthButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const googleProvider: AuthProvider = {
  label: "Google",
  provider: "google",
};

const githubProvider: AuthProvider = {
  label: "GitHub",
  provider: "github",
};

const twitchProvider: AuthProvider = {
  label: "Twitch",
  provider: "twitch",
};

export const Google: Story = {
  args: {
    isLoading: false,
    onClick: () => console.log("Google sign in"),
    provider: googleProvider,
  },
};

export const GitHub: Story = {
  args: {
    isLoading: false,
    onClick: () => console.log("GitHub sign in"),
    provider: githubProvider,
  },
};

export const Twitch: Story = {
  args: {
    isLoading: false,
    onClick: () => console.log("Twitch sign in"),
    provider: twitchProvider,
  },
};

export const LoadingGoogle: Story = {
  args: {
    isLoading: true,
    onClick: () => {},
    provider: googleProvider,
  },
};

export const LoadingGitHub: Story = {
  args: {
    isLoading: true,
    onClick: () => {},
    provider: githubProvider,
  },
};

export const LoadingTwitch: Story = {
  args: {
    isLoading: true,
    onClick: () => {},
    provider: twitchProvider,
  },
};

export const AllProviders: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <OAuthButton
        isLoading={false}
        onClick={() => console.log("Google")}
        provider={googleProvider}
      />
      <OAuthButton
        isLoading={false}
        onClick={() => console.log("GitHub")}
        provider={githubProvider}
      />
      <OAuthButton
        isLoading={false}
        onClick={() => console.log("Twitch")}
        provider={twitchProvider}
      />
    </div>
  ),
};

export const LoginForm: Story = {
  render: () => (
    <div className="w-96 space-y-4 rounded-lg border p-6">
      <div className="space-y-2 text-center">
        <h2 className="font-bold text-2xl">Welcome Back</h2>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>
      <div className="space-y-3">
        <OAuthButton
          isLoading={false}
          onClick={() => console.log("Google")}
          provider={googleProvider}
        />
        <OAuthButton
          isLoading={false}
          onClick={() => console.log("GitHub")}
          provider={githubProvider}
        />
        <OAuthButton
          isLoading={false}
          onClick={() => console.log("Twitch")}
          provider={twitchProvider}
        />
      </div>
    </div>
  ),
};
