import redisClient from '../redis';

const updateGame = async (
  gameId,
  active,
  hostId,
  clients,
  turnIdx,
  reportedRoll,
  actualRoll,
  currentPlayer,
  prevPlayer,
  MIN_NUM_PLAYERS,
  MAX_NUM_PLAYERS,
  pressedOk
) => {
  await redisClient.hset(gameId, {
    gameId,
    active,
    hostId,
    clients: JSON.stringify(clients),
    turnIdx,
    reportedRoll,
    actualRoll,
    currentPlayer,
    prevPlayer,
    MIN_NUM_PLAYERS,
    MAX_NUM_PLAYERS,
    pressedOk,
  });
};

const getGame = async (gameId) => {
  const gameData = await redisClient.hgetall(gameId);
  gameData.active = (gameData.active === 'true');
  gameData.clients = JSON.parse(gameData.clients);
  gameData.turnIdx = parseInt(gameData.turnIdx, 10);
  gameData.reportedRoll = parseInt(gameData.reportedRoll, 10);
  gameData.actualRoll = parseInt(gameData.actualRoll, 10);
  gameData.MIN_NUM_PLAYERS = parseInt(gameData.MIN_NUM_PLAYERS, 10);
  gameData.MAX_NUM_PLAYERS = parseInt(gameData.MAX_NUM_PLAYER, 10);
  gameData.pressedOk = parseInt(gameData.pressedOk, 10);

  return gameData;
};

const existsGame = async (gameId) => await redisClient.exists(gameId) === 1;

const updateUser = async (
  id,
  username,
  gameId,
  lives,
  alive
) => {
  await redisClient.hset(id, {
    gameId,
    username,
    lives,
    alive,
  });
};

const getUser = async (id) => {
  const userData = await redisClient.hgetall(id);
  userData.lives = parseInt(userData.lives, 10);
  userData.alive = (userData.alive === 'true');

  return userData;
};

const gameService = {
  updateGame,
  getGame,
  existsGame,
  updateUser,
  getUser,
};

export default gameService;
