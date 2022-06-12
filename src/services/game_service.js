import redisClient from '../redis';

function makeGameId(length) {
  let str = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < length; i += 1) {
    str += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return str;
}

const createGame = async (req) => {
  const gameId = makeGameId(4);

  await redisClient.hset(gameId, {
    gameId,
    active: 'false',
    hostId: req.id,
    clients: JSON.stringify([req.id]),
    turnIdx: '0',
    reportedRoll: '0',
    actualRoll: '0',
    currentPlayer: '',
    prevPlayer: '',
    MIN_NUM_PLAYERS: '1',
    MAX_NUM_PLAYERS: '8',
    pressedOk: '0'
  });

  await redisClient.hset(req.id, {
    gameId,
    clientName: req.username,
    lives: '0',
    alive: 'false'
  });

  return {
    gameId,
    active: false,
    lives: 0,
    alive: false,
  };
};

const joinGame = async (req) => {
  if (await redisClient.exists(req.gameId) === 0) {
    return {
      success: false
    };
  }
  const gameData = await redisClient.hgetall(req.gameId);
  gameData.clients = JSON.parse(gameData.clients);

  if (gameData.active === 'true'
    || parseInt(gameData.MAX_NUM_PLAYERS, 10) >= gameData.clients.length
    || gameData.clients.includes(req.id)
  ) {
    if (gameData.clients.includes(req.id)) {
      const userData = await redisClient.hgetall(req.id);

      return {
        success: true,
        gameId: req.gameId,
        active: gameData.active === 'true',
        lives: parseInt(userData.lives, 10),
        alive: userData.alive === 'true',
      };
    // eslint-disable-next-line no-else-return
    } else {
      return {
        success: false,
      };
    }
  }

  await redisClient.hset(req.gameId, {
    gameId: gameData.gameId,
    active: gameData.active,
    hostId: gameData.hostId,
    clients: JSON.stringify(gameData.clients.push(req.id)),
    turnIdx: gameData.turnIdx,
    reportedRoll: gameData.reportedRoll,
    actualRoll: gameData.actualRoll,
    currentPlayer: gameData.currentPlayer,
    prevPlayer: gameData.prevPlayer,
    MIN_NUM_PLAYERS: gameData.MIN_NUM_PLAYERS,
    MAX_NUM_PLAYERS: gameData.MAX_NUM_PLAYERS,
    pressedOk: gameData.pressedOk,
  });

  await redisClient.hset(req.id, {
    gameId: req.gameId,
    clientName: req.username,
    lives: '0',
    alive: 'false'
  });

  return {
    success: true,
    gameId: req.gameId,
    active: false,
    lives: 0,
    alive: false,
  };
};

const gameService = {
  createGame,
  joinGame
};

export default gameService;
