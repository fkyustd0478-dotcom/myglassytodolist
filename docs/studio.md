# Studio

Last updated: 2026-05-01

## Purpose

Studio is a local image editor. It lets users upload an image, crop it, build collages, apply FX, add text/stickers, and export PNG output.

## Files

- `studio.html`: markup and controls.
- `css/lapis_studio.css`: Studio-specific layout and drawer animation.
- `js/lapis_studio_ui.js`: Vue state and user flow.
- `js/fx/lapis_fx_base.js`: shared canvas helpers and download.
- `js/fx/lapis_fx_collage.js`: collage layouts/rendering.
- `js/fx/lapis_fx_shatter.js`: glass effects.
- `js/fx/lapis_fx_jigsaw.js`: jigsaw effects.
- `js/fx/lapis_fx_text.js`: text overlay.
- `js/fx/lapis_fx_sticker.js`: stickers.

## Flow

1. User chooses or drops an image.
2. `LapisStudioEngine.load()` creates a browser image resource.
3. Crop/collage/FX actions render to canvas.
4. The result is stored in Vue state as a URL/data URL.
5. Download uses `LapisStudioEngine.triggerRealDownload()`.

## Collage

`LapisFXCollage` owns layout definitions and `createFromLayout()`.

Implemented visual quality options include spacing, padding, background, rounded corners, shadows, and presets such as minimal, instagram, and polaroid.

## FX

Glass FX:

- impact
- spiderweb
- fractured

Jigsaw FX:

- static
- explode
- drift
- gravity
- scattered

Recent improvements add depth, shadow, and light/reflection rendering while keeping the FX engine structure intact.

## Export

Output is PNG. Existing fallback mechanisms are preserved by the FX base download helper.

## Limitations

- No server-side image processing.
- Browser memory limits apply.
- Auth does not affect export.
- Very large images may be slow on mobile devices.

