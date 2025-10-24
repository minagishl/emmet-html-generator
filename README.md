# Emmet HTML Generator

A simple web tool to quickly generate HTML from Emmet abbreviations.

## Overview

This single-page application expands Emmet shorthand into formatted HTML in real time. Enter an abbreviation such as `ul>li.item$*3` to generate a full list structure, copy the markup, or preview the rendered output instantly in an embedded iframe.

## Features

- Real-time Emmet expansion with formatted HTML output powered by the official [emmet](https://www.npmjs.com/package/emmet) package
- Supports full Emmet syntax including IDs, classes, attributes, text nodes, grouping, siblings (`+`), nesting (`>`), climb-up (`^`), multipliers (`*`), and numeric placeholders (`$`)
- One-click copy button for the generated markup
- Secure iframe sandbox for live HTML preview
- Quick example shortcuts to explore common Emmet patterns

## Getting Started

```bash
pnpm install
pnpm run dev
```

Open the printed local URL (usually <http://localhost:5173>) in your browser to access the tool.

## Supported Emmet Syntax

This tool uses the official [emmet](https://www.npmjs.com/package/emmet) package, which supports the complete Emmet syntax:

- Element names and implicit `div` elements (e.g., `.class`, `#id`)
- Class (`.`) and ID (`#`) shortcuts
- Attributes (`[type="email"]`, etc.)
- Text nodes (`{Hello}`)
- Child (`>`), sibling (`+`), and climb-up (`^`) operators
- Grouping with parentheses (`(...)`)
- Multipliers (`*3`) with numeric substitution (`$`) and zero padding (`$$`)
- Custom multiplier start indexes (`@-`, `@+`, etc.)

For more details, refer to the [Emmet documentation](https://docs.emmet.io/abbreviations/syntax/)

## Available Scripts

- `pnpm run dev` – start the development server
- `pnpm run build` – create a production build
- `pnpm run preview` – preview the production build locally

## License

This project is licensed under the [MIT License](./LICENSE).
