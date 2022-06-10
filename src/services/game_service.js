import redisClient from '../redis';

const createGame = async (gameId) => {
  redisClient.hset(gameId, {
    a: 'b',
  });
};

const gameService = {
  createGame
};

export default gameService;
