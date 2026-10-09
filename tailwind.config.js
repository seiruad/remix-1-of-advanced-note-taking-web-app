/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        primary: 'hsl(var(--primary) / <alpha-value>)',
        'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
        destructive: 'hsl(var(--destructive) / <alpha-value>)',
        overlay: 'hsl(var(--overlay) / <alpha-value>)',
        'note-background': 'hsl(var(--note-background) / <alpha-value>)',
        'note-surface': 'hsl(var(--note-surface) / <alpha-value>)',
        'note-border': 'hsl(var(--note-border) / <alpha-value>)',
        'note-muted': 'hsl(var(--note-muted) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
