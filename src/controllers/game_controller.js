import { gameService } from 'services';

function makeGameId(length) {
  let str = '';
  const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'; // no O
  for (let i = 0; i < length; i += 1) {
    str += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return str;
}

const createGame = async (socket, req) => {
  const gameId = makeGameId(4);

  await gameService.updateGame(
    gameId, // gameId
    'false', // active
    req.id, // hostId
    [req.id], // clients
    '0', // turnIdx
    '0', // reportedRoll
    '0', // dice1,
    '0', // dice2
    '', // currentPlayer
    '', // prevPlayer
    '1', // MIN_NUM_PLAYERS
    '8', // MAX_NUM_PLAYERS
    'roll-stage', // curStage
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

const joinGame = async (socket, req) => {
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
        isTurn: (req.id === gameData.currentPlayer),
        clients: clientInfo,
        currentPlayerId: gameData.currentPlayerId,
        prevPlayerId: gameData.prevPlayerId,
        reportedRoll: gameData.reportedRoll,
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
      gameData.turnIdx,
      gameData.reportedRoll,
      gameData.actualRoll,
      gameData.currentPlayerId,
      gameData.prevPlayerId,
      gameData.MIN_NUM_PLAYERS,
      gameData.MAX_NUM_PLAYERS,
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

const gameController = {
  createGame,
  joinGame
};

export default gameController;
