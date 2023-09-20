import express from "express";
import bodyParser from "body-parser";
import favicon from "serve-favicon";
import path from "path";
import request from "request";
import dotenv from "dotenv"; 

dotenv.config();

const app = express();
const port = 3000;

// Constants
const API_KEY = process.env.API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Define the absolute paths manually
const publicPath = path.join(process.cwd(), 'public');
const faviconPath = path.join(publicPath, 'assets', 'favicon.ico');

const movies = [];
const tvshows = [];

// Middleware
app.use(express.static(publicPath));
app.use(favicon(faviconPath));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Extract the current page from the request path
app.use((req, res, next) => {
  res.locals.currentPage = req.path.substring(1); 
  next();
});

// Fetch data from TMDb API
function fetchTrendingData(endpoint, res, callback) {
  const options = {
    url: `${BASE_URL}/${endpoint}?api_key=${API_KEY}`,
    json: true,
  };

  request(options, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    } else {
      callback(body.results);
    }
  });
}

// Routes
app.get('/', (req, res) => {
  fetchTrendingData('trending/movie/week', res, (trendingMovies) => {
    fetchTrendingData('trending/tv/week', res, (trendingTvShows) => {
      res.render('index', {
        trendingMovies,
        trendingTvShows,
      });
    });
  });
});

app.get("/movies", (req, res) => {
  res.render("movies.ejs", { tasks: movies });
});

app.get("/tvshows", (req, res) => {
  res.render("tvshows.ejs", { tasks: tvshows });
});

app.get('/result', (req, res) => {
  let query = req.query.search;
  let filter = req.query.filter || 'movie';
  let page = parseInt(req.query.page) || 1; 

  // Calculate the offset based on the current page
  let offset = (page - 1) * 20;

  // Set the appropriate BASE_URL based on the filter selection
  let endpoint = (filter === 'tv') ? 'search/tv' : 'search/movie';

  request(`${BASE_URL}/${endpoint}?api_key=${API_KEY}&query=${query}&page=${page}`, (error, response, body) => {
    if (error) {
      console.log(error);
    } else {
      let data = JSON.parse(body);

      // Calculate the total number of pages based on the total results and results per page
      let totalResults = data.total_results || 0;
      let resultsPerPage = 20;
      let totalPages = Math.ceil(totalResults / resultsPerPage);

      res.render('result', { data, querySearch: query, selectedFilter: filter, currentPage: page, totalPages });
    }
  });
});

app.get('/search', (req, res) => {
  let query = req.query.search;
  let endpoint = "movie";
  
  request(`${BASE_URL}/${endpoint}?api_key=${API_KEY}&query=${query}`, (error, response, body) => {
    if (error) {
      console.log(error);
    } else {
      let data = JSON.parse(body);
      res.render('index.ejs', { data, querySearch: query });
    }
  });
});

app.get('/details/:mediaType/:id', (req, res) => {
  const mediaType = req.params.mediaType;
  const mediaId = req.params.id;

  // Define the base URL for fetching movie or TV show details
  const endpoint = (mediaType === 'movie') ? 'movie' : 'tv';

  // Make a request to fetch movie or TV show details
  request(`${BASE_URL}/${endpoint}/${mediaId}?api_key=${API_KEY}`, (error, response, body) => {
    if (error) {
      console.log(error);
    } else {
      const mediaData = JSON.parse(body);

      // Fetch video details to get the official trailer
      const VIDEO_URL = `${BASE_URL}/${endpoint}/${mediaId}/videos`;

      // Make a request to fetch video details
      request(`${VIDEO_URL}?api_key=${API_KEY}`, (error, response, body) => {
        if (error) {
          console.log(error);
          // If there's an error, render the details without a trailer
          res.render('details', { media: mediaData, youtubeUrl: null });
        } else {
          const videoData = JSON.parse(body);

          // Find the official trailer (if available)
          const officialTrailer = videoData.results.find((video) => video.type === 'Trailer');

          // Fetch cast details
          const CREDITS_URL = `${BASE_URL}/${endpoint}/${mediaId}/credits`;

          request(`${CREDITS_URL}?api_key=${API_KEY}`, (error, response, body) => {
            if (error) {
              console.log(error);
              // If there's an error, render the details without cast information
              res.render('details', { media: mediaData, youtubeUrl: null, cast: null });
            } else {
              const castData = JSON.parse(body);
              const cast = castData.cast.slice(0, 10); // Limit to the first 10 cast members

              if (officialTrailer) {
                // Construct the YouTube URL to play the official trailer
                const trailerKey = officialTrailer.key;
                const youtubeUrl = `https://www.youtube.com/watch?v=${trailerKey}`;
                
                // Render the details with the official trailer URL and cast information
                res.render('details', { media: mediaData, youtubeUrl, mediaType, cast });
              } else {
                // No official trailer available, render the details without a trailer
                res.render('details', { media: mediaData, youtubeUrl: null, mediaType, cast });
              }
            }
          });
        }
      });
    }
  });
});


// Handle adding titles to watchlist
app.post("/add-to-watchlist", (req, res) => {
  const mediaTitle = req.body.mediaTitle;
  const isMovie = req.body.isMovie === "true"; // Convert the string to a boolean

  if (isMovie) {
    movies.push({ name: mediaTitle, completed: false });
  } else {
    tvshows.push({ name: mediaTitle, completed: false });
  }
  res.sendStatus(200);
});

// Handle adding tasks (Server-Side)
app.post("/addTask", (req, res) => {
  const newTaskName = req.body.task;
  const newTask = { name: newTaskName, completed: false };

  // Determine whether to add to movies or tvshows based on the route
  if (req.headers.referer && req.headers.referer.includes("/movies")) {
    movies.push(newTask);
    res.redirect("/movies");
  } else if (req.headers.referer && req.headers.referer.includes("/tvshows")) {
    tvshows.push(newTask);
    res.redirect("/tvshows");
  } else {
    // Handle other routes or redirect appropriately
    res.redirect("/");
  }
});

// Handle deleting tasks (Server-Side)
app.post("/deleteTask", (req, res) => {
  const taskId = req.body.taskId;

  // Determine whether to delete from movies or tvshows based on the route
  if (req.headers.referer && req.headers.referer.includes("/movies")) {
    // Handle deleting from movies array
    if (!isNaN(taskId) && taskId >= 0 && taskId < movies.length) {
      movies.splice(taskId, 1);
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  } else if (req.headers.referer && req.headers.referer.includes("/tvshows")) {
    // Handle deleting from tvshows array
    if (!isNaN(taskId) && taskId >= 0 && taskId < tvshows.length) {
      tvshows.splice(taskId, 1);
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  } else {
    // Handle other routes or return an error
    res.sendStatus(400);
  }
});

// Handle marking tasks as completed (Server-Side)
app.post("/completeTask", (req, res) => {
  const taskId = req.body.taskId;
  const isCompleted = req.body.isCompleted === "true";

  // Determine whether to mark as completed in movies or tvshows based on the route
  if (req.body.isMovie === "true") {
    // Handle marking as completed in movies array
    if (!isNaN(taskId) && taskId >= 0 && taskId < movies.length) {
      movies[taskId].completed = isCompleted;
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  } else {
    // Handle marking as completed in tvshows array
    if (!isNaN(taskId) && taskId >= 0 && taskId < tvshows.length) {
      tvshows[taskId].completed = isCompleted;
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  }
});

// Start server
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
