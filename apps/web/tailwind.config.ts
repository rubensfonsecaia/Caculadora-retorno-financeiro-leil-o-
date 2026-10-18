import type { Config } from "tailwindcss";
// Tema 100% de tokens (replica/design). Rode `python3 replica/design/build_tokens.py`
// depois de mudar replica/design/tokens.json.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tokens = require("../../replica/design/tailwind.tokens.js");

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    ...tokens,
    colors: { ...tokens.colors, transparent: "transparent", current: "currentColor" },
    maxWidth: { ...tokens.maxWidth, full: "100%", none: "none" },
  },
  plugins: [],
} satisfies Config;
