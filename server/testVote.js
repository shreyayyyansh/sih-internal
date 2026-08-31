async function testVote() {
  try {
    const qRes = await fetch('http://localhost:3000/api/urbanconnect/fetchQuestion');
    const qData = await qRes.json();
    if (!qData.data || qData.data.length === 0) return console.log('No questions found');
    const question = qData.data[0];

    const cRes = await fetch(`http://localhost:3000/api/urbanconnect/comments?questionId=${question._id}`);
    const cData = await cRes.json();
    if (!cData.comments || cData.comments.length === 0) return console.log('No comments found');
    const comment = cData.comments[0];

    console.log(`Liking comment ${comment._id}...`);

    const patchRes = await fetch('http://localhost:3000/api/urbanconnect/votes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commentId: comment._id,
        value: 1,
        email: 'test@example.com'
      })
    });
    
    const patchData = await patchRes.json();
    console.log('Vote Patch Response:', patchData);
  } catch(e) {
    console.error(e);
  }
}

testVote();
