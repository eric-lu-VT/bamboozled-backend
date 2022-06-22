# Bamboozled Backend

Backend for the [Bamboozled App](https://github.com/eric-lu-VT/bamboozled-app).

## Architecture

Built in Node/Express with a MongoDB Database for HTTP requests and a Redis Database for socket.io requests.

## Directory Structure
    .
    ├── ...         
    ├── src                    
    |   └── authentication     # authorize header with JWT
    │   └── controllers        # accept CRUD request from router; dispatch output to frontend
    │   └── errors             # custom error handling
    │   └── helpers            # constant variables
    |   └── models             # Schemas for MongoDB backend
    │   └── routers            # Route url endpoint to correct controller
    |     └── __tests__        # Test cases for routers
    │   └── services           # Call database to handle requests
    |     └── __tests__        # Test cases for services
    |   └── validation         # Schemas for CRUD validation
    ├── .babelrc               # JavaScript backwards compatibility
    ├── .eslintrc.json         # eslint setup
    ├── package.json           # npm config
    └── ...

## Setup

1. Add the file `.env` in the root directory
2. Set `AUTH_SECRET` to any string
3. Set MONGODB_URI to MongoDB `mongodb+srv://...` link used for backend
4. Set ORIGIN to http://localhost:3000 for local access
5. Set REDIS_URL to http://localhost:6379 for local access
   - Make sure you actually start the redis-cli on your local machine
