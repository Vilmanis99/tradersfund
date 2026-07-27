import { ImageResponse } from 'next/og'

/**
 * Square brand logo served at /logo.png.
 *
 * Exists because `organizationSchema()` needs a `logo` URL and Google's
 * structured-data spec accepts only BMP/GIF/JPEG/PNG/WebP/SVG — an .ico
 * (what this used to point at) is silently ignored, which loses the
 * knowledge-panel logo. Requirements met here: raster PNG, square,
 * well above the 112x112 minimum, crawlable (not blocked by robots.txt).
 *
 * The mark is the same gradient tile + arrow used in app/opengraph-image.tsx —
 * keep the two in sync if the brand changes.
 */
export const contentType = 'image/png'

const SIZE = 512

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f0f12',
        }}
      >
        <div
          style={{
            width: 400,
            height: 400,
            borderRadius: 88,
            background: 'linear-gradient(135deg, #27a17b, #2dd4bf)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 240,
            fontWeight: 900,
            color: '#ffffff',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          ↗
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE },
  )
}
