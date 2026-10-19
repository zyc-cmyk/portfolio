/* Four public project cards driven by the page's pinned scroll distance. */
(() => {
  const work = document.querySelector('.gallery-section');
  const stage = work.querySelector('.work-stage');
  const stack = work.querySelector('.project-stack');
  const cards = [...work.querySelectorAll('.project-card')];
  const links = [...work.querySelectorAll('.work-link')];
  const titles = [...work.querySelectorAll('.work-title-input')];
  const caseButtons = [...work.querySelectorAll('.project-case-button')];
  cards.forEach((card, index) => {
    const help = card.querySelector('.project-copy-help');
    const footer = document.createElement('div');
    footer.className = 'project-copy-footer';
    help.replaceWith(footer);
    footer.append(help, caseButtons[index]);
  });
  const count = work.querySelector('.work-count');
  const steps = [...work.querySelectorAll('.work-step')];
  const modal = document.querySelector('#case-modal');
  const modalTitle = modal.querySelector('#case-modal-title');
  const modalViewer = modal.querySelector('#case-modal-viewer');
  const modalHint = modal.querySelector('#case-modal-hint');
  const modalClose = modal.querySelector('.case-modal-close');
  const modalPrint = modal.querySelector('.case-modal-print');
  const modalDownload = modal.querySelector('.case-modal-download');
  let caseViewVersion = 0;
  let pdfModulePromise;

  async function renderCasePdf(source, version) {
    const pages = document.createElement('div');
    pages.className = 'case-pdf-pages';
    pages.setAttribute('aria-label', 'PDF 完整案例页面');
    modalViewer.appendChild(pages);
    try {
      pdfModulePromise ||= import('./vendor/pdfjs/pdf.min.mjs');
      const pdfjs = await pdfModulePromise;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
      const pdf = await pdfjs.getDocument(source).promise;
      if (version !== caseViewVersion || !modal.open) return;
      for (let number = 1; number <= pdf.numPages; number++) {
        if (version !== caseViewVersion || !modal.open) return;
        const page = await pdf.getPage(number);
        const base = page.getViewport({ scale: 1 });
        const available = Math.max(1, modalViewer.clientWidth - 24);
        const cssScale = Math.min(1.5, available / base.width);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: cssScale * pixelRatio });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${base.width * cssScale}px`;
        canvas.style.height = `${base.height * cssScale}px`;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', `第 ${number} 页，共 ${pdf.numPages} 页`);
        pages.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      }
      if (version === caseViewVersion) modalHint.textContent = `PDF 共 ${pdf.numPages} 页，上下滑动查看完整页面。`;
    } catch (error) {
      if (version !== caseViewVersion) return;
      pages.remove();
      const fallback = document.createElement('iframe');
      fallback.src = `${source}#view=FitH`;
      fallback.title = 'PDF 浏览器预览';
      modalViewer.appendChild(fallback);
      modalHint.textContent = '当前浏览器无法加载适配预览，可点击上方“下载 PDF”查看。';
      console.error('PDF preview failed:', error);
    }
  }

  function fitCaseWeb() {
    const wrapper = modalViewer.querySelector('.case-scaled-web');
    if (!wrapper) return;
    const available = modalViewer.clientWidth;
    const virtualWidth = available < 950 ? 1200 : available;
    const scale = available / virtualWidth;
    wrapper.style.setProperty('--case-web-width', `${virtualWidth}px`);
    wrapper.style.setProperty('--case-web-height', `${modalViewer.clientHeight / scale}px`);
    wrapper.style.setProperty('--case-web-scale', String(scale));
  }
  window.addEventListener('resize', fitCaseWeb);
  const originalMedia = cards.map(card => {
    const frame = card.querySelector('.project-media-frame');
    const visual = frame.querySelector('.project-media-visual');
    return { markup: visual.innerHTML, layout: visual.dataset.layout, tone: visual.dataset.tone, label: frame.dataset.defaultLabel, src: frame.dataset.caseSrc, caseKind: frame.dataset.caseKind, download: frame.dataset.caseDownload, poster: visual.querySelector('img')?.src };
  });
  let active = 0;
  let wheelDistance = 0;
  let targetIndex = 0;
  let scrollTicking = false;
  let scrollAnimation = 0;
  let animationDirection = 0;
  let animationProgress = 0;
  let animationKind = '';
  let queuedDirection = 0;
  let queuedWheelDistance = 0;
  let savedScrollBehavior = null;
  let touchStart = null;
  let caseTrigger = null;
  let previousOverflow = '';

  const clamp = value => Math.max(0, Math.min(cards.length - 1, value));
  function setActive(index) {
    const next = clamp(index);
    if (active === next && stage.dataset.initialized) return;
    active = next;
    stage.dataset.initialized = 'true';
    cards.forEach((card, cardIndex) => {
      const selected = cardIndex === active;
      card.dataset.state = selected ? 'active' : cardIndex < active ? 'previous' : 'next';
      card.inert = !selected;
      links[cardIndex].setAttribute('aria-current', selected ? 'true' : 'false');
      const video = card.querySelector('video');
      if (video) {
        if (selected && !reducedMotion.matches) video.play().catch(() => {});
        else video.pause();
      }
    });
    count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    steps[0].disabled = active === 0;
    steps[1].disabled = active === cards.length - 1;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sectionTop = () => work.getBoundingClientRect().top + window.scrollY;
  const viewport = () => stage.getBoundingClientRect().height;
  const anchor = index => sectionTop() + viewport() * index;

  function renderProgress() {
    const height = viewport();
    if (!height) return;
    const progress = Math.max(0, Math.min(4, (window.scrollY - sectionTop()) / height));
    const visibleIndex = Math.min(3, Math.floor(progress + .1));
    setActive(visibleIndex);
    const cardHeights = cards.map(card => card.getBoundingClientRect().height);
    cards.forEach((card, index) => {
      const phase = index === 0 ? 1 : Math.max(0, Math.min(1, progress - (index - 1)));
      const amount = reducedMotion.matches ? (phase >= .5 ? 0 : 1) : 1 - phase;
      const distance = (height + cardHeights[index]) / 2 + 24;
      card.style.setProperty('--work-card-offset', `${Math.round(amount * distance)}px`);
      card.style.zIndex = String(index + 1);
    });
    count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  }

  function queueRender() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => { scrollTicking = false; renderProgress(); });
  }

  function scrollToPosition(destination, duration = 1650) {
    if (scrollAnimation) cancelAnimationFrame(scrollAnimation);
    scrollAnimation = 0;
    animationDirection = 0;
    animationProgress = 0;
    queuedDirection = 0;
    queuedWheelDistance = 0;
    const root = document.documentElement;
    if (savedScrollBehavior === null) savedScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    if (reducedMotion.matches) {
      window.scrollTo({ top: destination, behavior: 'instant' });
      root.style.scrollBehavior = savedScrollBehavior;
      savedScrollBehavior = null;
      queueRender();
      return;
    }
    const start = window.scrollY;
    const distance = destination - start;
    animationDirection = Math.sign(distance);
    if (Math.abs(distance) < 1) {
      root.style.scrollBehavior = savedScrollBehavior;
      savedScrollBehavior = null;
      return;
    }
    const started = performance.now();
    const frame = now => {
      const progress = Math.min(1, (now - started) / duration);
      animationProgress = progress;
      const eased = .2 * progress + .8 * progress * progress * (3 - 2 * progress);
      window.scrollTo({ top: start + distance * eased, behavior: 'instant' });
      if (progress < 1) scrollAnimation = requestAnimationFrame(frame);
      else {
        const nextDirection = queuedDirection;
        const completedKind = animationKind;
        scrollAnimation = 0;
        animationDirection = 0;
        animationProgress = 0;
        queuedDirection = 0;
        queuedWheelDistance = 0;
        root.style.scrollBehavior = savedScrollBehavior;
        savedScrollBehavior = null;
        queueRender();
        if (nextDirection && completedKind === 'card') stepWork(nextDirection);
      }
    };
    scrollAnimation = requestAnimationFrame(frame);
  }

  function goTo(index) {
    const next = clamp(index);
    targetIndex = next;
    animationKind = 'card';
    scrollToPosition(anchor(next));
  }

  function leaveWork(direction) {
    animationKind = 'exit';
    const destination = direction > 0
      ? sectionTop() + work.getBoundingClientRect().height + viewport() * .12
      : sectionTop() - Math.max(80, viewport() * .35);
    scrollToPosition(destination, 1150);
  }

  function stepWork(direction) {
    const next = targetIndex + direction;
    if (next < 0 || next >= cards.length) leaveWork(direction);
    else goTo(next);
  }

  function openCase(index, trigger, refresh = false) {
    const viewVersion = ++caseViewVersion;
    if (!refresh) {
      goTo(index);
      caseTrigger = trigger;
      previousOverflow = document.body.style.overflow;
    }
    modalViewer.querySelector('video')?.pause();
    const frame = cards[index].querySelector('.project-media-frame');
    const displayedKind = originalMedia[index].caseKind;
    const isVideo = displayedKind === 'video';
    const isWebCase = displayedKind === 'html';
    const source = originalMedia[index].src;
    modalTitle.textContent = titles[index].textContent.trim() || `作品 ${String(index + 1).padStart(2, '0')}`;
    modalViewer.replaceChildren();
    modalViewer.scrollTop = 0;
    modalViewer.classList.toggle('case-modal-viewer-page', isWebCase);
    modalViewer.classList.toggle('case-modal-viewer-pdf', displayedKind === 'pdf');
    modalPrint.hidden = !isWebCase;
    modalDownload.hidden = displayedKind !== 'pdf';
    modalDownload.href = displayedKind === 'pdf' ? source : '#';
    modalDownload.download = originalMedia[index].download || `作品-${index + 1}.pdf`;
    modalDownload.textContent = '下载 PDF ↓';
    if (isWebCase) {
      const wrapper = document.createElement('div');
      wrapper.className = 'case-scaled-web';
      const iframe = document.createElement('iframe');
      iframe.src = source;
      iframe.title = `${modalTitle.textContent} 完整案例网页`;
      wrapper.appendChild(iframe);
      modalViewer.appendChild(wrapper);
      modalHint.textContent = '在案例内上下滚动，通过悬停、点击和滑动体验互动效果。';
    } else if (displayedKind === 'pdf') {
      modalHint.textContent = '正在载入 PDF 页面…';
    } else if (isVideo) {
      const video = document.createElement('video');
      video.src = source;
      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.poster = originalMedia[index].poster || '';
      video.setAttribute('aria-label', `${modalTitle.textContent} 完整视频`);
      modalViewer.appendChild(video);
      modalHint.textContent = '视频自动静音播放，可在播放器中开启声音。';
    } else {
      const image = document.createElement('img');
      image.src = source;
      image.alt = `${modalTitle.textContent} 完整案例图片`;
      modalViewer.appendChild(image);
      modalHint.textContent = '上下滑动查看完整图片。';
    }
    if (!modal.open) {
      modal.showModal();
      document.body.style.overflow = 'hidden';
      modalClose.focus();
    }
    if (isWebCase) fitCaseWeb();
    if (displayedKind === 'pdf') renderCasePdf(source, viewVersion);
    frame.querySelector('.project-media-visual video')?.pause();
    if (isVideo) modalViewer.querySelector('video').play().catch(() => { modalHint.textContent = '点击播放器的播放按钮查看视频。'; });
  }

  modalClose.addEventListener('click', () => modal.close());
  modalPrint.addEventListener('click', () => modalViewer.querySelector('iframe')?.contentWindow?.print());
  window.addEventListener('keydown', event => {
    if (!modal.open || modalPrint.hidden || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'p') return;
    event.preventDefault();
    modalViewer.querySelector('iframe')?.contentWindow?.print();
  });
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
  modal.addEventListener('close', () => {
    caseViewVersion++;
    modalViewer.querySelector('video')?.pause();
    modalViewer.replaceChildren();
    document.body.style.overflow = previousOverflow;
    const coverVideo = caseTrigger?.closest('.project-card')?.querySelector('.project-media-visual video');
    if (coverVideo && !reducedMotion.matches) coverVideo.play().catch(() => {});
    caseTrigger?.focus();
    caseTrigger = null;
  });

  links.forEach((link, index) => link.addEventListener('click', () => goTo(index)));
  cards.forEach((card, index) => card.addEventListener('click', event => {
    if (event.target.closest('button,.project-media-frame')) return;
    goTo(index === active ? (active + 1) % cards.length : index);
  }));

  caseButtons.forEach((button, index) => button.addEventListener('click', () => openCase(index, button)));

  steps.forEach(button => button.addEventListener('click', () => goTo(active + Number(button.dataset.direction))));
  window.addEventListener('keydown', event => {
    if (modal.open || event.target.closest('input,[contenteditable="true"],video')) return;
    const top = sectionTop();
    if (scrollY < top - 3 || scrollY > top + viewport() * 4 + 3) return;
    const direction = ['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key) || event.key === ' ' && !event.shiftKey
      ? 1 : ['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key) || event.key === ' ' && event.shiftKey ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    if (scrollAnimation) {
      if (!event.repeat && animationKind === 'card' && animationProgress > .66 && direction === animationDirection) queuedDirection = direction;
      return;
    }
    if (active + direction < 0 || active + direction >= cards.length) leaveWork(direction);
    else goTo(active + direction);
  });
  window.addEventListener('scroll', queueRender, { passive: true });
  window.addEventListener('resize', queueRender, { passive: true });
  reducedMotion.addEventListener('change', queueRender);
  window.addEventListener('wheel', event => {
    if (modal.open || event.ctrlKey) return;
    if (scrollAnimation) {
      event.preventDefault();
      if (event.deltaY < -35 && animationDirection > 0 && window.scrollY > sectionTop() + viewport() * 4 + 3) goTo(3);
      else if (animationKind === 'card' && Math.sign(event.deltaY) === animationDirection && animationProgress > .66) {
        queuedWheelDistance += Math.abs(event.deltaY);
        if (queuedWheelDistance >= 85) queuedDirection = animationDirection;
      } else if (Math.sign(event.deltaY) !== animationDirection) {
        queuedDirection = 0;
        queuedWheelDistance = 0;
      }
      return;
    }
    const scrollable = event.target.closest('.project-copy');
    if (scrollable && scrollable.scrollHeight > scrollable.clientHeight + 2) {
      const canScroll = event.deltaY > 0
        ? scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 2
        : scrollable.scrollTop > 2;
      if (canScroll) return;
    }
    const height = viewport();
    const top = sectionTop();
    const y = window.scrollY;
    const direction = Math.sign(event.deltaY);
    if (!direction || !height) return;
    const approachingTop = direction > 0 && y < top - 3 && y + event.deltaY >= top - 60;
    const approachingBottom = direction < 0 && y > top + height * 4 + 3 && y + event.deltaY <= top + height * 4 + 60;
    const within = y >= top - 3 && y <= top + height * 4 + 3;
    if (!within && !approachingTop && !approachingBottom) return;
    event.preventDefault();
    wheelDistance += Math.abs(event.deltaY);
    if (wheelDistance < 8 && !approachingTop && !approachingBottom) return;
    wheelDistance = 0;
    if (approachingTop) { goTo(0); return; }
    if (approachingBottom) { goTo(3); return; }
    const current = Math.round(Math.max(0, Math.min(3, (y - top) / height)));
    const index = Math.max(0, Math.min(3, targetIndex === current ? targetIndex : current));
    if (direction > 0 && index === 3 || direction < 0 && index === 0) leaveWork(direction);
    else goTo(index + direction);
  }, { passive: false });
  stage.addEventListener('touchstart', event => {
    const editable = event.target.closest('input,[contenteditable="true"],video');
    if (editable && document.activeElement === editable) return;
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  stage.addEventListener('touchmove', event => {
    if (touchStart && !modal.open && Math.abs(event.touches[0].clientY - touchStart.y) > 8) event.preventDefault();
  }, { passive: false });
  stage.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dy) < 40 || Math.abs(dy) < Math.abs(dx)) return;
    const direction = dy < 0 ? 1 : -1;
    if (scrollAnimation) {
      if (animationKind === 'card' && animationProgress > .66 && direction === animationDirection) queuedDirection = direction;
      return;
    }
    if (active + direction < 0 || active + direction >= cards.length) leaveWork(direction);
    else goTo(active + direction);
  }, { passive: true });
  stack.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
  stack.addEventListener('drop', event => {
    event.preventDefault();
    replaceMedia(active, event.dataTransfer?.files?.[0]);
  });

  renderProgress();
  requestAnimationFrame(() => stage.classList.add('ready'));
})();
