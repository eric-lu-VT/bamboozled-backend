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
  return (10 * d1 + d2 >= 10 * rd1 + rd2);
}

const createGame = async (socket, io, req) => {
  const gameId = makeGameId(4);

  await gameService.updateGame(
    gameId, // gameId
    'false', // active
    req.id, // hostId
    [req.id], // clients
    [], // alivePlayers
    [], // deadPlayers
    '0', // turnIdx
    '1', // reportedDice1,
    '2', // reportedDice2,
    '0', // dice1,
    '0', // dice2
    '', // currentPlayer
    '', // prevPlayer
    '1', // MIN_NUM_PLAYERS
    '8', // MAX_NUM_PLAYERS
    'before-roll-stage', // curStage
    '', // turnResult
    '0' // pressedOk
  );
  await gameService.updateUser(
    req.id, // id
    req.username, // username
    gameId, // gameId
    0, // lives
    false // alive
  );

  socket.join(req.id);
  socket.emit('joinGame', {
    success: true,
    gameId,
    active: false,
    isHost: true,
    clients: {
      [req.id]: {
        username: req.username,
        lives: 0,
        alive: false,
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
    console.log('reconnect attempt');
    if (gameData.clients.includes(req.id)) {
      socket.join(req.id);
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
      });
    } else {
      socket.emit('gameReconnect', {
        success: false,
      });
    }
  } else {
    // new user connecting
    console.log('new user connecting attempt');
    await gameService.updateGame(
      gameData.gameId,
      gameData.active,
      gameData.hostId,
      gameData.clients = gameData.clients.concat([req.id]),
      gameData.alivePlayers,
      gameData.deadPlayers,
      gameData.turnIdx,
      gameData.reportedDice1,
      gameData.reportedDice2,
      gameData.dice1,
      gameData.dice2,
      gameData.currentPlayerId,
      gameData.prevPlayerId,
      gameData.MIN_NUM_PLAYERS,
      gameData.MAX_NUM_PLAYERS,
      gameData.curStage,
      gameData.turnResult,
      gameData.pressedOk,
    );

    await gameService.updateUser(
      req.id, // id
      req.username, // username
      req.gameId, // gameId
      0, // lives
      false // alive
    );

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

  await gameService.updateGame(
    gameData.gameId,
    gameData.active = true,
    gameData.hostId,
    gameData.clients,
    gameData.alivePlayers = gameData.clients,
    gameData.deadPlayers,
    gameData.turnIdx = Math.floor(Math.random() * gameData.alivePlayers.length),
    gameData.reportedDice1 = 1,
    gameData.reportedDice2 = 2,
    gameData.dice1 = 0,
    gameData.dice2 = 0,
    gameData.currentPlayerId = gameData.alivePlayers[gameData.turnIdx],
    gameData.prevPlayerId = gameData.alivePlayers[floorMod(gameData.turnIdx - 1, gameData.alivePlayers.length)],
    gameData.MIN_NUM_PLAYERS,
    gameData.MAX_NUM_PLAYERS,
    gameData.curStage = 'before-roll-stage',
    gameData.turnResult = '',
    gameData.pressedOk = 0,
  );

  gameData.clients.forEach((id) => {
    io.to(id).emit('initGame', {
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
    });
  });
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

  await gameService.updateGame(
    gameData.gameId,
    gameData.active,
    gameData.hostId,
    gameData.clients,
    gameData.alivePlayers,
    gameData.deadPlayers,
    gameData.turnIdx = Math.floor(Math.random() * gameData.alivePlayers.length),
    gameData.reportedDice1 = 0,
    gameData.reportedDice2 = 0,
    gameData.dice1 = 0,
    gameData.dice2 = 0,
    gameData.currentPlayerId = gameData.alivePlayers[gameData.turnIdx],
    gameData.prevPlayerId = gameData.alivePlayers[floorMod(gameData.turnIdx - 1, gameData.alivePlayers.length)],
    gameData.MIN_NUM_PLAYERS,
    gameData.MAX_NUM_PLAYERS,
    gameData.curStage = 'before-roll-stage',
    gameData.turnResult = '',
    gameData.pressedOk = 0,
  );

  gameData.clients.forEach((id) => {
    io.to(id).emit('nextRound', {
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
    });
  });
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

  await gameService.updateGame(
    gameData.gameId,
    gameData.active,
    gameData.hostId,
    gameData.clients,
    gameData.alivePlayers,
    gameData.deadPlayers,
    gameData.turnIdx,
    gameData.reportedDice1,
    gameData.reportedDice2,
    gameData.dice1 = Math.ceil(Math.random() * 6),
    gameData.dice2 = Math.ceil(Math.random() * 6),
    gameData.currentPlayerId,
    gameData.prevPlayerId,
    gameData.MIN_NUM_PLAYERS,
    gameData.MAX_NUM_PLAYERS,
    gameData.curStage = 'after-roll-stage',
    gameData.turnResult,
    gameData.pressedOk,
  );
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
      await gameService.updateGame(
        gameData.gameId,
        gameData.active,
        gameData.hostId,
        gameData.clients,
        gameData.alivePlayers,
        gameData.deadPlayers,
        gameData.turnIdx = (gameData.turnidx + 1) % gameData.alivePlayers.length,
        gameData.reportedDice1 = req.dice1,
        gameData.reportedDice2 = req.dice2,
        gameData.dice1,
        gameData.dice2,
        gameData.currentPlayerId = gameData.alivePlayers[gameData.turnIdx],
        gameData.prevPlayerId = req.id,
        gameData.MIN_NUM_PLAYERS,
        gameData.MAX_NUM_PLAYERS,
        gameData.curStage = 'accept-stage',
        gameData.turnResult = 'honest',
        gameData.pressedOk = 0,
      );
      socket.emit('declareScore', {
        success: true,
        reportedDice1: gameData.reportedDice1,
        reportedDice2: gameData.reportedDice2,
        currentPlayerId: gameData.currentPlayerId,
        prevPlayerId: gameData.prevPlayerId,
        curStage: gameData.curStage,
      });
      gameData.clients.forEach((id) => {
        socket.to(id).emit('declareScoreOther', {
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
      await gameService.updateGame(
        gameData.gameId,
        gameData.active,
        gameData.hostId,
        gameData.clients,
        gameData.alivePlayers,
        gameData.deadPlayers,
        gameData.turnIdx = (gameData.turnidx + 1) % gameData.alivePlayers.length,
        gameData.reportedDice1 = req.dice1,
        gameData.reportedDice2 = req.dice2,
        gameData.dice1,
        gameData.dice2,
        gameData.currentPlayerId = gameData.alivePlayers[gameData.turnIdx],
        gameData.prevPlayerId = req.id,
        gameData.MIN_NUM_PLAYERS,
        gameData.MAX_NUM_PLAYERS,
        gameData.curStage = 'accept-stage',
        gameData.turnResult = 'bluff',
        gameData.pressedOk = 0,
      );
      socket.emit('declareScore', {
        success: true,
        reportedDice1: gameData.reportedDice1,
        reportedDice2: gameData.reportedDice2,
        currentPlayerId: gameData.currentPlayerId,
        prevPlayerId: gameData.prevPlayerId,
        curStage: gameData.curStage,
      });
      gameData.clients.forEach((id) => {
        socket.to(id).emit('declareScoreOther', {
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

const gameController = {
  createGame,
  joinGame,
  initGame,
  nextRound,
  rollDice,
  declareScore
};

export default gameController;
