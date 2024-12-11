$(document).ready(function () {
  const hero = $("#hero");
  const obstacles = $(".obstacle");
  const bush = $(".bush");
  const floor = $(".floor");
  const object = $(".object");
  const finishLine = $("#finishLine");

  let gameRunning = true;
  let timerStarted = false;
  let startTime, intervalId;
  let highestScore = Infinity; // Inicializa com um valor maior que qualquer tempo
  const scrollSpeed = 20; // Aumenta a velocidade do scroll
  let isJumping = false;
  let lastScrollTime = 0;
  let isRunningRight = false;
  let isRunningLeft = false;
  let lastDirection = "idle-right"; // Começa com o personagem parado à direita
  let touchStartX = 0;
  let touchStartY = 0;

  // Função para alterar o estado do personagem
  function setHeroState(state) {
    hero.removeClass("idle-right idle-left running-right running-left");
    hero.addClass(state);
  }

  function handleIdleState() {
    if (lastDirection === "running-right") {
      setHeroState("idle-right");
    } else if (lastDirection === "running-left") {
      setHeroState("idle-left");
    } else {
      setHeroState("idle-right");
    }
  }

  setHeroState("idle-left");

  function startTimer() {
    startTime = Date.now();
    intervalId = setInterval(updateTimer, 100);
  }

  function updateTimer() {
    const now = Date.now();
    const elapsed = now - startTime;

    const minutes = Math.floor(elapsed / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    $("#chronometer, .chronometer").text(`${pad(minutes, 2)}:${pad(seconds, 2)}`);
  }

  function pad(number, length) {
    return number.toString().padStart(length, "0");
  }

  // Função para lidar com o scroll (mouse ou toque)
  function handleScroll(scrollDirection) {
    $(".start").fadeOut();

    const now = Date.now();
    if (!gameRunning || now - lastScrollTime < 16) return; // Limitar a 60fps
    lastScrollTime = now;

    if (!timerStarted) {
      startTimer();
      timerStarted = true;
    }

    if (scrollDirection < 0 && !isRunningRight) {
      isRunningRight = true;
      isRunningLeft = false;
      lastDirection = "running-right";
      setHeroState("running-right");
    } else if (scrollDirection > 0 && !isRunningLeft) {
      isRunningLeft = true;
      isRunningRight = false;
      lastDirection = "running-left";
      setHeroState("running-left");
    }

    // Resetar para o estado de ocioso quando o scroll parar
    clearTimeout(hero.data("scrollTimeout"));
    hero.data(
      "scrollTimeout",
      setTimeout(() => {
        isRunningRight = false;
        isRunningLeft = false;
        handleIdleState();
      }, 200)
    );

    requestAnimationFrame(() => {
      $(".obstacle, .bush, .floor, .object, #finishLine").each(function () {
        const left = parseInt($(this).css("left"));
        $(this).css("left", left - scrollDirection * scrollSpeed + "px");
      });
      checkWin();
      checkHeroSilhouetteOverlap();
    });
  }

  // Detecção de movimento com o scroll do mouse
  $(window).on("wheel", function (e) {
    const scrollDirection = e.originalEvent.deltaY < 0 ? -1 : 1;
    handleScroll(scrollDirection);
  });

  // Manipulador de toque (gestos de touchscreen)
  $(document).on("touchstart", function (e) {
    touchStartX = e.originalEvent.touches[0].pageX;
    touchStartY = e.originalEvent.touches[0].pageY;
  });

  $(document).on("touchmove", function (e) {
    const touchEndX = e.originalEvent.touches[0].pageX;
    const touchEndY = e.originalEvent.touches[0].pageY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const scrollDirection = deltaX < 0 ? 1 : -1;
      handleScroll(scrollDirection);
    }
  });

  // Detectar pulo
  $(document).keydown(function (e) {
    if (!gameRunning || isJumping) return;

    if (e.key === "ArrowUp") {
      handleJump();
    }
  });

  $(document).on("touchstart", function (e) {
    const touchEndY = e.originalEvent.touches[0].pageY;

    if (touchStartY - touchEndY > 50) {
      // Detecção de movimento scroll e touch para cima
      handleJump();
    }
  });

  function handleJump() {
    if (!gameRunning || isJumping) return;

    isJumping = true;
    hero.addClass("jump");
    setTimeout(() => {
      hero.removeClass("jump");
      isJumping = false;
    }, 500); // Duração do pulo
  }

  // Verificar colisões
  function checkCollision() {
    const tolerance = 10;
    const heroPos = hero[0].getBoundingClientRect();

    $(".obstacle").each(function () {
      const obstaclePos = this.getBoundingClientRect();

      if (
        !( 
          heroPos.right < obstaclePos.left + tolerance ||
          heroPos.left > obstaclePos.right - tolerance ||
          heroPos.bottom < obstaclePos.top ||
          heroPos.top > obstaclePos.bottom
        )
      ) {
        gameOver();
      }
    });
  }

  setInterval(checkCollision, 100);

  // Verificar vitória
  function checkWin() {
    const heroPos = hero[0].getBoundingClientRect();
    const finishPos = finishLine[0].getBoundingClientRect();

    if (
      !( 
        heroPos.right < finishPos.left ||
        heroPos.left > finishPos.right ||
        heroPos.bottom < finishPos.top ||
        heroPos.top > finishPos.bottom
      )
    ) {
      gameWin();
    }
  }

  function gameOver() {
    if (!gameRunning) return;
    gameRunning = false;
    clearInterval(intervalId);
    $(".start").fadeOut();
    $(".game-over").fadeIn();
  }

  function gameWin() {
    if (!gameRunning) return;
    gameRunning = false;
    clearInterval(intervalId);
    const now = Date.now();
    const elapsed = now - startTime;
    if (elapsed < highestScore) {
      highestScore = elapsed;
      const minutes = Math.floor(highestScore / (1000 * 60));
      const seconds = Math.floor((highestScore % (1000 * 60)) / 1000);
      $("#highestScore, .highestScore").text(`${pad(minutes, 2)}:${pad(seconds, 2)}`);
    }
    $(".win").fadeIn();
    $(".bestTime").fadeIn();
  }

  $(".restartButton").click(function () {
    resetGame();
    $(".game-over, .win").fadeOut();
  });

  function resetGame() {
    gameRunning = true;
    timerStarted = false;
    clearInterval(intervalId);
    $("#chronometer, .chronometer").text("00:00");

    // Resetar a posição do herói
    hero.css("top", "calc(50% + 200px)");
    hero.removeClass("invert");

    // Resetar obstáculos, plantas, chão e linha de chegada
    $(".obstacle, .bush, .floor, .object, #finishLine").each(function () {
      $(this).css("left", $(this).data("initialLeft"));
    });
  }

  // Armazenar posições iniciais
  $(".obstacle, .bush, .floor, .object, #finishLine").each(function () {
    $(this).data("initialLeft", $(this).css("left"));
  });

  // Função para verificar sobreposição de silhuetas
  function checkHeroSilhouetteOverlap() {
    const heroPos = hero[0].getBoundingClientRect();
    let heroInFrontOfEyes = false;

    $(".silhouette").each(function () {
      const bushPos = this.getBoundingClientRect();

      if (
        !( 
          heroPos.right < bushPos.left ||
          heroPos.left > bushPos.right ||
          heroPos.bottom < bushPos.top ||
          heroPos.top > bushPos.bottom
        )
      ) {
        heroInFrontOfEyes = true;
      }
    });

    if (heroInFrontOfEyes) {
      hero.addClass("invert");
    } else {
      hero.removeClass("invert");
    }
  }
});
