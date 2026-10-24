async function testSearch() {
  try {
    const qRes = await fetch('http://localhost:3000/api/urbanconnect/fetchQuestion');
    const qData = await qRes.json();
    if (!qData.data || qData.data.length === 0) return console.log('No questions to search');
    
    // Grab the first word of the first question's title
    const firstWord = qData.data[0].title.split(' ')[0];
    console.log(`Searching for: "${firstWord}"`);

    const res = await fetch('http://localhost:3000/api/urbanconnect/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: firstWord })
    });
    
    const data = await res.json();
    console.log(`Found ${data.length} results.`);
    if (data.length > 0) {
      console.log('Sample result:', data[0].title);
    }
  } catch(e) {
    console.error(e);
  }
}

testSearch();
