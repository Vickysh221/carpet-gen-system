import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
      },
      boxShadow: {
        panel: "0 24px 80px rgba(60, 44, 24, 0.12)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(124, 92, 62, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 92, 62, 0.12) 1px, transparent 1px)",
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        serif: ["'Cormorant Garamond'", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
