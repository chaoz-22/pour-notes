#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TARGET_DIR="$ROOT_DIR/miniprogram_npm"
OCR_NPM_DIR="$ROOT_DIR/ocr/miniprogram_npm"
OCR_BUNDLE="$TARGET_DIR/@paddle-js-models/ocr/index.js"
WEBGL_BUNDLE="$TARGET_DIR/@paddlejs/paddlejs-backend-webgl/index.js"

if [ ! -d "$TARGET_DIR" ]; then
  echo "miniprogram_npm not found; run Build npm in WeChat DevTools first"
  exit 1
fi

if [ ! -f "$OCR_BUNDLE" ]; then
  echo "Paddle OCR bundle not found in miniprogram_npm"
  exit 1
fi

# The npm OCR package embeds a browser-only OpenCV build that calls the native
# WebAssembly global. WeChat exposes WXWebAssembly instead. Replace the 1.3MB
# embedded implementation with PaddleOCR's official mini-program OpenCV build.
perl -0pi -e 's/var opencv_ocr=createCommonjsModule\(.*?(?=var DBPostprocess =)/var opencv_ocr = global;\n\nfunction flatten(arr) {\n  return arr.toString().split(\x27,\x27).map(function (item) { return +item; });\n}\nfunction _int(num) {\n  return num > 0 ? Math.floor(num) : Math.ceil(num);\n}\nfunction clip(data, min, max) {\n  return data < min ? min : data > max ? max : data;\n}\n\n/s' "$OCR_BUNDLE"

if ! grep -q "var opencv_ocr = global;" "$OCR_BUNDLE"; then
  echo "failed to replace browser OpenCV with the WeChat runtime"
  exit 1
fi

# WeChat canvas images expose width/height, while browser images usually expose
# naturalWidth/naturalHeight. Support both forms throughout the OCR pipeline.
perl -0pi -e 's/image\.naturalWidth/(image.naturalWidth || image.width)/g; s/image\.naturalHeight/(image.naturalHeight || image.height)/g;' "$OCR_BUNDLE"

# The model package creates two hidden DOM canvases as soon as it is imported.
# AppService has no `document`; use WeChat offscreen 2D canvases instead and
# remove the browser-only styling/append step.
perl -0pi -e 's/var canvas_det = document\.createElement\(\x27canvas\x27\);\nvar canvas_rec = document\.createElement\(\x27canvas\x27\);/var canvas_det = wx.createOffscreenCanvas({ type: \x272d\x27, width: 1, height: 1 });\nvar canvas_rec = wx.createOffscreenCanvas({ type: \x272d\x27, width: 1, height: 1 });/; s/function initCanvas\(canvas\) \{\n  canvas\.style\.position = \x27fixed\x27;\n  canvas\.style\.bottom = \x270\x27;\n  canvas\.style\.zIndex = \x27-1\x27;\n  canvas\.style\.opacity = \x270\x27;\n  document\.body\.appendChild\(canvas\);\n\}/function initCanvas(canvas) {\n  return canvas;\n}/;' "$OCR_BUNDLE"

if grep -q "document.createElement('canvas')" "$OCR_BUNDLE"; then
  echo "failed to replace Paddle OCR DOM canvases"
  exit 1
fi

# The upstream browser bundle imports Node built-ins even though they are only
# referenced inside an unreachable Node.js branch. WeChat resolves every
# top-level require on a real device, so replace those three unused imports
# with empty browser stubs instead of shipping large Node polyfills.
perl -0pi -e 's/var path = require\(\x27path\x27\);/var path = {};/; s/var fs = require\(\x27fs\x27\);/var fs = {};/; s/var crypto\$1 = require\(\x27crypto\x27\);/var crypto\$1 = {};/;' "$OCR_BUNDLE"

# OpenCV's generated UMD footer assigns to an undeclared global `Module`.
# WeChat AppService runs modules in strict mode, where that assignment throws.
# Pass a local configuration object directly instead.
perl -0pi -e 's/if\(typeof Module===\x27undefined\x27\)Module=\{\};return cv\(Module\);/return cv({});/' "$OCR_BUNDLE"

# WeChat's builder also leaves the browser-safe dependencies as bare package
# names. Unlike Node.js, the real-device loader resolves those names relative
# to the current file, so point them at the generated modules explicitly.
perl -0pi -e 's/require\(\x27\@paddlejs\/paddlejs-core\x27\)/require(\x27..\/..\/\@paddlejs\/paddlejs-core\/index.js\x27)/; s/require\(\x27\@paddlejs\/paddlejs-backend-webgl\x27\)/require(\x27..\/..\/\@paddlejs\/paddlejs-backend-webgl\/index.js\x27)/; s/require\(\x27js-clipper\x27\)/require(\x27..\/..\/js-clipper\/index.js\x27)/; s/require\(\x27number-precision\x27\)/require(\x27..\/..\/number-precision\/index.js\x27)/; s/require\(\x27d3-polygon\x27\)/require(\x27..\/..\/d3-polygon\/index.js\x27)/;' "$OCR_BUNDLE"

if grep -Eq "require\('(path|fs|crypto|js-clipper|number-precision|d3-polygon|@paddlejs/paddlejs-core|@paddlejs/paddlejs-backend-webgl)'\)|typeof Module==='undefined'|no native wasm support detected" "$OCR_BUNDLE"; then
  echo "failed to rewrite Paddle OCR external imports"
  exit 1
fi

# WeChat's offscreen canvas supports WebGL1 for this plugin path. Probing
# `webgl2` first works as a browser fallback, but DevTools records the rejected
# probe as a red MiniProgramError even though OCR succeeds. Select WebGL1
# directly so simulator logs reflect real failures only.
if [ -f "$WEBGL_BUNDLE" ]; then
  perl -0pi -e 's/var e=n\.getContext\("webgl2",this\.WEBGL_ATTRIBUTES\);return e\?f\.set\("webglVersion",2\):\(f\.set\("webglVersion",1\),e=n\.getContext\("webgl",this\.WEBGL_ATTRIBUTES\)\|\|n\.getContext\("experimental-webgl",this\.WEBGL_ATTRIBUTES\)\),e/f.set("webglVersion",1);var e=n.getContext("webgl",this.WEBGL_ATTRIBUTES)||n.getContext("experimental-webgl",this.WEBGL_ATTRIBUTES);return e/' "$WEBGL_BUNDLE"
  if grep -q 'getContext("webgl2"' "$WEBGL_BUNDLE"; then
    echo "failed to disable the unsupported WebGL2 probe"
    exit 1
  fi

  # WebGL texture-unit enums are contiguous. Use TEXTURE0 + index instead of
  # dynamic TEXTURE<n> property lookup: iOS MagicBrush does not reliably expose
  # those generated properties and may recurse inside activeTexture(undefined).
  perl -0pi -e 's/r\.activeTexture\(r\["TEXTURE"\+n\]\)/r.activeTexture(r.TEXTURE0+n)/g' "$WEBGL_BUNDLE"
  if grep -q 'activeTexture(r\["TEXTURE"+n\])' "$WEBGL_BUNDLE"; then
    echo "failed to normalize WebGL texture-unit lookup"
    exit 1
  fi
fi

find "$TARGET_DIR" -type f -name '*.map' -delete
if [ -d "$OCR_NPM_DIR" ]; then
  find "$OCR_NPM_DIR" -depth -delete
fi
mkdir -p "$ROOT_DIR/ocr"
mv "$TARGET_DIR" "$OCR_NPM_DIR"
echo "prepared Paddle OCR browser bundle and moved it into the OCR subpackage"
