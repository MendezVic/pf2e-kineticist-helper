<script lang="ts">
  import { MODULE_ID } from '@/constants';

  // Art lives once in assets/ and ships once as a served file (modules/<id>/assets/…) — the
  // same path scene/tile content uses. We reference it, never import it: in the lib build an
  // import would inline a *second* copy into dist/<id>.js. The title is fetched and inlined
  // (rather than shown via <img>) only so its shapes stay in the DOM for CSS to animate
  // .rune-reveal — still the one served file, no bundled copy.
  const assets = `modules/${MODULE_ID}/assets`;
  const goblinSliceUrl = `${assets}/runegoblin-slice-small.webp`;
  const titleSvg = fetch(`${assets}/runegoblin-title.svg`).then((r) => r.text());

  // Source dimensions of the goblin webp — lets the badge size itself so the parent
  // layout never needs to know the image's aspect ratio.
  const IMG_W = 332;
  const IMG_H = 128;
</script>

<a
  class="runegoblin-badge"
  href="https://runegoblin.com"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Rune Goblin"
  style:--img-aspect={`${IMG_W} / ${IMG_H}`}
>
  <div class="goblin-clip">
    <img src={goblinSliceUrl} alt="" class="goblin-img" />
  </div>
  <div class="rune-overlay">
    {#await titleSvg then markup}
      <!-- Safe: a first-party SVG served by the module, fetched then inlined, never user input. -->
      {@html markup}
    {/await}
  </div>
</a>

<style>
  .runegoblin-badge {
    /* The label overhangs the image to the right by this amount; the badge's own width
       includes that overhang so its bounding box matches its visible footprint. */
    --rune-overhang: 156px;
    --badge-height: 64px;
    --label-height: 48px;

    position: relative;
    flex-shrink: 0;
    height: var(--badge-height);
    width: calc(var(--badge-height) * var(--img-aspect) + var(--rune-overhang));
    line-height: 0;
    isolation: isolate;
    display: block;
    cursor: pointer;
    text-decoration: none;
  }
  /* Clip only vertically so his ear can extend past the left edge on hover while top and
     bottom stay flush to the badge height; the title overhang rides above any bleed. */
  .goblin-clip {
    position: absolute;
    inset: 0 auto 0 0;
    height: 100%;
    width: calc(var(--badge-height) * var(--img-aspect));
    clip-path: inset(0 -100% 0 -100%);
  }
  .goblin-img {
    height: 100%;
    width: auto;
    display: block;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
    user-select: none;
    transform-origin: center center;
    transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .runegoblin-badge:hover .goblin-img,
  .runegoblin-badge:focus-visible .goblin-img {
    transform: scale(1.12);
  }
  .rune-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    pointer-events: none;
  }
  .rune-overlay :global(svg) {
    height: var(--label-height);
    width: auto;
    display: block;
    overflow: visible;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.75));
  }
  /* The orange fill sits clipped offscreen below the text until hover slides it up. */
  .rune-overlay :global(.rune-reveal) {
    transition: y 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .runegoblin-badge:hover .rune-overlay :global(.rune-reveal) {
    y: -30px;
  }
</style>
