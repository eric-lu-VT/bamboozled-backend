import { gameService } from 'services';

function makeGameId(length) {
  let str = '';
  const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'; // no O
  for (let i = 0; i < length; i += 1) {
    str += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return str;
}

function floorMod(n, m) {
  return Math.floor(((n % m) + m) % m);
}

function compareRoll(d1, d2, rd1, rd2) {
  if (d1 < 0 || d1 > 6 || d2 < 0 || d2 > 6) return false;
  if (d1 === 2 && d2 === 1) return true;
  if (rd1 === rd2) {
    return (d1 === d2) && (d1 >= rd1);
  }
  if (d1 === d2 && rd1 !== rd2) return true;
  return (10 * d1 + d2 >= 10 * rd1 + rd2);
}

// Fisher-Yates shuffle
function shuffle(arr) {
  let j = 0;
  let x = 0;
  let index = 0;
  for (index = arr.length - 1; index > 0; index -= 1) {
    j = Math.floor(Math.random() * (index + 1));
    x = arr[index];
    // eslint-disable-next-line no-param-reassign
    arr[index] = arr[j];
    // eslint-disable-next-line no-param-reassign
    arr[j] = x;
  }
  return arr;
}

const createGame = async (socket, io, req) => {
  const gameId = makeGameId(4);

  await gameService.updateGame({
    gameId,
    active: 'false',
    hostId: req.id,
    clients: [req.id],
    alivePlayers: [],
    deadPlayers: [],
    actionCardDeck: [],
    turnIdx: '0',
    reportedDice1: '1',
    reportedDice2: '2',
    dice1: '0',
    dice2: '0',
    currentPlayer: '',
    prevPlayer: '',
    MIN_NUM_PLAYERS: '1',
    MAX_NUM_PLAYERS: '8',
    curStage: 'before-roll-stage',
    turnResult: '',
    pressedOk: '0'
  });
  await gameService.updateUser({
    id: req.id,
    username: req.username,
    gameId,
    strikes: 0,
    alive: true,
    beforeActionCards: [],
    afterActionCards: [],
  });

  socket.join(req.id);
  socket.emit('joinGame', {
    success: true,
    gameId,
    active: false,
    isHost: true,
    clients: {
      [req.id]: {
        username: req.username,
        strikes: 0,
        alive: true,
      }
    }
  });
};

const joinGame = async (socket, io, req) => {
  if (!await gameService.existsGame(req.gameId)) {
    socket.emit('joinGame', {
      success: false
    });
    return;
  }
  const gameData = await gameService.getGame(req.gameId);
  let clientInfo = await gameService.getClientInfo(req.gameId);

  if (gameData.active === 'true'
    || gameData.MAX_NUM_PLAYERS <= gameData.clients.length
    || gameData.clients.includes(req.id)
  ) {
    // reconnect
    if (gameData.clients.includes(req.id)) {
      socket.join(req.id);
      const userData = await gameService.getUser(req.id);
      socket.emit('gameReconnect', {
        success: true,
        gameId: req.gameId,
        active: gameData.active,
        isHost: (req.id === gameData.hostId),
        isTurn: (req.id === gameData.currentPlayerId),
        clients: clientInfo,
        currentPlayerId: gameData.currentPlayerId,
        prevPlayerId: gameData.prevPlayerId,
        reportedDice1: gameData.reportedDice1,
        reportedDice2: gameData.reportedDice2,
        dice1: gameData.dice1,
        dice2: gameData.dice2,
        curStage: gameData.curStage,
        turnResult: gameData.turnResult,
        pressedOk: gameData.pressedOk,
        beforeActionCards: userData.beforeActionCards,
        afterActionCards: userData.afterActionCards,
        curCard: gameData.curCard,
      });
    } else {
      socket.emit('gameReconnect', {
        success: false,
      });
    }
  } else {
    // new user connecting
    await gameService.updateGame({
      ...gameData,
      clients: gameData.clients = gameData.clients.concat([req.id]),
    });

    await gameService.updateUser({
      id: req.id,
      username: req.username,
      gameId: req.gameId,
      strikes: 0,
      alive: true,
      beforeActionCards: [],
      afterActionCards: [],
    });

    clientInfo = await gameService.getClientInfo(req.gameId);

    socket.join(req.id);
    socket.emit('joinGame', {
      success: true,
      gameId: req.gameId,
      active: false,
      isHost: false,
      clients: clientInfo,
    });
    gameData.clients.forEach((id) => {
      socket.to(id).emit('joinGameOther', {
        clients: clientInfo
      });
    });
  }
};

const initGame = async (socket, io, req) => {
  if (!await gameService.existsGame(req.gameId)) {
    socket.emit('initGame', {
      success: false
    });
    return;
  }

  const gameData = await gameService.getGame(req.gameId);
  const clientInfo = await gameService.getClientInfo(req.gameId);

  if (req.id !== gameData.hostId || gameData.MIN_NUM_PLAYERS > gameData.clients.length) {
    socket.emit('initGame', {
      success: false
    });
    return;
  }

  await gameService.updateGame({
    ...gameData,
    active: gameData.active = true,
    alivePlayers: gameData.alivePlayers = gameData.clients,
    // 'jackpot', 'double', 'double', 'up_down', 'up_down', 'up_down',
    actionCardDeck: shuffle([
      'fresh_start', 'fresh_start', 'fresh_start', 'fresh_start', 'reverse', 'reverse',
      'reverse', 'reverse', 'my_bad', 'my_bad', 'my_bad', 'my_bad', 'revive', 'revive',
      'revive', 'revive', 'skip', 'skip', 'skip', 'skip']),
    turnIdx: gameData.turnIdx = Math.floor(Math.random() * gameData.alivePlayers.length),
    reportedDice1: gameData.reportedDice1 = 1,
    reportedDice2: gameData.reportedDice2 = 2,
    dice1: gameData.dice1 = 0,
    dice2: gameData.dice2 = 0,
    currentPlayerId: gameData.currentPlayerId = gameData.alivePlayers[gameData.turnIdx],
    prevPlayerId: gameData.prevPlayerId = gameData.alivePlayers[floorMod(gameData.turnIdx - 1, gameData.alivePlayers.length)],
    curStage: gameData.curStage = 'before-roll-stage',
    turnResult: gameData.turnResult = '',
    pressedOk: gameData.pressedOk = gameData.alivePlayers.length,
  });

  await Promise.all(gameData.clients.map(async (id) => { // might be anti-pattern?
    await gameService.getUser(id).then((userData) => {
      io.to(id).emit('initGame', {
        success: true,
        gameId: req.gameId,
        active: gameData.active,
        isHost: (id === gameData.hostId),
        isTurn: (id === gameData.currentPlayerId),
        clients: clientInfo,
        currentPlayerId: gameData.currentPlayerId,
        prevPlayerId: gameData.prevPlayerId,
        reportedDice1: gameData.reportedDice1,
        reportedDice2: gameData.reportedDice2,
        dice1: gameData.dice1,
        dice2: gameData.dice2,
        curStage: gameData.curStage,
        turnResult: gameData.turnResult,
        pressedOk: gameData.pressedOk,
        beforeActionCards: userData.beforeActionCards,
        afterActionCards: userData.afterActionCards,
      });
    });
  }));
};

const nextRound = async (socket, io, req) => {
  if (!await gameService.existsGame(req.gameId)) {
    socket.emit('nextRound', {
      success: false
    });
    return;
  }

  const gameData = await gameService.getGame(req.gameId);
  const clientInfo = await gameService.getClientInfo(req.gameId);
  if (clientInfo[gameData.prevPlayerId].alive && !clientInfo[gameData.currentPlayerId]) {
    // prevPlayer remains the same
    gameData.currentPlayerId = gameData.alivePlayers[gameData.turnIdx];
  } else if (!clientInfo[gameData.prevPlayerId].alive && clientInfo[gameData.currentPlayerId]) {
    gameData.prevPlayerId = gameData.alivePlayers[floorMod(gameData.turnIdx - 2, gameData.alivePlayers.length)];
    gameData.currentPlayerId = gameData.alivePlayers[gameData.turnIdx];
  }

  if (gameData.turnResult.includes('call')) {
    gameData.reportedDice1 = 1;
    gameData.reportedDice2 = 2;
  }

  await gameService.updateGame({
    ...gameData,
    dice1: gameData.dice1 = 0,
    dice2: gameData.dice2 = 0,
    curStage: gameData.curStage = 'before-roll-stage',
    turnResult: gameData.turnResult = '',
    pressedOk: gameData.pressedOk = gameData.alivePlayers.length,
    curCard: '',
    // turnIdx, // set above
    // reportedDice1, // set above
    // reportedDice2, // set above
    // currentPlayerId, // set above
    // prevPlayerId, // set above
  });

  await Promise.all(gameData.clients.map(async (id) => { // might be anti-pattern?
    await gameService.getUser(id).then((userData) => {
      io.to(id).emit('nextRound', {
        success: true,
        gameId: req.gameId,
        active: gameData.active,
        isHost: (id === gameData.hostId),
        isTurn: (id === gameData.currentPlayerId),
        clients: clientInfo,
        currentPlayerId: gameData.currentPlayerId,
        prevPlayerId: gameData.prevPlayerId,
        reportedDice1: gameData.reportedDice1,
        reportedDice2: gameData.reportedDice2,
        dice1: gameData.dice1,
        dice2: gameData.dice2,
        curStage: gameData.curStage,
        turnResult: gameData.turnResult,
        pressedOk: gameData.pressedOk,
        beforeActionCards: userData.beforeActionCards,
        afterActionCards: userData.afterActionCards,
      });
    });
  }));
};

const useCard = async (socket, io, req) => {
  if (!await gameService.existsGame(req.gameId)) {
    socket.emit('useCard', {
      success: false
    });
    return;
  }

  let success = true;
  const gameData = await gameService.getGame(req.gameId);
  const clientInfo = await gameService.getClientInfo(req.gameId);
  const userData = await gameService.getUser(req.id);
  if (req.cardType === 'before') {
    if (req.cardName === 'fresh_start' && userData.beforeActionCards.some((e) => e === 'fresh_start')) {
      gameData.reportedDice1 = '1';
      gameData.reportedDice2 = '2';
      gameData.curCard = 'fresh_start';
      userData.beforeActionCards.splice(userData.beforeActionCards.indexOf('fresh_start'), 1);
    } else if (req.cardName === 'reverse' && userData.beforeActionCards.some((e) => e === 'reverse')) {
      gameData.turnIdx = gameData.alivePlayers.length - 1 - gameData.turnIdx;
      gameData.alivePlayers = gameData.alivePlayers.reverse();
      gameData.curCard = 'reverse';
      userData.beforeActionCards.splice(userData.beforeActionCards.indexOf('reverse'), 1);
    } else if (req.cardName === 'my_bad' && userData.beforeActionCards.some((e) => e === 'my_bad')) {
      userData.isMyBadActive = true;
      clientInfo[gameData.currentPlayerId].isMyBadActive = true;
      gameData.curCard = 'my_bad';
      userData.beforeActionCards.splice(userData.beforeActionCards.indexOf('my_bad'), 1);
    } else if (req.cardName === 'revive' && userData.beforeActionCards.some((e) => e === 'revive')) {
      if (userData.strikes > 0) {
        userData.strikes -= 1;
        clientInfo[gameData.currentPlayerId].strikes = userData.strikes;
        gameData.curCard = 'revive';
        userData.beforeActionCards.splice(userData.beforeActionCards.indexOf('revive'), 1);
      } else {
        success = false;
      }
    } else if (req.cardName === 'skip' && userData.beforeActionCards.some((e) => e === 'skip')) {
      gameData.turnIdx = (gameData.turnIdx + 1) % gameData.alivePlayers.length;
      gameData.prevPlayerId = gameData.currentPlayerId;
      gameData.currentPlayerId = gameData.alivePlayers[gameData.turnIdx];
      gameData.curCard = 'skip';
      userData.beforeActionCards.splice(userData.beforeActionCards.indexOf('skip'), 1);
    } else {
      success = false;
    }
  } else if (req.cardType === 'after') {
    // todo
  } else {
    success = false;
  }
  if (!success) {
    socket.emit('useCard', {
      success: false
    });
  }

  gameData.curStage = 'use-card-stage';
  await gameService.updateGame({
    ...gameData
  });
  await gameService.updateUser({
    ...userData,
    id: gameData.currentPlayerId,
  });
  await Promise.all(gameData.clients.map(async (id) => { // might be anti-pattern?
    await gameService.getUser(id).then((userData) => {
      io.to(id).emit('useCard', {
        success: true,
        gameId: req.gameId,
        active: gameData.active,
        isHost: (id === gameData.hostId),
        isTurn: (id === gameData.currentPlayerId),
        clients: clientInfo,
        currentPlayerId: gameData.currentPlayerId,
        prevPlayerId: gameData.prevPlayerId,
        reportedDice1: gameData.reportedDice1,
        reportedDice2: gameData.reportedDice2,
        dice1: gameData.dice1,
        dice2: gameData.dice2,
        curStage: gameData.curStage,
        turnResult: gameData.turnResult,
        pressedOk: gameData.pressedOk,
        beforeActionCards: userData.beforeActionCards,
        afterActionCards: userData.afterActionCards,
        curCard: gameData.curCard,
      });
    });
  }));
};

const rollDice = async (socket, io, req) => {
  if (!await gameService.existsGame(req.gameId)) {
    socket.emit('rollDice', {
      success: false
    });
    return;
  }
  const gameData = await gameService.getGame(req.gameId);
  if (req.id !== gameData.currentPlayerId) {
    socket.emit('rollDice', {
      success: false
    });
    return;
  }

  await gameService.updateGame({
    ...gameData,
    dice1: gameData.dice1 = Math.ceil(Math.random() * 6),
    dice2: gameData.dice2 = Math.ceil(Math.random() * 6),
    curStage: gameData.curStage = 'after-roll-stage',
  });
  socket.emit('rollDice', {
    success: true,
    dice1: gameData.dice1,
    dice2: gameData.dice2,
    curStage: gameData.curStage
  });
  gameData.clients.forEach((id) => {
    socket.to(id).emit('rollDiceOther', {
      curStage: gameData.curStage
    });
  });
};

const declareScore = async (socket, io, req) => {
  if (!await gameService.existsGame(req.gameId)) {
    socket.emit('declareScore', {
      success: false
    });
    return;
  }
  const gameData = await gameService.getGame(req.gameId);
  if (req.id !== gameData.currentPlayerId) {
    socket.emit('declareScore', {
      success: false
    });
    return;
  }

  if (req.declareType === 'honest') {
    if (((req.dice1 === gameData.dice1 && req.dice2 === gameData.dice2)
    || (req.dice1 === gameData.dice2 && req.dice2 === gameData.dice1))
    && compareRoll(req.dice1, req.dice2, gameData.reportedDice1, gameData.reportedDice2)) {
      gameData.turnIdx = (gameData.turnIdx + 1) % gameData.alivePlayers.length;
      gameData.prevPlayerId = gameData.currentPlayerId;
      gameData.currentPlayerId = gameData.alivePlayers[gameData.turnIdx];
      gameData.reportedDice1 = req.dice1;
      gameData.reportedDice2 = req.dice2;
      gameData.curStage = 'accept-stage';
      gameData.turnResult = 'honest';
      await gameService.updateGame({
        ...gameData,
      });
      gameData.clients.forEach((id) => {
        io.to(id).emit('declareScore', {
          success: true,
          isTurn: (id === gameData.currentPlayerId),
          reportedDice1: gameData.reportedDice1,
          reportedDice2: gameData.reportedDice2,
          currentPlayerId: gameData.currentPlayerId,
          prevPlayerId: gameData.prevPlayerId,
          curStage: gameData.curStage
        });
      });
    } else {
      socket.emit('declareScore', {
        success: false
      });
    }
  } else if (req.declareType === 'bluff') {
    if (compareRoll(req.dice1, req.dice2, gameData.reportedDice1, gameData.reportedDice2)) {
      gameData.turnIdx = (gameData.turnIdx + 1) % gameData.alivePlayers.length;
      gameData.prevPlayerId = gameData.currentPlayerId;
      gameData.currentPlayerId = gameData.alivePlayers[gameData.turnIdx];
      gameData.reportedDice1 = req.dice1;
      gameData.reportedDice2 = req.dice2;
      gameData.curStage = 'accept-stage';
      gameData.turnResult = 'bluff';
      await gameService.updateGame({
        ...gameData,
      });
      socket.emit('declareScore', {
        success: true,
        reportedDice1: gameData.reportedDice1,
        reportedDice2: gameData.reportedDice2,
        currentPlayerId: gameData.currentPlayerId,
        prevPlayerId: gameData.prevPlayerId,
        curStage: gameData.curStage,
      });
      gameData.clients.forEach((id) => {
        io.to(id).emit('declareScore', {
          success: true,
          isTurn: (id === gameData.currentPlayerId),
          reportedDice1: gameData.reportedDice1,
          reportedDice2: gameData.reportedDice2,
          currentPlayerId: gameData.currentPlayerId,
          prevPlayerId: gameData.prevPlayerId,
          curStage: gameData.curStage
        });
      });
    } else {
      socket.emit('declareScore', {
        success: false
      });
    }
  } else {
    socket.emit('declareScore', {
      success: false
    });
  }
};

const acceptAttempt = async (socket, io, req) => {
  if (!await gameService.existsGame(req.gameId)) {
    socket.emit('acceptAttempt', {
      success: false
    });
    return;
  }
  const gameData = await gameService.getGame(req.gameId);
  if (req.id !== gameData.currentPlayerId) {
    socket.emit('acceptAttempt', {
      success: false
    });
    return;
  }
  const curUserData = await gameService.getUser(gameData.currentPlayerId);
  const prevUserData = await gameService.getUser(gameData.prevPlayerId);
  const clientInfo = await gameService.getClientInfo(req.gameId);

  if (req.declareType === 'accept' || req.declareType === 'call') {
    gameData.turnResult = `${gameData.turnResult}-${req.declareType}`;
    gameData.curStage = 'result-stage';
    if (gameData.turnResult === 'honest-accept') {
      // console.log('nothing happens');
    } else if (gameData.turnResult === 'honest-call') {
      if (clientInfo[gameData.currentPlayerId].isMyBadActive) {
        clientInfo[gameData.currentPlayerId] = false;
      } else {
        clientInfo[gameData.currentPlayerId].strikes += 1;
        if (clientInfo[gameData.currentPlayerId].strikes === 3) {
          clientInfo[gameData.currentPlayerId].alive = false;
        }
      }
      curUserData.strikes = clientInfo[gameData.currentPlayerId].strikes;
      curUserData.alive = clientInfo[gameData.currentPlayerId].alive;
      gameData.clientInfo = clientInfo;
    } else if (gameData.turnResult === 'bluff-accept') {
      if (gameData.actionCardDeck.length !== 0) {
        const tempCard = gameData.actionCardDeck.pop();
        if (tempCard === 'jackpot' || tempCard === 'double' || tempCard === 'up_down') {
          prevUserData.afterActionCards.push(tempCard);
        } else {
          prevUserData.beforeActionCards.push(tempCard);
        }
      }
    } else if (gameData.turnResult === 'bluff-call') {
      if (clientInfo[gameData.prevPlayerId].isMyBadActive) {
        clientInfo[gameData.prevPlayerId] = false;
      } else {
        clientInfo[gameData.prevPlayerId].strikes += 1;
        if (clientInfo[gameData.prevPlayerId].strikes === 3) {
          clientInfo[gameData.prevPlayerId].alive = false;
        }
      }
      prevUserData.strikes = clientInfo[gameData.prevPlayerId].strikes;
      prevUserData.alive = clientInfo[gameData.prevPlayerId].alive;
      gameData.clientInfo = clientInfo;
    }

    for (let i = gameData.alivePlayers.length - 1; i >= 0; i -= 1) {
      if (!clientInfo[gameData.alivePlayers[i]].alive) {
        gameData.deadPlayers.push(gameData.alivePlayers[i]);
        gameData.alivePlayers.splice(i, 1);
      }
    }
    if (gameData.alivePlayers.length === 1) { // temp - is 1 in production
      gameData.active = false;
    }
    await gameService.updateGame({ // all adjusted accordingly earlier
      ...gameData,
    });
    await gameService.updateUser({ // all adjusted accordingly earlier
      ...curUserData,
      id: gameData.currentPlayerId,
    });
    await gameService.updateUser({ // all adjusted accordingly earlier
      ...prevUserData,
      id: gameData.prevPlayerId,
    });
    await Promise.all(gameData.clients.map(async (id) => {
      await gameService.getUser(id).then((userData) => {
        io.to(id).emit('acceptAttempt', {
          success: true,
          active: gameData.active,
          isTurn: (id === gameData.currentPlayerId),
          clients: clientInfo,
          currentPlayerId: gameData.currentPlayerId,
          prevPlayerId: gameData.prevPlayerId,
          reportedDice1: gameData.reportedDice1,
          reportedDice2: gameData.reportedDice2,
          dice1: gameData.dice1,
          dice2: gameData.dice2,
          curStage: gameData.curStage,
          turnResult: gameData.turnResult,
          beforeActionCards: userData.beforeActionCards,
          afterActionCards: userData.afterActionCards,
        });
      });
    }));
  } else {
    socket.emit('acceptAttempt', {
      success: false
    });
  }
};

const handleOk = async (socket, io, req) => { // todo: only allow request once a round
  if (!await gameService.existsGame(req.gameId)) {
    socket.emit('handleOk', {
      success: false
    });
    return;
  }

  const gameData = await gameService.getGame(req.gameId);
  await gameService.updateGame({
    ...gameData,
    pressedOk: gameData.pressedOk -= 1,
  });
  if (gameData.pressedOk === 0) {
    await nextRound(socket, io, req);
  } else {
    gameData.clients.forEach((id) => {
      io.to(id).emit('handleOk', {
        success: true,
        pressedOk: gameData.pressedOk,
      });
    });
  }
};

const gameController = {
  createGame,
  joinGame,
  initGame,
  nextRound,
  useCard,
  rollDice,
  declareScore,
  acceptAttempt,
  handleOk,
};

export default gameController;
