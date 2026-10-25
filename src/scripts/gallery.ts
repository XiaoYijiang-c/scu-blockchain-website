import { animate } from "motion";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelectorAll<HTMLElement>("[data-gallery]").forEach((gallery) => {
  if (gallery.dataset.initialized) return;
  gallery.dataset.initialized = "true";
  const track = gallery.querySelector<HTMLElement>(".gallery-track");
  const cards = [
    ...gallery.querySelectorAll<HTMLElement>("[data-gallery-card]"),
  ];
  const count = gallery.querySelector<HTMLOutputElement>(
    "[data-gallery-count]",
  );
  const progress = gallery.querySelector<HTMLElement>(
    "[data-gallery-progress]",
  );
  const previous = gallery.querySelector<HTMLButtonElement>(
    "[data-gallery-prev]",
  );
  const next = gallery.querySelector<HTMLButtonElement>("[data-gallery-next]");
  if (!track || !cards.length) return;

  let frame = 0;
  let activeIndex = 0;
  let previousIndex: number | null = null;
  let selectedIndex: number | null = 0;
  const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const cardLeft = (card: HTMLElement) =>
    card.getBoundingClientRect().left -
    track.getBoundingClientRect().left +
    track.scrollLeft;
  const scrollTo = (left: number) =>
    track.scrollTo({
      left,
      behavior: reducedMotion.matches ? "instant" : "smooth",
    });
  const update = () => {
    frame = 0;
    const max = maxScroll();
    const left = Math.max(0, track.scrollLeft);
    activeIndex =
      selectedIndex ??
      (left <= 2
        ? 0
        : left >= max - 2 && max > 0
          ? cards.length - 1
          : cards.reduce(
              (closest, card, index) =>
                Math.abs(cardLeft(card) - left) <
                Math.abs(cardLeft(cards[closest]) - left)
                  ? index
                  : closest,
              0,
            ));
    const value = `${String(activeIndex + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
    if (count && count.value !== value) count.value = value;
    if (progress)
      progress.style.transform = `scaleX(${(activeIndex + 1) / cards.length})`;
    cards.forEach((card, index) => {
      card.dataset.active = String(index === activeIndex);
    });
    if (
      previousIndex !== null &&
      activeIndex !== previousIndex &&
      !reducedMotion.matches
    ) {
      animate(
        cards[activeIndex],
        { opacity: [0.72, 1], x: [20, 0], rotate: [2.5, 0], scale: [0.98, 1] },
        { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
      );
    }
    previousIndex = activeIndex;
    if (previous) previous.disabled = activeIndex === 0;
    if (next) next.disabled = activeIndex === cards.length - 1;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const select = (index: number) => {
    selectedIndex = Math.max(0, Math.min(cards.length - 1, index));
    update();
    scrollTo(
      Math.max(0, Math.min(maxScroll(), cardLeft(cards[selectedIndex]))),
    );
  };
  const step = (direction: number) => select(activeIndex + direction);
  previous?.addEventListener("click", () => step(-1));
  next?.addEventListener("click", () => step(1));
  track.addEventListener("keydown", (event) => {
    if (
      event.target !== track ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") select(0);
    else if (event.key === "End") select(cards.length - 1);
    else step(event.key === "ArrowLeft" ? -1 : 1);
  });

  // Keep the vertical mouse wheel on the document. Touch swipes remain native.
  track.addEventListener("scroll", schedule, { passive: true });
  track.addEventListener(
    "wheel",
    () => {
      selectedIndex = null;
    },
    { passive: true },
  );
  const observer = new ResizeObserver(schedule);
  observer.observe(track);
  cards.forEach((card) => observer.observe(card));
  update();
});
