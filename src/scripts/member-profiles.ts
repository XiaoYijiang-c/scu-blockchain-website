// Native dialog supplies modal semantics, focus containment and Escape handling
// without a second React island or an additional overlay dependency.
document
  .querySelectorAll<HTMLDialogElement>(".member-dialog")
  .forEach((dialog) => {
    let opener: HTMLButtonElement | null = null;
    const triggers = document.querySelectorAll<HTMLButtonElement>(
      `[data-profile-open="${dialog.id}"]`,
    );
    triggers.forEach((trigger) =>
      trigger.addEventListener("click", () => {
        opener = trigger;
        dialog.showModal();
        dialog.scrollTop = 0;
        document.documentElement.classList.add("profile-open");
        dialog.querySelector<HTMLElement>(".profile-content")?.scrollTo(0, 0);
      }),
    );
    dialog
      .querySelector("[data-profile-close]")
      ?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.documentElement.classList.remove("profile-open");
      opener?.focus({ preventScroll: true });
    });
  });
