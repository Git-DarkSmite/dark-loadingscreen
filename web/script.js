// dark-loadingscreen logic (YouTube IFrame API version, overlay removed)
(function(){
  const cfg = window.DarkLoadingScreenConfig || {};
  const holder = document.getElementById('bg-video');
  const staffList = document.getElementById('staff-list');
  const volumeSlider = document.getElementById('volume');
  const playPauseBtn = document.getElementById('playPause');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const muteToggleBtn = document.getElementById('muteToggle');
  const musicEl = document.getElementById('bg-music');
  const localVideo = document.getElementById('local-video');

  // --- Volume helpers ---
  function normalizeVolume(val){
    if(typeof val !== 'number' || isNaN(val)) return 0.5;
    // Accept either 0-1 or 0-100 (if user mistakenly uses percent)
    if(val > 1.01) val = val / 100;
    return Math.min(1, Math.max(0, val));
  }
  const configuredVolume = normalizeVolume(cfg.audioVolume);
  let initialVolumeLocked = false;
  let sliderVolumeApplied = false;
  let lastUserVolume = configuredVolume; // remembers last non-muted volume (0-1)

  // Immediate slider + audio volume application (before other init), handles browsers defaulting to 50.
  function applyInitialSliderVolume(force=false){
    if(!volumeSlider) return;
    const targetPercent = Math.round(configuredVolume * 100);
    if(force || !sliderVolumeApplied || parseInt(volumeSlider.value,10) !== targetPercent){
      volumeSlider.value = targetPercent;
      volumeSlider.setAttribute('value', String(targetPercent));
      if(musicEl && !initialVolumeLocked){
        musicEl.volume = configuredVolume;
      }
      sliderVolumeApplied = true;
    }
  }
  applyInitialSliderVolume();
  // Reinforce a couple of times very early to beat late style/layout ticks.
  setTimeout(()=>applyInitialSliderVolume(), 30);
  setTimeout(()=>applyInitialSliderVolume(), 90);
  window.addEventListener('load', ()=>applyInitialSliderVolume(true));

  // Extract YT ID
  function extractId(url){
    if(!url) return '';
    let m = url.match(/[?&]v=([\w-]{6,})/i); if(m) return m[1];
    m = url.match(/youtu\.be\/([\w-]{6,})/i); if(m) return m[1];
    m = url.match(/embed\/([\w-]{6,})/i); if(m) return m[1];
    return '';
  }
  const rawVideoUrl = cfg.videoUrl || '';
  const isLocalMp4 = /\.mp4($|\?|#)/i.test(rawVideoUrl) && !/^https?:\/\/.*(youtube|youtu\.be)/i.test(rawVideoUrl);
  const ytId = isLocalMp4 ? '' : extractId(rawVideoUrl);
  let player = null;
  let playerReady = false;
  let localVideoReady = false;
  let defaultsInitialized = false;

  // --- Music Autoplay (clean implementation) ---
  function initMusicAutoplay(){
    if(!musicEl || !cfg.audioFile) return;
  const startVol = configuredVolume;
    musicEl.src = cfg.audioFile;
    musicEl.loop = true;
    musicEl.preload = 'auto';
    musicEl.volume = startVol;
    musicEl.muted = false; // we want sound

    // Some browsers may override volume on first successful play; enforce until locked.
    function enforceVolume(){
      if(initialVolumeLocked) return;
      musicEl.volume = startVol;
    }
    ['loadedmetadata','canplay','playing'].forEach(ev=>{
      musicEl.addEventListener(ev, enforceVolume, { once:false });
    });
    let retries = 120; // ~12s at 100ms
    const intervalMs = 100;
    let started = false;
    const debug = false; // set true for console logs

    const tryPlay = ()=>{
      if(started) return;
      if(retries <= 0){ cleanup(); return; }
      retries--;
      const p = musicEl.play();
      if(p && typeof p.then === 'function'){
        p.then(()=>{
          if(!musicEl.paused){ started = true; initialVolumeLocked = true; cleanup(); if(debug) console.log('[music] autoplay success'); }
        }).catch(()=>{ /* ignore */ });
      }
    };

    const timer = setInterval(()=>{
  if(started){ clearInterval(timer); return; }
  if(musicEl.paused){ tryPlay(); } else { started = true; initialVolumeLocked = true; cleanup(); }
    }, intervalMs);

    // Event fallback (first user gesture if policy blocks initial)
    const userEvents = ['pointerdown','mousedown','mouseup','keydown','touchstart'];
    const userHandler = ()=>{ if(!started){ tryPlay(); } };
    userEvents.forEach(ev=> window.addEventListener(ev, userHandler, { once: true, passive: true }));

    // Web Audio unlock booster
    let waTried = false;
    function tryUnlock(){
      if(waTried || started) return;
      waTried = true;
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
        const ctx = new AC();
        if(ctx.state === 'suspended') ctx.resume().catch(()=>{});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain(); gain.gain.value = 0.00001; // inaudible
        osc.connect(gain).connect(ctx.destination); osc.start(); setTimeout(()=>{ try { osc.stop(); } catch(e){} }, 300);
        // attempt play again shortly
        setTimeout(()=>{ tryPlay(); }, 50);
      } catch(e) {}
    }
    window.addEventListener('pointerdown', tryUnlock, { once: true });
    window.addEventListener('keydown', tryUnlock, { once: true });

    function cleanup(){
      userEvents.forEach(ev=> window.removeEventListener(ev, userHandler));
      window.removeEventListener('pointerdown', tryUnlock);
      window.removeEventListener('keydown', tryUnlock);
      clearInterval(timer);
      if(muteToggleBtn){ muteToggleBtn.textContent = musicEl.muted ? 'Unmute' : 'Mute'; }
      // Remove volume enforcement listeners after lock
      setTimeout(()=>{
        ['loadedmetadata','canplay','playing'].forEach(ev=> musicEl.removeEventListener(ev, enforceVolume));
      }, 1000);
    }

    // Kick off immediately
    tryPlay();
  }
  initMusicAutoplay();

  // Ensure YT iframe always covers screen (fallback adjust if aspect edge cases)
  // Anpassa så hela videon syns (contain) med ev. svarta kanter
  function adjustIframeCover(){
    const iframe = holder && holder.querySelector('iframe');
    if(!iframe) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetRatio = 16/9; // antagen YT aspect
    const currentRatio = vw / vh;
    let w, h;
    // Contain: inget beskärs
    if(currentRatio > targetRatio){
      // Skärm bredare -> begränsa på höjd
      h = vh; w = h * targetRatio;
    } else {
      // Skärm smalare -> begränsa på bredd
      w = vw; h = w / targetRatio;
    }
    iframe.style.width = w + 'px';
    iframe.style.height = h + 'px';
    iframe.style.top = '50%';
    iframe.style.left = '50%';
    iframe.style.transform = 'translate(-50%,-50%)';
    iframe.style.position = 'absolute';
    iframe.style.opacity = '1';
  }
  window.addEventListener('resize', adjustIframeCover);
  setInterval(adjustIframeCover, 1500); // occasional reinforcement
  adjustIframeCover();

  function adjustLocalVideo(){
    if(!isLocalMp4 || !localVideo) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    // Om vi kan läsa verklig aspect från videon, använd den
    const metaW = localVideo.videoWidth || 16;
    const metaH = localVideo.videoHeight || 9;
    const targetRatio = metaW / metaH;
    const currentRatio = vw / vh;
    let w, h;
    if(currentRatio > targetRatio){
      h = vh; w = h * targetRatio;
    } else {
      w = vw; h = w / targetRatio;
    }
    localVideo.style.width = w + 'px';
    localVideo.style.height = h + 'px';
    localVideo.style.position = 'absolute';
    localVideo.style.top = '50%';
    localVideo.style.left = '50%';
    localVideo.style.transform = 'translate(-50%,-50%)';
  }
  if(localVideo){
    localVideo.addEventListener('loadedmetadata', adjustLocalVideo);
  }
  window.addEventListener('resize', adjustLocalVideo);
  setInterval(adjustLocalVideo, 1500);
  adjustLocalVideo();

  // Staff list rendering
  function renderStaff(){
    if(!Array.isArray(cfg.staff)) return;
    staffList.innerHTML = '';
    staffList.classList.remove('multi','dense');
    const total = cfg.staff.length;
    cfg.staff.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'staff-row';
      if(entry.image){
        const img = document.createElement('img');
        img.className = 'avatar';
        const base = cfg.staffImagePath || '';
        const baseName = entry.image.replace(/\.(webp|png|jpg|jpeg)$/i,'');
        const candidates = [baseName + '.webp', baseName + '.png', baseName + '.jpg'];
        let attempt = 0;
        function tryNext(){
          if(attempt >= candidates.length){
            // ultimate fallback: initials badge
            const badge = document.createElement('div');
            badge.className = 'avatar avatar-fallback';
            const initials = (entry.name||'?').split(/\s+/).map(p=>p[0]).join('').substring(0,2).toUpperCase();
            badge.textContent = initials;
            img.replaceWith(badge);
            return;
          }
          img.src = base + candidates[attempt];
        }
        img.alt = entry.name || entry.title || 'staff';
        img.addEventListener('error', ()=>{ attempt++; tryNext(); });
        tryNext();
        row.appendChild(img);
      }
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = entry.title || '';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = entry.name || '';
      row.appendChild(title); row.appendChild(name);
      staffList.appendChild(row);
    });
    if(total > 6){
      staffList.classList.add('multi');
    }
    if(total > 12){
      staffList.classList.add('dense');
    }
  }
  renderStaff();

  // Popup message rotation
  (function initPopups(){
    const msgs = Array.isArray(cfg.messages) ? cfg.messages.filter(m=>m && (m.title||m.message)) : [];
    if(!msgs.length) return;
  const stack = document.getElementById('popup-messages');
    if(!stack) return;
  const corner = (cfg.popupCorner || 'top-left').toLowerCase();
  const allowed = ['top-left','top-right','bottom-left','bottom-right'];
  const cls = allowed.includes(corner) ? corner : 'top-left';
  stack.classList.add(cls);
    let idx = 0;
    let activeEl = null;
  const showDuration = Math.max(1500, (cfg.popupIntervalSeconds || 6) * 1000);
    function buildPopup(data){
      const div = document.createElement('div');
      div.className = 'popup';
      const h = document.createElement('h3');
      h.textContent = data.title || '';
      const p = document.createElement('p');
      p.textContent = data.message || '';
      div.appendChild(h); div.appendChild(p);
      return div;
    }
    function cycle(){
      const data = msgs[idx];
      idx = (idx + 1) % msgs.length;
      const nextEl = buildPopup(data);
      stack.appendChild(nextEl);
      if(activeEl){
        activeEl.classList.add('fade-out');
        setTimeout(()=>{ if(activeEl && activeEl.parentNode){ activeEl.parentNode.removeChild(activeEl); } activeEl = nextEl; }, 480);
      } else {
        activeEl = nextEl;
      }
      setTimeout(cycle, showDuration);
    }
    cycle();
  })();

  function createPlayer(){
    if(!ytId) return; // will use local mp4 path instead
    player = new YT.Player('bg-video', {
      videoId: ytId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        mute: 1,
        rel: 0,
        showinfo: 0,
        loop: 1,
        playlist: ytId,
        disablekb: 1,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1
      },
      events: {
        onReady: function(){
          playerReady = true;
          initDefaults();
        },
        onStateChange: function(ev){
          if(ev.data === YT.PlayerState.PAUSED && playPauseBtn.dataset.state !== 'paused'){
            player.playVideo();
          }
          // Always keep video muted
          if(player && !player.isMuted()){
            try { player.mute(); } catch(e){}
          }
        }
      }
    });
  }

  // IFrame API global callback
  window.onYouTubeIframeAPIReady = function(){ if(!isLocalMp4) createPlayer(); };

  // Local MP4 setup
  function initLocalMp4(){
    if(!isLocalMp4 || !localVideo) return;
    localVideo.src = rawVideoUrl;
    localVideo.classList.remove('hidden');
    localVideo.muted = true; // keep visual silent (audio handled by music)
    localVideo.playsInline = true;
    localVideo.loop = true;
  playPauseBtn.dataset.state = 'playing';
    const tryPlay = (r=20)=>{
      localVideo.play().then(()=>{ localVideoReady = true; }).catch(()=>{ if(r>0) setTimeout(()=>tryPlay(r-1),300); });
    };
    tryPlay();
  }
  if(isLocalMp4){
    // Hide YT holder until maybe replaced
    holder.style.display = 'none';
    initLocalMp4();
  }

  function initDefaults(){
  if(defaultsInitialized) return;
  defaultsInitialized = true;
  const volume = configuredVolume;
  const volPercent = Math.round(volume * 100);
  volumeSlider.value = volPercent;
  volumeSlider.setAttribute('value', String(volPercent)); // så initial DOM-attribut speglar
  // Förstärk efter render (en del browsers visar default 50 tills första frame)
  requestAnimationFrame(()=>{
    if(parseInt(volumeSlider.value,10) !== volPercent){
      volumeSlider.value = volPercent;
      volumeSlider.setAttribute('value', String(volPercent));
    }
  });
  // Sista säkerhetskoll lite senare
  setTimeout(()=>{
    if(parseInt(volumeSlider.value,10) !== volPercent){
      volumeSlider.value = volPercent;
      volumeSlider.setAttribute('value', String(volPercent));
      volumeSlider.dispatchEvent(new Event('input'));
    }
  }, 150);
  // Ensure element volume matches slider (in case autoplay init ran earlier)
  if(musicEl){ musicEl.volume = volume; }
    playPauseBtn.dataset.state = 'playing';
    if(!isLocalMp4){
      attemptPlay();
      if(player){ player.mute(); }
    }
    // Apply defaults immediately for local video path (no YT onReady)
    initDefaults();
    if(musicEl && cfg.audioFile){
      // Additional reinforcement (short light retry) once player is ready
      if(musicEl.paused){
        let lightTries = 20;
        const li = setInterval(()=>{
          if(!musicEl.paused){ clearInterval(li); return; }
          musicEl.play().catch(()=>{});
          lightTries--; if(lightTries<=0) clearInterval(li);
        },150);
      }
    }

    // Safeguard: periodically enforce mute on background video
  {
      setInterval(()=>{
            if(!isLocalMp4){
              if(player && !player.isMuted()){
                try { player.mute(); } catch(e){}
              }
            } else if(localVideo && !localVideo.muted){
              localVideo.muted = true;
            }
      }, 2000);
    }
  }

  function attemptPlay(retries=12){
  if(player){ player.playVideo(); }
    if(retries>0){
      setTimeout(()=> attemptPlay(retries-1), 500);
    }
  }

  // Removed local video support and legacy code

  // Controls
  playPauseBtn.addEventListener('click', ()=>{
    const state = playPauseBtn.dataset.state || 'playing';
    // Video
    if(playerReady && player){
      if(state === 'playing') player.pauseVideo(); else player.playVideo();
    } else if(isLocalMp4 && localVideo){
      if(state === 'playing'){
        try { localVideo.pause(); } catch(e){}
      } else {
        const resume = (n=5)=>{ localVideo.play().catch(()=>{ if(n>0) setTimeout(()=>resume(n-1),150); }); };
        resume();
      }
    }
    // Music
    if(musicEl){
      if(state === 'playing'){
        try { musicEl.pause(); } catch(e){}
      } else {
        // Attempt resume with a couple retries in case of transient block
        const attempt = (n=5)=>{
          const p = musicEl.play();
          if(p && p.catch) p.catch(()=>{ if(n>0) setTimeout(()=>attempt(n-1),120); });
        };
        attempt();
      }
    }
    if(state === 'playing'){
      playPauseBtn.textContent = 'Play';
      playPauseBtn.dataset.state = 'paused';
    } else {
      playPauseBtn.textContent = 'Pause';
      playPauseBtn.dataset.state = 'playing';
    }
  });

  volumeSlider.addEventListener('input', ()=>{
    const v = parseInt(volumeSlider.value,10) || 0;
    const volFloat = Math.min(1, Math.max(0, v/100));
    // Control music volume instead of (muted) background video
    if(musicEl){
      musicEl.volume = volFloat;
      if(musicEl.muted && volFloat > 0){
        musicEl.muted = false; // unmute if user raises volume
      }
  if(volFloat > 0){ lastUserVolume = volFloat; }
    }
    if(muteToggleBtn){
      muteToggleBtn.textContent = (musicEl && musicEl.muted) ? 'Unmute' : 'Mute';
    }
  });

  // No user activation logic needed now (video stays muted, music forced)

  // start button removed

  if(muteToggleBtn){
    muteToggleBtn.addEventListener('click', ()=>{
      if(!musicEl) return;
      if(musicEl.muted){
        musicEl.muted = false;
        // Restore using lastUserVolume (or slider/config fallback)
        let target = lastUserVolume;
        if(!(target > 0)){
          const v = parseInt(volumeSlider.value,10);
          target = isNaN(v) ? configuredVolume : (v/100);
        }
        target = Math.min(1, Math.max(0, target));
        musicEl.volume = target;
        if(target > 0){ lastUserVolume = target; }
        muteToggleBtn.textContent = 'Mute';
      } else {
        // Store current volume before muting (if >0)
        if(musicEl.volume > 0){ lastUserVolume = musicEl.volume; }
        musicEl.muted = true;
        muteToggleBtn.textContent = 'Unmute';
      }
    });
  }

  // aggressiveSoundStart removed (video always muted)

  // Removed old massive setupMusic forcing (simplified above)

  // Fake load progress
  let fakeProgress = 0;
  const interval = setInterval(()=>{
    fakeProgress = Math.min(100, fakeProgress + Math.random()*7);
    progressFill.style.width = fakeProgress + '%';
    progressText.textContent = 'Loading ' + Math.round(fakeProgress) + '%';
    if(fakeProgress >= 100){
      clearInterval(interval);
      progressText.textContent = 'Loaded';
    }
  }, 500);
})();
