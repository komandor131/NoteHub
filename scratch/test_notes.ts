async function test() {
  const loginRes = await fetch('http://localhost:5174/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@notehub.local', password: 'admin12345' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    console.error('Failed to log in as admin!', loginData);
    return;
  }
  console.log('Login successful! Token:', token.substring(0, 10) + '...');

  const fetchNote = async (nodeId) => {
    const res = await fetch(`http://localhost:5174/api/roadmaps/notes/${nodeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(`\n=== Node ID: ${nodeId} ===`);
    if (data.notes) {
      console.log(data.notes.substring(0, 400) + '\n...');
    } else {
      console.log('NO NOTES FOUND');
    }
  };

  await fetchNote('math_1');
  await fetchNote('math_1_1');
  await fetchNote('math_1_8');
  await fetchNote('math_30_1');
}

test();
