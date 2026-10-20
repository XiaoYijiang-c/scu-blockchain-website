import { animate, inView } from "motion";

const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
let dispose = () => {};

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
