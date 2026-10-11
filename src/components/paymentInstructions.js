import { PAYMENT } from "../config.js";

/**
 * Payment Instructions Component
 * Manages the dynamic payment values, fee synchronization, clipboard copy behavior,
 * and external InstaPay deep linking.
 */

function selectElementText(element) {
  if (!element) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

async function copyValue({ text, targetElement, button, announceEl }) {
  let success = false;

  // 1. Primary: navigator.clipboard.writeText
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      success = true;
    } catch {
      success = false;
    }
  }

  // 2. Fallback: hidden textarea + document.execCommand("copy")
  if (!success) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      success = document.execCommand("copy");
      document.body.removeChild(textarea);
    } catch {
      success = false;
    }
  }

  const labelSpan = button.querySelector(".copy-btn-text");
  const copyIcon = button.querySelector(".copy-icon");
  const checkIcon = button.querySelector(".check-icon");

  if (success) {
    if (labelSpan) labelSpan.textContent = "Copied";
    button.classList.add("is-copied");
    if (copyIcon) copyIcon.classList.add("hidden");
    if (checkIcon) checkIcon.classList.remove("hidden");

    if (announceEl) {
      announceEl.textContent = "";
      queueMicrotask(() => {
        announceEl.textContent = "Copied";
      });
    }

    if (button._revertTimer) {
      clearTimeout(button._revertTimer);
    }

    button._revertTimer = setTimeout(() => {
      if (labelSpan) labelSpan.textContent = "Copy";
      button.classList.remove("is-copied");
      if (copyIcon) copyIcon.classList.remove("hidden");
      if (checkIcon) checkIcon.classList.add("hidden");
      button._revertTimer = null;
    }, 2000);
  } else {
    // If fallback fails, select the text and show "Press Ctrl+C to copy"
    selectElementText(targetElement);
    if (labelSpan) labelSpan.textContent = "Press Ctrl+C to copy";
    button.classList.add("is-fallback");

    if (button._revertTimer) {
      clearTimeout(button._revertTimer);
    }

    button._revertTimer = setTimeout(() => {
      if (labelSpan) labelSpan.textContent = "Copy";
      button.classList.remove("is-fallback");
      button._revertTimer = null;
    }, 4000);
  }
}

export function syncPaymentInstapayBtn() {
  const instapayBtn = document.querySelector("#paymentInstapayBtn");
  if (!instapayBtn) return;

  const link = PAYMENT.instapayLink ? PAYMENT.instapayLink.trim() : "";
  if (link) {
    instapayBtn.href = link;
    instapayBtn.classList.remove("hidden");
    instapayBtn.removeAttribute("hidden");
    instapayBtn.style.display = "";
  } else {
    instapayBtn.href = "";
    instapayBtn.classList.add("hidden");
    instapayBtn.setAttribute("hidden", "");
    instapayBtn.style.display = "none";
  }
}

export function syncPaymentAmount() {
  const totalFeeEl = document.querySelector("#totalFee");
  const amountEl = document.querySelector("#paymentInstructionsAmount");
  if (totalFeeEl && amountEl) {
    const text = totalFeeEl.textContent.trim();
    if (text) {
      amountEl.textContent = text;
    }
  }
}

export function initPaymentInstructions() {
  // Expose hooks for browser verification and reactivity
  if (typeof window !== "undefined") {
    window.PAYMENT = PAYMENT;
    window.syncPaymentInstapayBtn = syncPaymentInstapayBtn;
    window.syncPaymentAmount = syncPaymentAmount;
  }

  // Populate static string values using textContent (never innerHTML)
  const walletNumberEl = document.querySelector("#paymentWalletNumber");
  const accountNameEl = document.querySelector("#paymentAccountName");
  const instapayHandleEl = document.querySelector("#paymentInstapayHandle");

  if (walletNumberEl) walletNumberEl.textContent = PAYMENT.walletNumber;
  if (accountNameEl) accountNameEl.textContent = PAYMENT.accountName;
  if (instapayHandleEl) instapayHandleEl.textContent = PAYMENT.instapayHandle;

  // Pay via InstaPay button setup
  syncPaymentInstapayBtn();

  // Initial sync of amount from fee calculator
  syncPaymentAmount();

  // Dynamic fee syncing without duplicating logic:
  // 1. Listen to transport changes
  document.querySelectorAll('input[name="transport"]').forEach((input) => {
    input.addEventListener("change", () => {
      queueMicrotask(syncPaymentAmount);
    });
  });

  // 2. Listen to form reset
  const form = document.querySelector("#registrationForm");
  if (form) {
    form.addEventListener("reset", () => {
      queueMicrotask(syncPaymentAmount);
    });
  }

  // 3. Observe totalFee element mutations
  const totalFeeEl = document.querySelector("#totalFee");
  if (totalFeeEl && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      syncPaymentAmount();
    });
    observer.observe(totalFeeEl, { childList: true, characterData: true, subtree: true });
  }

  // Copy Buttons
  const announceEl = document.querySelector("#paymentCopyStatus");

  const copyWalletBtn = document.querySelector("#copyWalletNumberBtn");
  if (copyWalletBtn && walletNumberEl) {
    copyWalletBtn.addEventListener("click", () => {
      copyValue({
        text: PAYMENT.walletNumber,
        targetElement: walletNumberEl,
        button: copyWalletBtn,
        announceEl
      });
    });
  }

  const copyHandleBtn = document.querySelector("#copyInstapayHandleBtn");
  if (copyHandleBtn && instapayHandleEl) {
    copyHandleBtn.addEventListener("click", () => {
      copyValue({
        text: PAYMENT.instapayHandle,
        targetElement: instapayHandleEl,
        button: copyHandleBtn,
        announceEl
      });
    });
  }
}
