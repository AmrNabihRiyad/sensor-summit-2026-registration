/**
 * Centralized Configuration for Sensors Summit 2026
 * All editable event details, partner data, fee schedules, and endpoints.
 * Any unconfirmed detail is strictly designated as "TBA".
 */

export const EVENT = Object.freeze({
  name: "Sensors Summit 2026",
  theme: "Digital Twin in Biosensing Applications",
  organizer: "IEEE Sensors Council Egypt Chapter",
  host: "The British University in Egypt (BUE)",
  location: "El Sherouk City, Cairo Governorate, Egypt",
  mapUrl: "https://maps.app.goo.gl/BhbY8ptNSHnDszbR6",
  dates: {
    day1: {
      date: "November 12, 2026",
      title: "Summit Talks & Keynotes",
      time: "9:00 AM (Cairo Time)"
    },
    day2: {
      date: "November 14, 2026",
      title: "Hands-on Workshop",
      time: "TBA"
    }
  },
  // November 12, 2026, 09:00:00 Cairo time (UTC+2)
  targetTimestampMs: new Date("2026-11-12T09:00:00+02:00").getTime(),
  contact: {
    name: "Eng. Amr Nabih",
    email: "Amr_Nabih@ieee.org",
    phone: "+20 121 255 1698",
    phoneHref: "tel:+201212551698",
    emailHref: "mailto:Amr_Nabih@ieee.org"
  }
});

export const FEES = Object.freeze({
  baseAmount: 200,
  transportAmount: 100,
  currency: "EGP"
});

let _instapayLink = "https://ipn.eg/S/nabih.amr/instapay/3wOugn";

export const PAYMENT = {
  methods: ["InstaPay", "Mobile Wallet"],
  walletNumber: "01018689048",
  accountName: "Amr Nabih h",
  instapayHandle: "nabih.amr@instapay",
  get instapayLink() {
    return _instapayLink;
  },
  set instapayLink(val) {
    _instapayLink = val;
    if (typeof window !== "undefined" && typeof window.syncPaymentInstapayBtn === "function") {
      window.syncPaymentInstapayBtn();
    }
  }
};

export const API_CONFIG = Object.freeze({
  endpointUrl: "https://script.google.com/macros/s/AKfycbw_Emn4j9U2d_DJHxqp7TT1vMHXdQDFEVBoRNAAdW4OWrTEIVL3OedkwV-DauFb23tFQQ/exec"
});

export const SOCIAL_LINKS = Object.freeze([
  {
    name: "Email",
    url: "mailto:egypt-sensorcouncil@ieee.org",
    ariaLabel: "Email IEEE Sensors Council Egypt Chapter"
  },
  {
    name: "YouTube",
    url: "https://youtube.com/@ieeesensorscouncilegyptchapter?si=zNRtidcjJWh7_-bp",
    ariaLabel: "YouTube Channel"
  },
  {
    name: "WhatsApp",
    url: "https://whatsapp.com/channel/0029Vb1iNb7HwXb6x98p8d0p",
    ariaLabel: "WhatsApp Channel"
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/ieee-sensors-council-egypt-chapter/",
    ariaLabel: "LinkedIn Page"
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/sensorscouncilegypt?igsh=bWQ0ZDljeG1nZnlj",
    ariaLabel: "Instagram Profile"
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/share/1DX3SxsE77/",
    ariaLabel: "Facebook Page"
  },
  {
    name: "Official Website",
    url: "https://r8.ieee.org/egypt-sensor-council/",
    ariaLabel: "Official Website"
  }
]);
