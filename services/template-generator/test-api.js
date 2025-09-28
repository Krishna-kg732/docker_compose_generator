// Test the dynamic template generator API
const request = {
  selectedServices: ["sonarr", "radarr", "prowlarr"],
  variables: {
    sonarrPort: 8989,
    radarrPort: 7878,
    prowlarrPort: 9696,
    configPath: "./config",
    tvPath: "./media/tv",
    moviesPath: "./media/movies",
    downloadsPath: "./downloads",
    timezone: "America/New_York"
  }
};

fetch('http://localhost:3000/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request)
})
.then(response => response.json())
.then(data => {
  console.log('Generated Docker Compose:');
  console.log(JSON.stringify(data.data.dockerCompose, null, 2));
})
.catch(error => {
  console.error('Error:', error);
});

// Test example for Jellyfin + Nginx stack
const jellyfinNginxStack = {
  selectedServices: ["jellyfin", "nginx"],
  variables: {
    jellyfinPort: 8096,
    httpPort: 80,
    httpsPort: 443,
    configPath: "./config",
    mediaPath: "./media",
    webRoot: "./html",
    timezone: "UTC"
  }
};

// Save this as test-api.js and run with: node test-api.js