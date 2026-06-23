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

    /* ---------- Depoimentos (carrossel fade) ---------- */
    var testimonials = [
      { name: 'Rosiléa Chaves', when: 'há 1 mês', text: 'Excelente profissional! Tem feito um trabalho maravilhoso com casais! Super indico!' },
      { name: 'Gerson Dione', when: 'há 1 mês', text: 'Muito bom, profissional dedicado e muito bem capacitado.' },
      { name: 'Rosilene Barbosa', when: 'há 1 mês', text: 'Um excelente profissional, comprometido e ético.' },
      { name: 'Thiago Ferreira Mendes', when: 'há 1 mês', text: 'Excelente profissional, me ajudou muito.' },
      { name: 'Rosane Chaves', when: 'há 1 mês', text: 'Excelente profissional, super indico!!' },
      { name: 'Celene Rodrigues', when: 'há 1 mês', text: 'Excelente profissional!' },
      { name: 'Franklin Augusto', when: 'há 1 mês', text: 'Ótimo profissional, super indico.' },
      { name: 'Roseli Chaves', when: 'há 1 mês', text: 'Ótimo profissional!' },
      { name: 'Leticia Chaves', when: 'há 1 mês', text: 'Excelente profissional.' },
      { name: 'Juliana Chaves Barbosa', when: 'há 1 mês', text: 'Ótimo profissional. Recomendo!' }
    ];
    var stage = document.getElementById('depoStage');
    var dotsWrap = document.getElementById('depoDots');
    var current = 0, timer = null;

    if (stage && dotsWrap) {
      testimonials.forEach(function (t, i) {
        var slide = document.createElement('div');
        slide.className = 't-slide' + (i === 0 ? ' is-active' : '');
        slide.innerHTML =
          '<span class="stars">★★★★★</span>' +
          '<blockquote>“' + t.text + '”</blockquote>' +
          '<cite><strong>' + t.name + '</strong><span>' + t.when + '</span></cite>';
        stage.appendChild(slide);

        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = i === 0 ? 'is-active' : '';
        dot.setAttribute('aria-label', 'Ver depoimento ' + (i + 1));
        dot.addEventListener('click', function () { go(i); });
        dotsWrap.appendChild(dot);
      });

      var slides = stage.querySelectorAll('.t-slide');
      var dots = dotsWrap.querySelectorAll('button');

      var go = function (n) {
        current = (n + testimonials.length) % testimonials.length;
        slides.forEach(function (s, i) { s.classList.toggle('is-active', i === current); });
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === current); });
      };
      var next = function () { go(current + 1); };
      var prev = function () { go(current - 1); };

      var start = function () { stop(); timer = setInterval(next, 5500); };
      var stop = function () { if (timer) clearInterval(timer); };

      var nextBtn = document.getElementById('depoNext');
      var prevBtn = document.getElementById('depoPrev');
      if (nextBtn) nextBtn.addEventListener('click', function () { next(); start(); });
      if (prevBtn) prevBtn.addEventListener('click', function () { prev(); start(); });

      var depo = document.getElementById('depoimentos');
      depo.addEventListener('mouseenter', stop);
      depo.addEventListener('mouseleave', start);
      start();
    }

    /* ---------- FAQ accordion ---------- */
    var faqs = [
      { q: 'Qual a diferença entre psicanálise e terapia?', a: 'A psicanálise é um método que investiga o inconsciente a partir da fala livre. Diferente de abordagens focadas apenas no comportamento ou em soluções rápidas, ela busca a raiz dos conflitos — o que se repete, o que angustia e o que ainda não foi posto em palavras — promovendo uma transformação mais profunda e duradoura.' },
      { q: 'Como funciona uma sessão?', a: 'Você fala livremente sobre o que vier à mente — pensamentos, sentimentos, memórias, sonhos — enquanto eu escuto de forma atenta e sem julgamentos. A partir dessa escuta, construímos juntos sentidos para aquilo que incomoda. As sessões costumam ter frequência semanal.' },
      { q: 'O atendimento é presencial ou online?', a: 'Ambos. Atendo presencialmente no West Offices, em Campo Grande – RJ, e também online por vídeo, com o mesmo cuidado e sigilo. Você escolhe o formato que for mais confortável e viável para a sua rotina.' },
      { q: 'Tudo o que eu falar é sigiloso?', a: 'Sim, integralmente. O sigilo é um pilar ético do trabalho psicanalítico: tudo o que é dito em sessão permanece estritamente entre nós. É essa garantia que torna possível falar com liberdade.' },
      { q: 'Como é a primeira sessão?', a: 'A primeira conversa é um encontro sem compromisso de continuidade. É o momento de você me contar o que o traz, esclarecer dúvidas e sentir se há sintonia. A partir daí, combinamos juntos como seguir.' }
    ];
    var faqList = document.getElementById('faqList');
    if (faqList) {
      faqs.forEach(function (f, i) {
        var item = document.createElement('div');
        item.className = 'faq__item' + (i === 0 ? ' is-open' : '');
        item.innerHTML =
          '<button class="faq__q" type="button" aria-expanded="' + (i === 0) + '">' +
            '<span>' + f.q + '</span><span class="faq__icon">+</span>' +
          '</button>' +
          '<div class="faq__a"><p>' + f.a + '</p></div>';
        faqList.appendChild(item);

        var btn = item.querySelector('.faq__q');
        var ans = item.querySelector('.faq__a');
        if (i === 0) ans.style.maxHeight = ans.scrollHeight + 'px';

        btn.addEventListener('click', function () {
          var isOpen = item.classList.contains('is-open');
          // fecha todos
          Array.prototype.forEach.call(faqList.querySelectorAll('.faq__item'), function (it) {
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

    /* ---------- WhatsApp Premium (Balão + Notificação) ---------- */
    function initWaPremium() {
      var bubble = document.getElementById('wa-message-bubble');
      var typing = document.getElementById('wa-typing');
      var realMessage = document.getElementById('wa-real-message');
      var badge = document.getElementById('wa-notification');
      var closeBtn = document.getElementById('wa-close-btn');
      var mainBtn = document.getElementById('wa-main-btn');

      if (!bubble) return;

      // 1. Mostrar o balão após 6 segundos
      setTimeout(function () {
        bubble.classList.add('show');
        
        // 2. Simular digitação por 2.5 segundos antes de mostrar a mensagem
        setTimeout(function () {
          if (typing) typing.style.display = 'none';
          if (realMessage) realMessage.style.display = 'block';
        }, 2500);

      }, 6000);

      // Fechar balão
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.preventDefault();
          bubble.classList.remove('show');
          // Mostrar notificação com delay de 2 segundos após fechar
          setTimeout(function () {
            if (badge) badge.classList.add('show');
          }, 2000);
        });
      }

      // Ao clicar no botão flutuante principal
      if (mainBtn) {
        mainBtn.addEventListener('click', function () {
          bubble.classList.remove('show');
          if (badge) badge.classList.remove('show');
        });
      }
    }
    /* ---------- Carrossel Sobre o Profissional (Galeria Premium com Miniaturas) ---------- */
    function initSobreCarousel() {
      var sobreCounter = document.getElementById('sobreCounter');
      var sobreTrack = document.getElementById('sobreTrack');
      var sobreCaption = document.getElementById('sobreCaption');
      var sobreProgress = document.getElementById('sobreProgress');
      var sobreThumbsWrap = document.getElementById('sobreThumbs');
      if (!sobreTrack || !sobreCounter || !sobreCaption || !sobreProgress || !sobreThumbsWrap) return;

      var sobreSlides = sobreTrack.querySelectorAll('.sobre__carousel-slide');
      var sobreThumbs = sobreThumbsWrap.querySelectorAll('.sobre__thumb-item');
      var sobreCurrent = 0;
      var sobreTimer = null;
      var slideDuration = 6000;

      var resetProgressBar = function () {
        sobreProgress.style.transition = 'none';
        sobreProgress.style.width = '0%';
        void sobreProgress.offsetWidth; // Força reflow
        sobreProgress.style.transition = 'width ' + slideDuration + 'ms linear';
        sobreProgress.style.width = '100%';
      };

      var updateSobreCarousel = function (index) {
        sobreCurrent = (index + sobreSlides.length) % sobreSlides.length;
        
        // Efeito fade na legenda
        sobreCaption.style.opacity = '0';
        
        setTimeout(function () {
          // Atualiza slides
          sobreSlides.forEach(function (slide, i) {
            var isActive = i === sobreCurrent;
            slide.classList.toggle('is-active', isActive);
            if (isActive) {
              var cap = slide.getAttribute('data-caption');
              sobreCaption.textContent = cap;
              sobreCaption.style.opacity = '1';
            }
          });
          
          // Atualiza miniaturas
          sobreThumbs.forEach(function (thumb, i) {
            thumb.classList.toggle('is-active', i === sobreCurrent);
          });

          sobreCounter.textContent = '0' + (sobreCurrent + 1) + ' / 0' + sobreSlides.length;
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
        sobreProgress.style.transition = 'none';
        sobreProgress.style.width = '0%';
      };

      // Adiciona cliques nas miniaturas
      sobreThumbs.forEach(function (thumb, idx) {
        thumb.addEventListener('click', function () {
          stopSobreAuto();
          updateSobreCarousel(idx);
        });
      });

      startSobreAuto();
    }

    initWaPremium();
    initSobreCarousel();

  });
})();
