// Gerado por build_tokens.py a partir de tokens.json. Não edite.
// Uso: tailwind.config.ts -> theme: require('./tailwind.tokens.js')
// Substitui (não estende) as cores: componentes só usam papéis (bg-surface, text-muted).
module.exports = {
  "colors": {
    "bg": "var(--color-bg)",
    "surface": "var(--color-surface)",
    "surface-muted": "var(--color-surface-muted)",
    "surface-inverse": "var(--color-surface-inverse)",
    "border": "var(--color-border)",
    "border-input": "var(--color-border-input)",
    "text": "var(--color-text)",
    "text-muted": "var(--color-text-muted)",
    "text-subtle": "var(--color-text-subtle)",
    "on-inverse": "var(--color-on-inverse)",
    "on-inverse-muted": "var(--color-on-inverse-muted)",
    "accent": "var(--color-accent)",
    "accent-hover": "var(--color-accent-hover)",
    "accent-soft": "var(--color-accent-soft)",
    "on-accent": "var(--color-on-accent)",
    "focus": "var(--color-focus)",
    "success": "var(--color-success)",
    "success-soft": "var(--color-success-soft)",
    "success-on-inverse": "var(--color-success-on-inverse)",
    "danger": "var(--color-danger)",
    "danger-soft": "var(--color-danger-soft)",
    "danger-on-inverse": "var(--color-danger-on-inverse)",
    "warning": "var(--color-warning)",
    "warning-soft": "var(--color-warning-soft)",
    "warning-on-inverse": "var(--color-warning-on-inverse)",
    "chart": {
      "1": "var(--chart-1)",
      "2": "var(--chart-2)",
      "3": "var(--chart-3)",
      "4": "var(--chart-4)",
      "5": "var(--chart-5)",
      "neutral": "var(--chart-neutral)"
    }
  },
  "fontFamily": {
    "sans": [
      "var(--font-sans)"
    ],
    "mono": [
      "var(--font-mono)"
    ]
  },
  "fontSize": {
    "label": [
      "12px",
      {
        "lineHeight": "16px",
        "fontWeight": "700"
      }
    ],
    "xs": [
      "12px",
      {
        "lineHeight": "16px",
        "fontWeight": "500"
      }
    ],
    "sm": [
      "14px",
      {
        "lineHeight": "20px",
        "fontWeight": "400"
      }
    ],
    "base": [
      "16px",
      {
        "lineHeight": "24px",
        "fontWeight": "400"
      }
    ],
    "lg": [
      "18px",
      {
        "lineHeight": "28px",
        "fontWeight": "700"
      }
    ],
    "xl": [
      "20px",
      {
        "lineHeight": "28px",
        "fontWeight": "800"
      }
    ],
    "2xl": [
      "24px",
      {
        "lineHeight": "32px",
        "fontWeight": "900"
      }
    ],
    "3xl": [
      "30px",
      {
        "lineHeight": "36px",
        "fontWeight": "900"
      }
    ],
    "4xl": [
      "36px",
      {
        "lineHeight": "40px",
        "fontWeight": "900"
      }
    ]
  },
  "spacing": {
    "0": "0px",
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "32px",
    "8": "40px",
    "9": "48px"
  },
  "borderRadius": {
    "sm": "var(--radius-sm)",
    "DEFAULT": "var(--radius-md)",
    "lg": "var(--radius-lg)",
    "xl": "var(--radius-xl)",
    "2xl": "var(--radius-2xl)",
    "pill": "var(--radius-pill)"
  },
  "boxShadow": {
    "card": "var(--shadow-card)",
    "raised": "var(--shadow-raised)",
    "inner": "var(--shadow-inner)"
  },
  "screens": {
    "sm": "640px",
    "md": "768px",
    "lg": "1024px",
    "xl": "1280px"
  },
  "maxWidth": {
    "content": "var(--layout-content-max)"
  },
  "transitionDuration": {
    "fast": "120ms",
    "DEFAULT": "200ms"
  }
};
