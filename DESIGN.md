---
name: Ember Page
description: Quiet archival tools with readable article snapshots.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.50 0 0)"
  border: "oklch(0.922 0 0)"
  destructive: "oklch(0.50 0.20 27.325)"
typography:
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  article:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "18px"
    lineHeight: 1.8
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
rounded:
  control: "0.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    padding: "9px 15px"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "9px 15px"
---

# Ember Page design

## Overview

**Creative North Star: "Quiet archival workspace"**

A neutral shadcn theme, with the restraint of Notion and Vercel. The interface recedes so saved articles are easy to read.

**Key Characteristics:**

- Clear type hierarchy.
- Subtle dividers and restrained controls.
- Optional tools stay behind Options or Tools.

## Colors

Use the semantic tokens in `public/theme.css`. Foreground and primary provide emphasis; muted surfaces group controls. Destructive marks errors. Follow the operating system’s light or dark appearance. Keep the supplied flame logo unchanged.

## Typography

Self-hosted Geist serves headings, labels, and articles. Geist Mono is for code. Article content uses the shadcn Typeset stylesheet, with readable spacing and underlined links. Document titles are 36px; dashboard titles are 32px. Small screens use 28px titles.

## Layout

The popup is 380px wide. Article pages use an 826px container with 48px horizontal padding; the dashboard uses 1040px with 40px padding. Narrow screens reduce padding to 24px and 20px respectively. Wide tables and code scroll within their own area; images fit the article.

## Elevation & Depth

Dividers and muted surfaces provide grouping. Selected popup tabs have a subtle shadow. Options use an opaque, bordered panel. There is no decorative motion.

## Shapes

Controls use gently rounded corners. The shared radius is 0.5rem; dashboard controls subtract 2px. Lists use separators rather than individual cards.

## Components

Primary buttons carry the main action. Secondary and text buttons support optional actions. Search fields use a thin input border. Archive and Community form the popup navigation; Tools contains dashboard views and diagnostics. Keyboard focus uses a visible two-pixel ring with a three-pixel offset.

## Do's and Don'ts

- Do keep capture, sharing, ratings, and serving explicit.
- Do use shared theme tokens and preserve readable article content.
- Don't add decorative cards, gradients, or extra actions to the main screen.
- Don't download article bodies in the metadata-only dashboard.
