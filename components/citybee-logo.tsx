
/**
 * Official CityBee logo mark (SVG bee-pin, from the Flutter app's assets).
 * The wordmark is rendered natively in Outfit 800 with the brand colors
 * (orange "City" + ink "Bee") — same as the Flutter BrandMark.
 */

/** Bee-pin SVG mark — plain <img> (no client JS, SSR-safe). */
export function CityBeeMark({ size = 32 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/citybee-mark.svg"
      alt="CityBee logo"
      width={size}
      height={size}
      style={{ display: 'inline-block' }}
    />
  );
}

/** Full lockup: SVG mark + Outfit wordmark. */
export function CityBeeLogo({
  markSize = 30,
  wordmarkSize = 19,
}: {
  markSize?: number;
  wordmarkSize?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <CityBeeMark size={markSize} />
      <span
        className="font-headline font-extrabold tracking-tight text-ink"
        style={{ fontSize: wordmarkSize, lineHeight: 1.1 }}
      >
        City<span className="text-brand">Bee</span>
      </span>
    </span>
  );
}
