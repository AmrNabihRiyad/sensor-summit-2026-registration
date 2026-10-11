/**
 * Navigation Component: Sticky nav interactions and mobile menu toggle
 */

export function initNav() {
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector("#primaryNavigation") || document.querySelector(".nav-links");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isExpanded));
      menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation menu" : "Close navigation menu");
      navLinks.classList.toggle("open", !isExpanded);
    });

    // Close when clicking a nav link
    navLinks.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation menu");
        navLinks.classList.remove("open");
      }
    });
  }
}
