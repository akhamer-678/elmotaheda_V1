//التحميل اول مرة
window.addEventListener("load", function () {
  const loader = document.getElementById("preloader");

  setTimeout(() => {
    loader.style.opacity = "0";

    setTimeout(() => {
      loader.classList.remove("active");
    }, 500);
  }, 500);
});

//التحميل بين الصفحات
const loader = document.getElementById("preloader");

document.querySelectorAll("a").forEach((link) => {
  const href = link.getAttribute("href");

  if (
    href &&
    !href.startsWith("#") &&
    link.hostname === window.location.hostname
  ) {
    link.addEventListener("click", () => {
      loader.classList.add("active");
    });
  }
});
