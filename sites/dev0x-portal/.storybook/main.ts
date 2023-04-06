import type { StorybookConfig } from '@storybook/react-vite';
const config: StorybookConfig = {
    stories: [
        '../stories/**/*.mdx',
        '../stories/**/*.stories.@(js|jsx|ts|tsx)',
        '../app/components/**/*.stories.@(js|jsx|ts|tsx)',
    ],
    addons: [
        '@storybook/addon-links',
        {
            name: '@storybook/addon-essentials',
            options: {
                backgrounds: false,
            },
        },
        '@storybook/addon-interactions',
        // {
        //   name: "@storybook/addon-postcss",
        //   options: {
        //     postcssLoaderOptions: {
        //       implementation: require("postcss"),
        //     },
        //   },
        // },
        // 'storybook-addon-pseudo-states',
    ],
    framework: {
        name: '@storybook/react-vite',
        options: {},
    },
    docs: {
        autodocs: 'tag',
    },
    staticDirs: ['../public'],
    viteFinal: (config) => {
        config.resolve = {
            ...(config.resolve || {}),
            alias: {
                ...(config.resolve?.alias || {}),
                '@remix-run/react': require.resolve('./__mocks__/@remix-run/react.ts'),
                /** @TODO Workaround as rollup doesn't find the exports */
                'zippo-interface': require.resolve('./__mocks__/zippo-interface.ts'),
            },
        };
        return config;
    },
};
export default config;
