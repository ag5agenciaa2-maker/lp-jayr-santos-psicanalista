/* ============================================================
   Jayr Santos Psicanalista — script.js (Vanilla ES6)
   ============================================================ */
(function () {
  'use strict';

  /* ⚠️ CONFIRMAR número oficial antes de publicar.
     Dossiê traz três números divergentes — usando o do contrato. */
  var WHATSAPP = '5521991028333';
  var waBase = 'https://wa.me/' + WHATSAPP;

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------- Ano no rodapé ---------- */
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ---------- Links WhatsApp Contextuais e Genéricos ---------- */
    Array.prototype.forEach.call(document.querySelectorAll('.js-wa'), function (a) {
      var customMsg = a.getAttribute('data-wa-text');
      var msgText = customMsg ? customMsg : 'Olá, vim através do site e gostaria de uma informação.';
      a.setAttribute('href', waBase + '?text=' + encodeURIComponent(msgText));
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });

    /* ---------- Menu mobile (Drawer Premium) ---------- */
    var burger = document.querySelector('[data-burger]');
    var drawer = document.getElementById('mobileDrawer');
    var overlay = document.getElementById('drawerOverlay');
    var closeBtn = document.getElementById('drawerClose');

    function setDrawer(open) {
      if (!drawer) return;
      drawer.classList.toggle('is-open', open);
      if (overlay) overlay.classList.toggle('is-open', open);
      if (burger) {
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (overlay) overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    if (burger && drawer) {
      burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('is-open')); });
      if (overlay) {
        overlay.addEventListener('click', function () { setDrawer(false); });
      }
      if (closeBtn) {
        closeBtn.addEventListener('click', function () { setDrawer(false); });
      }
      Array.prototype.forEach.call(drawer.querySelectorAll('a'), function (a) {
        a.addEventListener('click', function () { setDrawer(false); });
      });
    }

    /* ---------- Reveal on scroll ---------- */
    var revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
      // Failsafe: if IO never fires (some embedded/preview contexts), reveal everything
      // without relying on the transition progressing.
      setTimeout(function () {
        Array.prototype.forEach.call(revealEls, function (el) {
          if (!el.classList.contains('is-visible')) { el.style.transition = 'none'; el.classList.add('is-visible'); }
        });
      }, 1400);
    } else {
      Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('is-visible'); });
    }

    /* ---------- Depoimentos (carrossel minimalista) ---------- */
    var stage = document.getElementById('depoStage');
    var counter = document.getElementById('depoCounter');
    var prevBtn = document.getElementById('depoPrev');
    var nextBtn = document.getElementById('depoNext');

    if (stage) {
      var slides = stage.querySelectorAll('.t-slide');
      var total = slides.length;
      var current = 0;
      var timer = null;

      var updateCounter = function (index) {
        if (counter) {
          var currentNum = (index + 1).toString().padStart(2, '0');
          var totalNum = total.toString().padStart(2, '0');
          counter.innerHTML = 
            '<span class="depo__counter-current">' + currentNum + '</span>' +
            '<span class="depo__counter-sep">/</span>' +
            '<span class="depo__counter-total">' + totalNum + '</span>';
        }
      };

      var go = function (index) {
        current = (index + total) % total;
        
        slides.forEach(function (s, i) {
          s.classList.toggle('is-active', i === current);
        });
        
        updateCounter(current);
      };

      var next = function () { go(current + 1); };
      var prev = function () { go(current - 1); };

      var start = function () { stop(); timer = setInterval(next, 6000); };
      var stop = function () { if (timer) clearInterval(timer); };

      if (nextBtn) nextBtn.addEventListener('click', function () { next(); start(); });
      if (prevBtn) prevBtn.addEventListener('click', function () { prev(); start(); });

      // Suporte a swipe de toque (mobile)
      var touchStartX = 0;
      var touchEndX = 0;

      stage.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].screenX;
        stop();
      }, { passive: true });

      stage.addEventListener('touchend', function (e) {
        touchEndX = e.changedTouches[0].screenX;
        var diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            next();
          } else {
            prev();
          }
        }
        start();
      }, { passive: true });

      var depo = document.getElementById('depoimentos');
      if (depo) {
        depo.addEventListener('mouseenter', stop);
        depo.addEventListener('mouseleave', start);
      }
      
      // Inicializa o contador e inicia a rolagem
      updateCounter(0);
      start();
    }

    /* ---------- FAQ accordion ---------- */
    var faqList = document.getElementById('faqList');
    if (faqList) {
      var items = faqList.querySelectorAll('.faq__item');
      
      // Ajusta o max-height inicial do item aberto
      var firstOpenAns = faqList.querySelector('.faq__item.is-open .faq__a');
      if (firstOpenAns) {
        firstOpenAns.style.maxHeight = firstOpenAns.scrollHeight + 'px';
      }

      Array.prototype.forEach.call(items, function (item) {
        var btn = item.querySelector('.faq__q');
        var ans = item.querySelector('.faq__a');

        btn.addEventListener('click', function () {
          var isOpen = item.classList.contains('is-open');
          
          // fecha todos
          Array.prototype.forEach.call(items, function (it) {
            it.classList.remove('is-open');
            it.querySelector('.faq__a').style.maxHeight = '0px';
            it.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
          });

          if (!isOpen) {
            item.classList.add('is-open');
            ans.style.maxHeight = ans.scrollHeight + 'px';
            btn.setAttribute('aria-expanded', 'true');
          }
        });
      });
    }

    /* ---------- Formulário (validação + WhatsApp) ---------- */
    var form = document.getElementById('contactForm');
    var formOk = document.getElementById('formOk');
    var okWaLink = document.getElementById('okWaLink');

    function setError(name, msg) {
      var small = form.querySelector('[data-err="' + name + '"]');
      var field = small ? small.closest('.field') : null;
      if (small) small.textContent = msg || '';
      if (field) field.classList.toggle('has-error', !!msg);
    }

    if (form) {
      // limpa erro ao digitar/mudar
      Array.prototype.forEach.call(form.querySelectorAll('input, textarea, select'), function (el) {
        el.addEventListener('input', function () { setError(el.name, ''); });
        el.addEventListener('change', function () { setError(el.name, ''); });
      });

      // Máscara inteligente para o telefone (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
      var telInput = form.querySelector('[name="telefone"]');
      if (telInput) {
        telInput.addEventListener('input', function (e) {
          var val = e.target.value.replace(/\D/g, '');
          if (val.length > 11) val = val.substring(0, 11);
          var formatado = '';
          if (val.length > 0) {
            formatado = '(' + val.substring(0, 2);
            if (val.length > 2) {
              formatado += ') ';
              if (val.length > 6) {
                if (val.length === 11) {
                  // celular (11 dígitos): (XX) XXXXX-XXXX
                  formatado += val.substring(2, 7) + '-' + val.substring(7, 11);
                } else {
                  // fixo ou preenchimento parcial (10 dígitos): (XX) XXXX-XXXX
                  formatado += val.substring(2, 6) + '-' + val.substring(6, 10);
                }
              } else {
                formatado += val.substring(2);
              }
            }
          }
          e.target.value = formatado;
        });
      }

      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var nome = form.nome.value.trim();
        var email = form.email.value.trim();
        var telefone = form.telefone.value.trim();
        var assunto = form.assunto.value;
        var mensagem = form.mensagem.value.trim();
        var ok = true;

        setError('nome', ''); setError('email', ''); setError('telefone', ''); setError('assunto', ''); setError('mensagem', '');

        if (nome.length < 2) { setError('nome', 'Por favor, informe seu nome.'); ok = false; }

        var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!email) { setError('email', 'Por favor, informe seu e-mail.'); ok = false; }
        else if (!isEmail) { setError('email', 'Digite um e-mail válido.'); ok = false; }

        var digits = telefone.replace(/\D/g, '');
        if (!telefone) { setError('telefone', 'Por favor, informe seu telefone.'); ok = false; }
        else if (digits.length < 10) { setError('telefone', 'Digite um telefone válido com DDD.'); ok = false; }

        if (!assunto) { setError('assunto', 'Selecione um assunto de interesse.'); ok = false; }

        if (mensagem.length < 5) { setError('mensagem', 'Por favor, detalhe sua mensagem.'); ok = false; }

        if (!ok) return;

        // Estrutura obrigatória da mensagem de WhatsApp AG5
        var msg = 'Olá, me chamo ' + nome + ', vim através do site e gostaria de uma informação.\n\n' +
                  '- E-mail: ' + email + '\n' +
                  '- Telefone: ' + telefone + '\n' +
                  '- Assunto: ' + assunto + '\n' +
                  '- Mensagem: ' + mensagem;
        var link = waBase + '?text=' + encodeURIComponent(msg);

        if (okWaLink) okWaLink.setAttribute('href', link);
        form.hidden = true;
        if (formOk) formOk.hidden = false;
        try { window.open(link, '_blank', 'noopener'); } catch (e) {}
      });
    }

    /* ---------- WhatsApp (balão simples) ---------- */
    function initWaBubble() {
      var bubble = document.getElementById('wa-bubble');
      var closeBtn = document.getElementById('wa-close-btn');
      var mainBtn = document.getElementById('wa-main-btn');
      var shown = false;

      if (!bubble) return;

      // Mostrar o balão após 8 segundos, apenas uma vez
      setTimeout(function () {
        if (!shown) {
          bubble.classList.add('show');
          shown = true;
        }
      }, 8000);

      // Fechar balão
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.preventDefault();
          bubble.classList.remove('show');
        });
      }

      // Ao clicar no botão, esconder balão
      if (mainBtn) {
        mainBtn.addEventListener('click', function () {
          bubble.classList.remove('show');
        });
      }
    }

    /* ---------- Carrossel Sobre o Profissional (Galeria com Miniaturas) ---------- */
    function initSobreCarousel() {
      var sobreCounter = document.getElementById('sobreCounter');
      var sobreTrack = document.getElementById('sobreTrack');
      var sobreCaption = document.getElementById('sobreCaption');
      var sobreProgress = document.getElementById('sobreProgress');
      var sobreThumbsWrap = document.getElementById('sobreThumbs');
      if (!sobreTrack || !sobreThumbsWrap) return;

      var sobreSlides = sobreTrack.querySelectorAll('.sobre__carousel-slide');
      var sobreThumbs = sobreThumbsWrap.querySelectorAll('.sobre__thumb-item');
      var sobreCurrent = 0;
      var sobreTimer = null;
      var slideDuration = 6000;

      var resetProgressBar = function () {
        if (!sobreProgress) return;
        sobreProgress.style.transition = 'none';
        sobreProgress.style.width = '0%';
        void sobreProgress.offsetWidth;
        sobreProgress.style.transition = 'width ' + slideDuration + 'ms linear';
        sobreProgress.style.width = '100%';
      };

      var updateSobreCarousel = function (index) {
        sobreCurrent = (index + sobreSlides.length) % sobreSlides.length;
        if (sobreCaption) sobreCaption.style.opacity = '0';
        setTimeout(function () {
          sobreSlides.forEach(function (slide, i) {
            var isActive = i === sobreCurrent;
            slide.classList.toggle('is-active', isActive);
            if (isActive && sobreCaption) {
              var cap = slide.getAttribute('data-caption');
              sobreCaption.textContent = cap;
              sobreCaption.style.opacity = '1';
            }
          });
          sobreThumbs.forEach(function (thumb, i) {
            thumb.classList.toggle('is-active', i === sobreCurrent);
          });
          if (sobreCounter) sobreCounter.textContent = '0' + (sobreCurrent + 1) + ' / 0' + sobreSlides.length;
        }, 150);
        if (sobreTimer) {
          resetProgressBar();
        }
      };

      var startSobreAuto = function () {
        stopSobreAuto();
        resetProgressBar();
        sobreTimer = setInterval(function () {
          updateSobreCarousel(sobreCurrent + 1);
        }, slideDuration);
      };

      var stopSobreAuto = function () {
        if (sobreTimer) {
          clearInterval(sobreTimer);
          sobreTimer = null;
        }
        if (sobreProgress) {
          sobreProgress.style.transition = 'none';
          sobreProgress.style.width = '0%';
        }
      };

      sobreThumbs.forEach(function (thumb, idx) {
        thumb.addEventListener('click', function () {
          stopSobreAuto();
          updateSobreCarousel(idx);
        });
      });

      startSobreAuto();
    }

    /* ---------- Scroll Parallax na Hero (Estilo Capa de Revista) ---------- */
    function initHeroParallax() {
      var heroImg = document.querySelector('.hero__portrait img');
      if (!heroImg) return;

      var ticking = false;

      window.addEventListener('scroll', function () {
        if (window.innerWidth < 980) return;

        if (!ticking) {
          window.requestAnimationFrame(function () {
            var scrollY = window.pageYOffset || document.documentElement.scrollTop;
            var translateVal = scrollY * 0.22; // 22% de velocidade de scroll
            if (scrollY < window.innerHeight) {
              heroImg.style.setProperty('--hero-translate', translateVal + 'px');
            }
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    /* ---------- Navbar Dinâmica no Scroll (Ilha Flutuante Premium) ---------- */
    function initNavbarScroll() {
      var nav = document.querySelector('.nav');
      if (!nav) return;

      var ticking = false;

      var updateNavbar = function () {
        var scrollY = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollY > 50) {
          nav.classList.add('is-scrolled');
        } else {
          nav.classList.remove('is-scrolled');
        }
      };

      window.addEventListener('scroll', function () {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            updateNavbar();
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });

      updateNavbar();
    }

    initWaBubble();
    initSobreCarousel();
    initHeroParallax();
    initNavbarScroll();

  });
})();
