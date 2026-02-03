import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OAuthButton } from "@/components/oauth-button";
import type { AuthProvider } from "@/lib/data/auth-providers";

const meta = {
  title: "Business Components/OAuthButton",
  component: OAuthButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onClick: { action: "clicked" },
  },
} satisfies Meta<typeof OAuthButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const googleProvider: AuthProvider = {
  provider: "google",
  label: "Google",
};

const githubProvider: AuthProvider = {
  provider: "github",
  label: "GitHub",
};

const twitchProvider: AuthProvider = {
  provider: "twitch",
  label: "Twitch",
};

export const Google: Story = {
  args: {
    provider: googleProvider,
    isLoading: false,
    onClick: () => console.log("Google sign in"),
  },
};

export const GitHub: Story = {
  args: {
    provider: githubProvider,
    isLoading: false,
    onClick: () => console.log("GitHub sign in"),
  },
};

export const Twitch: Story = {
  args: {
    provider: twitchProvider,
    isLoading: false,
    onClick: () => console.log("Twitch sign in"),
  },
};

export const LoadingGoogle: Story = {
  args: {
    provider: googleProvider,
    isLoading: true,
    onClick: () => {},
  },
};

export const LoadingGitHub: Story = {
  args: {
    provider: githubProvider,
    isLoading: true,
    onClick: () => {},
  },
};

export const LoadingTwitch: Story = {
  args: {
    provider: twitchProvider,
    isLoading: true,
    onClick: () => {},
  },
};

export const AllProviders: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-80">
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
        <h2 className="text-2xl font-bold">Welcome Back</h2>
        <p className="text-muted-foreground text-sm">
          Sign in to your account
        </p>
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
