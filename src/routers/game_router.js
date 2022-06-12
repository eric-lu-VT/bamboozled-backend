import gameController from '../controllers/game_controller';

export const gameRouter = async (socket, req) => {
  switch (req.url) {
    case 'create_game':
      await gameController.createGame(socket, req);
      break;
    case 'join_game':
      await gameController.joinGame(socket, req);
      break;
    default:
      break;
  }
};
