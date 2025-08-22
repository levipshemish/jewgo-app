import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: async (config) => {
    // Add path aliases
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
      '@components': path.resolve(__dirname, '../components'),
      '@lib': path.resolve(__dirname, '../lib'),
      '@utils': path.resolve(__dirname, '../utils'),
      '@types': path.resolve(__dirname, '../types'),
      '@hooks': path.resolve(__dirname, '../hooks'),
      '@validators': path.resolve(__dirname, '../validators'),
      '@filters': path.resolve(__dirname, '../filters')
    };
    
    return config;
  },
};

export default config;
