#!/usr/bin/env python3
"""Gera tokens.css e tailwind.tokens.js a partir de tokens.json.

    python3 replica/design/build_tokens.py

Rode de novo depois de qualquer mudança em tokens.json (inclusive a do
/replica-brand). Nunca edite os arquivos gerados à mão.
"""

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def css_vars(colors, indent="  "):
    return "\n".join("%s--color-%s: %s;" % (indent, k, v) for k, v in colors.items())


def build_css(t):
    out = ["/* Gerado por build_tokens.py a partir de tokens.json. Não edite. */", ":root {",
           "  color-scheme: light;", css_vars(t["color"])]
    for i, c in enumerate(t["chart"]["series"], 1):
        out.append("  --chart-%d: %s;" % (i, c))
    out.append("  --chart-neutral: %s;" % t["chart"]["neutral"])
    out.append("  --font-sans: %s;" % t["font"]["sans"])
    out.append("  --font-mono: %s;" % t["font"]["mono"])
    for k, v in t["type"].items():
        out.append("  --text-%s: %dpx;" % (k, v["size"]))
        out.append("  --leading-%s: %dpx;" % (k, v["line"]))
        out.append("  --weight-%s: %d;" % (k, v["weight"]))
    for i, v in enumerate(t["space"]):
        out.append("  --space-%d: %dpx;" % (i, v))
    for k, v in t["radius"].items():
        out.append("  --radius-%s: %dpx;" % (k, v))
    for k, v in t["shadow"].items():
        out.append("  --shadow-%s: %s;" % (k, v))
    for k, v in t["motion"].items():
        out.append("  --motion-%s: %s;" % (k, v))
    lay = t["layout"]
    for k in ("content_max", "header_height", "mobile_result_bar", "mobile_tab_bar",
              "input_height", "touch_target_min"):
        out.append("  --layout-%s: %dpx;" % (k.replace("_", "-"), lay[k]))
    out.append("}")

    def dark_body(indent):
        lines = [indent + "color-scheme: dark;", css_vars(t["color_dark"], indent)]
        for i, c in enumerate(t["chart"]["series_dark"], 1):
            lines.append("%s--chart-%d: %s;" % (indent, i, c))
        lines.append("%s--chart-neutral: %s;" % (indent, t["chart"]["neutral_dark"]))
        return "\n".join(lines)

    out += [
        "@media (prefers-color-scheme: dark) {",
        "  :root:not([data-theme=\"light\"]) {",
        dark_body("    "),
        "  }",
        "}",
        ":root[data-theme=\"dark\"] {",
        dark_body("  "),
        "}",
    ]
    return "\n".join(out) + "\n"


def build_tailwind(t):
    colors = {k: "var(--color-%s)" % k for k in t["color"]}
    colors["chart"] = {str(i): "var(--chart-%d)" % i for i in range(1, len(t["chart"]["series"]) + 1)}
    colors["chart"]["neutral"] = "var(--chart-neutral)"
    theme = {
        "colors": colors,
        "fontFamily": {"sans": ["var(--font-sans)"], "mono": ["var(--font-mono)"]},
        "fontSize": {k: ["%dpx" % v["size"], {"lineHeight": "%dpx" % v["line"], "fontWeight": str(v["weight"])}]
                     for k, v in t["type"].items()},
        "spacing": {str(i): "%dpx" % v for i, v in enumerate(t["space"])},
        "borderRadius": {("DEFAULT" if k == "md" else k): "var(--radius-%s)" % k for k in t["radius"]},
        "boxShadow": {k: "var(--shadow-%s)" % k for k in t["shadow"]},
        "screens": {k: "%dpx" % v for k, v in t["layout"]["breakpoints"].items()},
        "maxWidth": {"content": "var(--layout-content-max)"},
        "transitionDuration": {"fast": "120ms", "DEFAULT": "200ms"},
    }
    return ("// Gerado por build_tokens.py a partir de tokens.json. Não edite.\n"
            "// Uso: tailwind.config.ts -> theme: require('./tailwind.tokens.js')\n"
            "// Substitui (não estende) as cores: componentes só usam papéis (bg-surface, text-muted).\n"
            "module.exports = " + json.dumps(theme, indent=2, ensure_ascii=False) + ";\n")


def main():
    with open(os.path.join(HERE, "tokens.json"), encoding="utf-8") as f:
        t = json.load(f)
    with open(os.path.join(HERE, "tokens.css"), "w", encoding="utf-8") as f:
        f.write(build_css(t))
    with open(os.path.join(HERE, "tailwind.tokens.js"), "w", encoding="utf-8") as f:
        f.write(build_tailwind(t))
    print("ok: tokens.css, tailwind.tokens.js")


if __name__ == "__main__":
    main()
