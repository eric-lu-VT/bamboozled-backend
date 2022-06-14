import redisClient from '../redis';

const updateGame = async (
  gameId,
  active,
  hostId,
  clients,
  alivePlayers,
  deadPlayers,
  turnIdx,
  reportedRoll,
  dice1,
  dice2,
  currentPlayerId,
  prevPlayerId,
  MIN_NUM_PLAYERS,
  MAX_NUM_PLAYERS,
  curStage,
  turnResult,
  pressedOk
) => {
  await redisClient.hset(gameId, {
    gameId,
    active,
    hostId,
    clients: JSON.stringify(clients),
    alivePlayers: JSON.stringify(alivePlayers),
    deadPlayers: JSON.stringify(deadPlayers),
    turnIdx,
    reportedRoll,
    dice1,
    dice2,
    currentPlayerId,
    prevPlayerId,
    MIN_NUM_PLAYERS,
    MAX_NUM_PLAYERS,
    curStage,
    turnResult,
    pressedOk,
  });
};

const getGame = async (gameId) => {
  const gameData = await redisClient.hgetall(gameId);
  gameData.active = (gameData.active === 'true');
  gameData.clients = JSON.parse(gameData.clients);
  gameData.alivePlayers = JSON.parse(gameData.alivePlayers);
  gameData.deadPlayers = JSON.parse(gameData.deadPlayers);
  gameData.turnIdx = parseInt(gameData.turnIdx, 10);
  gameData.reportedRoll = parseInt(gameData.reportedRoll, 10);
  gameData.dice1 = parseInt(gameData.dice1, 10);
  gameData.dice2 = parseInt(gameData.dice2, 10);
  gameData.MIN_NUM_PLAYERS = parseInt(gameData.MIN_NUM_PLAYERS, 10);
  gameData.MAX_NUM_PLAYERS = parseInt(gameData.MAX_NUM_PLAYERS, 10);
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

const getClientInfo = async (gameId) => { // gets ALL client info in a given game
  const clients = await JSON.parse(await redisClient.hget(gameId, 'clients'));
  const res = {};

  await Promise.all(clients.map(async (userId) => { // might be anti-pattern?
    await getUser(userId).then((userData) => {
      res[userId] = {
        username: userData.username,
        lives: userData.lives,
        alive: userData.alive
      };
    });
  }));

  return res;
};

const gameService = {
  updateGame,
  getGame,
  existsGame,
  updateUser,
  getUser,
  getClientInfo,
};

export default gameService;
