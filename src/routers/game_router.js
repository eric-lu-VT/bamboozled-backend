import { createGame } from '../controllers/game_controller';

export const gameController = async (socket, req) => {
  switch (req.url) {
    case 'create_game':
      await createGame(socket, req);
      break;
    default:
      break;
  }
};
