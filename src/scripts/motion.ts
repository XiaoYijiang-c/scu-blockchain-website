import { animate, inView } from "motion";

const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
let dispose = () => {};

function setupPointerTilt() {
  const active = new Map<HTMLElement, { x: number; y: number; rx: number; ry: number }>();
  const getTarget = (event: Event) =>
    event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-pointer-tilt]")
      : null;
  const setTilt = (element: HTMLElement, x: number, y: number) => {
    element.style.setProperty("--pointer-tilt-x", `${x}deg`);
    element.style.setProperty("--pointer-tilt-y", `${y}deg`);
  };
  const onMove = (event: PointerEvent) => {
    const element = getTarget(event);
    if (!element || event.pointerType !== "mouse") return;
    const drag = active.get(element);
    if (drag) {
      setTilt(element, drag.rx - (event.clientY - drag.y) * 0.38, drag.ry + (event.clientX - drag.x) * 0.48);
      return;
    }
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    const scale = element.dataset.pointerTilt === "badge" ? 18 : 7;
    setTilt(element, -y * scale, x * scale);
  };
  const onLeave = (event: PointerEvent) => {
    const element = getTarget(event);
    if (element && !element.contains(event.relatedTarget as Node | null)) {
      element.style.removeProperty("--pointer-tilt-x");
      element.style.removeProperty("--pointer-tilt-y");
    }
  };
  const onDown = (event: PointerEvent) => {
    const element = getTarget(event);
    if (!element || element.dataset.pointerTilt !== "badge" || event.button !== 0) return;
    active.set(element, {
      x: event.clientX,
      y: event.clientY,
      rx: Number.parseFloat(element.style.getPropertyValue("--pointer-tilt-x")) || 7,
      ry: Number.parseFloat(element.style.getPropertyValue("--pointer-tilt-y")) || -18,
    });
    element.classList.add("is-dragging");
    element.setPointerCapture(event.pointerId);
  };
  const onUp = () => {
    active.forEach((_, element) => element.classList.remove("is-dragging"));
    active.clear();
  };
  const onKey = (event: KeyboardEvent) => {
    const element = getTarget(event);
    if (!element || element.dataset.pointerTilt !== "badge") return;
    const step = event.shiftKey ? 10 : 4;
    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const currentX = Number.parseFloat(element.style.getPropertyValue("--pointer-tilt-x")) || 7;
    const currentY = Number.parseFloat(element.style.getPropertyValue("--pointer-tilt-y")) || -18;
    setTilt(element, currentX + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0), currentY + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0));
  };
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerover", onMove, { passive: true });
  document.addEventListener("pointerout", onLeave, { passive: true });
  document.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  document.addEventListener("keydown", onKey);
  return () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerover", onMove);
    document.removeEventListener("pointerout", onLeave);
    document.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    document.removeEventListener("keydown", onKey);
  };
}

const disposePointerTilt = setupPointerTilt();
window.addEventListener("pagehide", disposePointerTilt, { once: true });

function setupMotion() {
  dispose();
  if (preference.matches) return;

  const cleanups: (() => void)[] = [];
  const animated = new Set<HTMLElement>();
  const animations: ReturnType<typeof animate>[] = [];
  const reveal = (element: HTMLElement, delay = 0) => {
    animated.add(element);
    animations.push(
      animate(
        element,
        { opacity: [0, 1], y: [18, 0] },
        {
          duration: 0.65,
          delay,
          ease: [0.22, 1, 0.36, 1],
        },
      ),
    );
  };

  document
    .querySelectorAll<HTMLElement>("[data-reveal]")
    .forEach((element, index) => reveal(element, index * 0.07));
  document
    .querySelectorAll<HTMLElement>("main section:not(.hero)")
    .forEach((section) => {
      cleanups.push(
        inView(
          section,
          () => {
            section
              .querySelectorAll<HTMLElement>(
                ".section-kicker, .section-title, .section-intro, .info-card, .roadmap-item, .partner-panel, .alliance-panel, .archive-type, .resource-card, .join-card",
              )
              .forEach((element, index) =>
                reveal(element, Math.min(index * 0.055, 0.3)),
              );
          },
          { margin: "0px 0px -40px 0px" },
        ),
      );
    });

  const hero = document.querySelector<HTMLElement>(".hero");
  if (hero) {
    let frame = 0;
    const updateHero = () => {
      frame = 0;
      const bounds = hero.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -bounds.top / bounds.height));
      hero.style.setProperty("--exit-opacity", String(1 - progress * 0.55));
      hero.style.setProperty("--exit-y", `${-progress * 36}px`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateHero);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateHero();
    cleanups.push(() => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      hero.style.removeProperty("--exit-opacity");
      hero.style.removeProperty("--exit-y");
    });
  }

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document
      .querySelectorAll<HTMLElement>(".info-card, .partner-panel, .join-card")
      .forEach((card) => {
        let frame = 0;
        const move = (event: PointerEvent) => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const bounds = card.getBoundingClientRect();
            card.style.setProperty(
              "--pointer-x",
              `${event.clientX - bounds.left}px`,
            );
            card.style.setProperty(
              "--pointer-y",
              `${event.clientY - bounds.top}px`,
            );
          });
        };
        card.addEventListener("pointermove", move, { passive: true });
        cleanups.push(() => {
          cancelAnimationFrame(frame);
          card.removeEventListener("pointermove", move);
        });
      });
  }

  dispose = () => {
    cleanups.forEach((cleanup) => cleanup());
    animations.forEach((animation) => animation.stop());
    animated.forEach((element) => {
      element.style.removeProperty("opacity");
      element.style.removeProperty("transform");
    });
  };
}
setupMotion();
preference.addEventListener("change", setupMotion);
// CSS animations also stop while the tab is hidden.
const syncVisibility = () =>
  document.documentElement.classList.toggle("page-hidden", document.hidden);
document.addEventListener("visibilitychange", syncVisibility);
syncVisibility();
