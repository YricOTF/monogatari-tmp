(function(){
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var nav = document.getElementById("nav");
  function onScroll(){ nav.classList.toggle("solid", window.scrollY > 16); }
  onScroll();
  window.addEventListener("scroll", onScroll, {passive:true});

  var burger = document.getElementById("burger");
  var drawer = document.getElementById("drawer");
  var mobile = window.matchMedia("(max-width: 940px)");
  function setDrawerOpen(open){
    drawer.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("drawer-open", open);
  }
  burger.addEventListener("click", function(){
    setDrawerOpen(burger.getAttribute("aria-expanded") === "false");
  });
  drawer.addEventListener("click", function(e){
    if (e.target.closest("a")) setDrawerOpen(false);
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
      setDrawerOpen(false);
      burger.focus();
    }
  });
  mobile.addEventListener("change", function(e){
    if (!e.matches) setDrawerOpen(false);
  });

  document.querySelectorAll(".work:not([data-state=\"empty\"])").forEach(function(btn){
    var body = document.getElementById(btn.getAttribute("aria-controls"));
    if (!body) return;
    btn.addEventListener("click", function(){
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      body.classList.toggle("open", !open);
      btn.querySelector(".badge").textContent = open ? "阅读" : "收起";
    });
  });

  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function(list){
      list.forEach(function(en){
        if (en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, {threshold:0.12, rootMargin:"0px 0px -6% 0px"});
    document.documentElement.classList.add("reveal-ready");
    document.querySelectorAll(".rv").forEach(function(el){ io.observe(el); });
  }
})();
