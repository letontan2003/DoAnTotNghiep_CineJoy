import { ConfigAPI } from '@babel/core';

export default function (api: ConfigAPI) {
  api.cache.forever();
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            assets: "./assets",
            components: "./components",
            screens: "./screens",
            services: "./services",
            types: "./types",
            utils: "./utils",
            constants: "./constants",
            hooks: "./hooks",
            context: "./context",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
}
