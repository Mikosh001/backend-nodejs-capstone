# SecondChance

SecondChance is an IBM Skills Network capstone marketplace for giving away used items. The Express API uses MongoDB and JWT authentication. The React client lists, searches, and displays items. A separate API scores text sentiment.

## Run locally

Use Node.js 22 and a running MongoDB instance. Copy `secondChance-backend/.env.sample` to `secondChance-backend/.env` and set a strong, unique `JWT_SECRET`. Keep the .env file local.

```sh
npm ci --prefix secondChance-backend
(cd secondChance-backend && node util/import-mongo/index.js)
npm start --prefix secondChance-backend
```

In a second terminal, install and build the client and start the web server.

```sh
npm ci --legacy-peer-deps --prefix secondChance-frontend
npm run build --prefix secondChance-frontend
cp -R secondChance-frontend/build secondChanceWebsite/build
npm ci --prefix secondChanceWebsite
npm start --prefix secondChanceWebsite
```

Open [the local site](http://localhost:8080). The website forwards API requests and images to the local back end by default. Set `BACKEND_URL` on the website to use a different back end. For a browser that must contact a separately hosted API directly, set `REACT_APP_BACKEND_URL` before building the React client.

Run the sentiment service with `npm ci --prefix sentiment` and `npm start --prefix sentiment`. It accepts POST requests at `/sentiment` with a JSON body such as `{"sentence":"I love this."}`.

## Containers and Kubernetes

Build the API with `docker build -t secondchance-backend ./secondChance-backend`. Build the website from the repository root with `docker build -t secondchance-website -f secondChanceWebsite/Dockerfile .`. Configure the API container with `MONGO_URL` and `JWT_SECRET`. Mount durable storage for uploaded images by setting `UPLOAD_DIR` to a writable mounted path.

For MongoDB in Kubernetes, create a Secret named `secondchance-mongo` containing `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD`, then apply `deploymongo.yml`. Point the API to the internal `mongodb` service and use `authSource=admin` with the initialization credentials. Seed a new database with the import command above.
