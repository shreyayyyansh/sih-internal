async function testProfile() {
  try {
    const res = await fetch('http://localhost:3000/api/urbanconnect/profile?email=test@urbanflow.com');
    const data = await res.json();
    
    console.log("Profile Data Retrieved:");
    console.log(`- Posts: ${data.posts?.length || 0}`);
    console.log(`- Replies: ${data.replies?.length || 0}`);
    console.log(`- Likes: ${data.likes?.length || 0}`);
    
    if (data.posts && data.posts.length > 0) {
      console.log(`Sample Post: ${data.posts[0].title} (by ${data.posts[0].authorName})`);
    }
  } catch(e) {
    console.error(e);
  }
}

testProfile();
