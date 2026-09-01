async function testQuestionVote() {
  try {
    const qRes = await fetch('http://localhost:3000/api/urbanconnect/fetchQuestion');
    const qData = await qRes.json();
    if (!qData.data || qData.data.length === 0) return console.log('No questions found');
    const question = qData.data[0];

    console.log(`Liking Question ${question._id}...`);

    const patchRes = await fetch('http://localhost:3000/api/urbanconnect/questionVotes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: question._id,
        value: 1,
        email: 'test@example.com'
      })
    });
    
    const patchData = await patchRes.json();
    console.log('Question Vote Response:', patchData);
  } catch(e) {
    console.error(e);
  }
}

testQuestionVote();
