import { gameService } from 'services';

const createGame = async (socket, req) => {
  const res = await gameService.createGame(req);
  socket.emit('createGame', res);
};

const joinGame = async (socket, req) => {
  const res = await gameService.joinGame(req);
  socket.emit('joinGame', res);
};

const gameController = {
  createGame,
  joinGame
};

export default gameController;
