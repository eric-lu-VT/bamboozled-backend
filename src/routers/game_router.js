import gameController from '../controllers/game_controller';

export const gameRouter = async (socket, io, req) => {
  switch (req.url) {
    case 'createGame':
      await gameController.createGame(socket, io, req);
      break;
    case 'joinGame':
      await gameController.joinGame(socket, io, req);
      break;
    case 'initGame':
      await gameController.initGame(socket, io, req);
      break;
    case 'nextRound':
      await gameController.nextRound(socket, io, req);
      break;
    case 'rollDice':
      await gameController.rollDice(socket, io, req);
      break;
    case 'declareScore':
      await gameController.declareScore(socket, io, req);
      break;
    case 'acceptAttempt':
      await gameController.acceptAttempt(socket, io, req);
      break;
    default:
      break;
  }
};
