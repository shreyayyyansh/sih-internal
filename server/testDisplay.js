async function testDisplay() {
  try {
    const qRes = await fetch('http://localhost:3000/api/urbanconnect/fetchQuestion');
    const qData = await qRes.json();
    if (!qData.data || qData.data.length === 0) return console.log('No questions found');
    
    // Grab the first question
    const question = qData.data[0];
    console.log(`Question [${question._id}]`);
    console.log(`  Title: ${question.title}`);
    console.log(`  Author: ${question.authorName} (@${question.authorHandle})`);
    console.log(`  Posted: ${question.timeAgo}`);
    
    // Check comments on that specific question
    const cRes = await fetch(`http://localhost:3000/api/urbanconnect/fetchQuestion/${question._id}`);
    const cData = await cRes.json();
    console.log(`\n  Comments count: ${cData.comments?.length || 0}`);
    if (cData.comments && cData.comments.length > 0) {
      console.log(`  First Comment: ${cData.comments[0].text}`);
      console.log(`  Comment Author: ${cData.comments[0].authorName}`);
      console.log(`  Comment Posted: ${cData.comments[0].timeAgo}`);
    }

  } catch(e) {
    console.error(e);
  }
}

testDisplay();
