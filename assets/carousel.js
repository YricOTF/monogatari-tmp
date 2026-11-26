(() => {
  const frame = document.querySelector('.campus-carousel-frame');
  const image = frame.querySelector('.campus-carousel-image');
  const slides = [
    ['https://hbrbapp.hubeidaily.net/3e315c2dacbc468ca81c06c55bd921ec.jpg', '武大外校交流活动中，学生体验传统文化'],
    ['https://hbrbapp.hubeidaily.net/873f5426d7fd4bc2985276d3dcb45546.jpg', '武大外校交流活动中，学生制作漆扇'],
    ['https://hbrbapp.hubeidaily.net/1cffdcf33651465e8517dd7b7f9075e5.jpg', '武大外校交流活动中的校园生活']
  ];
  let index = 0;
  let timer;
  function show(next) {
    index = (next + slides.length) % slides.length;
    image.src = slides[index][0];
    image.alt = slides[index][1];
  }
  function start() {
    clearInterval(timer);
    if (!document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => show(index + 1), 6000);
  }
  frame.querySelector('.campus-prev').addEventListener('click', () => { show(index - 1); start(); });
  frame.querySelector('.campus-next').addEventListener('click', () => { show(index + 1); start(); });
  frame.addEventListener('mouseenter', () => clearInterval(timer));
  frame.addEventListener('mouseleave', start);
  document.addEventListener('visibilitychange', start);
  start();
})();
