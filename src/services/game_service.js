import redisClient from '../redis';

const updateGame = async ({
  gameId,
  active,
  hostId,
  clients,
  alivePlayers,
  deadPlayers,
  actionCardDeck,
  turnIdx,
  reportedDice1,
  reportedDice2,
  dice1,
  dice2,
  currentPlayerId,
  prevPlayerId,
  MIN_NUM_PLAYERS,
  MAX_NUM_PLAYERS,
  curStage,
  turnResult,
  pressedOk,
  curCard,
}) => {
  await redisClient.hset(gameId, {
    gameId,
    active,
    hostId,
    clients: JSON.stringify(clients),
    alivePlayers: JSON.stringify(alivePlayers),
    deadPlayers: JSON.stringify(deadPlayers),
    actionCardDeck: JSON.stringify(actionCardDeck),
    turnIdx,
    reportedDice1,
    reportedDice2,
    dice1,
    dice2,
    currentPlayerId,
    prevPlayerId,
    MIN_NUM_PLAYERS,
    MAX_NUM_PLAYERS,
    curStage,
    turnResult,
    pressedOk,
    curCard,
  });
};

const getGame = async (gameId) => {
  const gameData = await redisClient.hgetall(gameId);
  gameData.active = (gameData.active === 'true');
  gameData.clients = JSON.parse(gameData.clients);
  gameData.alivePlayers = JSON.parse(gameData.alivePlayers);
  gameData.deadPlayers = JSON.parse(gameData.deadPlayers);
  gameData.actionCardDeck = JSON.parse(gameData.actionCardDeck);
  gameData.turnIdx = parseInt(gameData.turnIdx, 10);
  gameData.reportedDice1 = parseInt(gameData.reportedDice1, 10);
  gameData.reportedDice2 = parseInt(gameData.reportedDice2, 10);
  gameData.dice1 = parseInt(gameData.dice1, 10);
  gameData.dice2 = parseInt(gameData.dice2, 10);
  gameData.MIN_NUM_PLAYERS = parseInt(gameData.MIN_NUM_PLAYERS, 10);
  gameData.MAX_NUM_PLAYERS = parseInt(gameData.MAX_NUM_PLAYERS, 10);
  gameData.pressedOk = parseInt(gameData.pressedOk, 10);
  return gameData;
};

const existsGame = async (gameId) => await redisClient.exists(gameId) === 1;

const updateUser = async ({
  id,
  username,
  gameId,
  strikes,
  alive,
  beforeActionCards,
  afterActionCards,
  isMyBadActive,
}) => {
  await redisClient.hset(id, {
    gameId,
    username,
    strikes,
    alive,
    beforeActionCards: JSON.stringify(beforeActionCards),
    afterActionCards: JSON.stringify(afterActionCards),
    isMyBadActive
  });
};

const getUser = async (id) => {
  const userData = await redisClient.hgetall(id);
  userData.strikes = parseInt(userData.strikes, 10);
  userData.alive = (userData.alive === 'true');
  userData.beforeActionCards = JSON.parse(userData.beforeActionCards);
  userData.afterActionCards = JSON.parse(userData.afterActionCards);
  userData.isMyBadActive = (userData.isMyBadActive === 'true');
  return userData;
};

const getClientInfo = async (gameId) => { // gets ALL client info in a given game
  const clients = await JSON.parse(await redisClient.hget(gameId, 'clients'));
  const res = {};

  await Promise.all(clients.map(async (userId) => { // might be anti-pattern?
    await getUser(userId).then((userData) => {
      res[userId] = {
        username: userData.username,
        strikes: userData.strikes,
        alive: userData.alive,
        isMyBadActive: userData.isMyBadActive,
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
