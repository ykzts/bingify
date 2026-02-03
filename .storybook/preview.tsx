import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <div lang={context.globals.locale}>
        <Story />
      </div>
    ),
    withThemeByClassName({
      defaultTheme: "light",
      themes: {
        dark: "dark",
        light: "",
      },
    }),
  ],
  globalTypes: {
    locale: {
      defaultValue: "en",
      description: "Internationalization locale",
      name: "Locale",
      toolbar: {
        icon: "globe",
        items: [
          { title: "English", value: "en" },
          { title: "日本語", value: "ja" },
        ],
        showName: true,
      },
    },
  },
  parameters: {
    backgrounds: {
      disable: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
