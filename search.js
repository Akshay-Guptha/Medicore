const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// GET /api/search?query=...
router.get('/', async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ success: false, error: 'Missing query' });

  try {
    const [wikiRes, ytRes, ncbiRes] = await Promise.all([
      fetchWikipedia(query),
      fetchYouTube(query),
      fetchNCBI(query)
    ]);

    const allResults = [...wikiRes, ...ytRes, ...ncbiRes];
    res.json({ success: true, results: allResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// GET /api/search/wikipedia?q=...
router.get('/wikipedia', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ success: false, error: 'Missing query' });

  const results = await fetchWikipedia(query);
  res.json({ success: true, results });
});

// GET /api/search/youtube?q=...
router.get('/youtube', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ success: false, error: 'Missing query' });

  const results = await fetchYouTube(query);
  res.json({ success: true, results });
});

// GET /api/search/ncbi?q=...
router.get('/ncbi', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ success: false, error: 'Missing query' });

  const results = await fetchNCBI(query);
  res.json({ success: true, results });
});

// ---------- Helper Functions ----------

async function fetchWikipedia(query) {
  try {
    const { data } = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        list: 'search',
        srsearch: query,
        format: 'json',
        origin: '*',
      },
    });

    return data.query.search.map(item => ({
      title: item.title,
      description: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""),
      link: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
    }));
  } catch (err) {
    console.error('Wikipedia API error:', err.message);
    return [];
  }
}

async function fetchYouTube(query) {
  try {
    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        maxResults: 3,
        key: process.env.YOUTUBE_API_KEY,
        type: 'video'
      }
    });

    return data.items.map(item => ({
      title: item.snippet.title,
      description: item.snippet.description,
      link: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));
  } catch (err) {
    console.error('YouTube API error:', err.message);
    return [];
  }
}

async function fetchNCBI(query) {
  try {
    const esearch = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi', {
      params: {
        db: 'pubmed',
        term: query,
        retmode: 'json',
        retmax: 3
      }
    });

    const ids = esearch.data.esearchresult.idlist;
    if (!ids.length) return [];

    const esummary = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi', {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'json'
      }
    });

    return Object.values(esummary.data.result)
      .filter(item => item.uid)
      .map(item => ({
        title: item.title,
        description: 'PubMed Abstract',
        link: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`
      }));
  } catch (err) {
    console.error('NCBI API error:', err.message);
    return [];
  }
}


async function fetchMedlinePlus(query) {
  try {
    const { data } = await axios.get('https://wsearch.nlm.nih.gov/ws/query', {
      params: {
        db: 'healthTopics',
        term: query,
        rettype: 'brief',
        retmode: 'json'
      }
    });

    const items = data.list?.entry || [];
    return items.slice(0, 3).map(item => ({
      title: item.title,
      description: item.snippet || 'MedlinePlus topic',
      link: item.url
    }));
  } catch (err) {
    console.error('MedlinePlus error:', err.message);
    return [];
  }
}

async function fetchOpenStax(query) {
  try {
    const { data } = await axios.get('https://openstax.org/api/v1/pages/search', {
      params: { q: query }
    });

    return data.results.slice(0, 3).map(item => ({
      title: item.title,
      description: item.description || 'OpenStax resource',
      link: `https://openstax.org${item.path}`
    }));
  } catch (err) {
    console.error('OpenStax error:', err.message);
    return [];
  }
}


async function fetchAMBOSS(query) {
  // AMBOSS doesn't offer a public API. We'll simulate a link for now.
  return [{
    title: `Search AMBOSS: ${query}`,
    description: `Find clinical insights on '${query}' using AMBOSS.`,
    link: `https://www.amboss.com/us/search?q=${encodeURIComponent(query)}`
  }];
}
module.exports = router;
