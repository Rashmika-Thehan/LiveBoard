for (let i = 0; i < 60; i++) {
  fetch('http://localhost:8000/matches')
    .then(res => console.log(`Request ${i + 1}: ${res.status}`))
    .catch(err => console.log(`Request ${i + 1}: ERROR - ${err.message}`));
}