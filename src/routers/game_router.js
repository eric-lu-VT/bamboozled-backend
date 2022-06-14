import gameController from '../controllers/game_controller';

export const gameRouter = async (socket, req) => {
  switch (req.url) {
    case 'createGame':
      await gameController.createGame(socket, req);
      break;
    case 'joinGame':
      await gameController.joinGame(socket, req);
      break;
    default:
      break;
  }
};
