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
  let drag: { id: number; x: number; scroll: number; moved: boolean } | null =
    null;
  let suppressClick = false;
  let activeIndex = 0;
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

  // Native touch scrolling remains in charge on phones; mouse dragging starts
  // only after a threshold, preserving ordinary profile-button clicks.
  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") selectedIndex = null;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    suppressClick = false;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      scroll: track.scrollLeft,
      moved: false,
    };
  });
  track.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientX - drag.x;
    if (!drag.moved && Math.abs(distance) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      selectedIndex = null;
      track.setPointerCapture(event.pointerId);
      track.classList.add("is-dragging");
    }
    track.scrollLeft = drag.scroll - distance;
  });
  const finishDrag = () => {
    if (!drag) return;
    const { moved, id } = drag;
    drag = null;
    suppressClick = moved;
    if (track.hasPointerCapture(id)) track.releasePointerCapture(id);
    track.classList.remove("is-dragging");
    if (moved) {
      const left = track.scrollLeft;
      const stops = [
        0,
        ...cards.map(cardLeft).filter((position) => position < maxScroll()),
        maxScroll(),
      ];
      scrollTo(
        stops.reduce(
          (best, stop) =>
            Math.abs(stop - left) < Math.abs(best - left) ? stop : best,
          0,
        ),
      );
    }
  };
  track.addEventListener("pointerup", finishDrag);
  track.addEventListener("pointercancel", finishDrag);
  track.addEventListener("lostpointercapture", finishDrag);
  window.addEventListener("pointerup", finishDrag);
  window.addEventListener("blur", finishDrag);
  track.addEventListener(
    "click",
    (event) => {
      if (!suppressClick || event.detail === 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
    },
    true,
  );
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
