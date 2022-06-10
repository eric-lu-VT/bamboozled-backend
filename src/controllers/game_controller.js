function makeGameId(length) {
  let str = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < length; i += 1) {
    str += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return str;
}

export const createGame = async (socket, req) => {
  const gameId = makeGameId(4);

  const res = {
    gameId
  };
  console.log(res);

  socket.emit('createGame', res);
};
