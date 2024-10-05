const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const site_id = urlParams.get('id');

document.getElementById('site_id').textContent = site_id ? site_id : 'Unknown';