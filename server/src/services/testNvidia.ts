import dotenv from 'dotenv';
dotenv.config();

async function findMoreWorkingModels() {
  const apiKey = process.env.NVIDIA_API_KEY;
  const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  const data = await res.json();
  const models = data.data?.map((m: any) => m.id) || [];

  const working: string[] = [];
  for (const m of models) {
    try {
      const chatRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'Respond with OK.' }],
          max_tokens: 10,
        }),
      });

      if (chatRes.ok) {
        working.push(m);
        console.log(`✓ Active: ${m}`);
      }
    } catch (e) {}
  }
  console.log('All active models:', working);
}

findMoreWorkingModels();
