# Air Quality Dashboard

This repository contains a React + TypeScript front-end and a small Node.js backend used for local development of an air-quality dashboard. The app shows AQI cards, charts, and a predictive placeholder that uses a deterministic mock API.

Quick start (development)

1. Install dependencies for frontend and backend:

```bash
# from repo root
npm install
cd backend
npm install
cd ..
```

2. Run backend (defaults to port 3000):

```bash
cd backend
node server.js
```

3. Run frontend dev server (uses react-scripts wrapper in scripts/):

```bash
npm start
# then open the printed Local URL (often http://localhost:3000 or 3001/3002 during dev)
```

Notes
- This repo was cleaned to remove committed dependency trees (backend/node_modules) — run fresh installs locally.
- The predictive endpoint `/api/predict/:city` is a deterministic mock for UI development.

Contributing
- Open issues or PRs for UX improvements, tests, or deployment pipelines.

License
- Add a license if you want to publish this publicly.
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
